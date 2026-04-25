import { readFileSync } from "fs"
import path from "path"
import Anthropic from "@anthropic-ai/sdk"
import { tryParsePitchPackage, type PitchPackage } from "@/lib/pitch"

export const maxDuration = 120
export const dynamic = "force-dynamic"

const MODEL =
  process.env.ANTHROPIC_MODEL?.trim() || "claude-sonnet-4-5-20250929"

let SYSTEM_PROMPT = ""
try {
  SYSTEM_PROMPT = readFileSync(
    path.join(process.cwd(), "prompt.txt"),
    "utf-8",
  ).trim()
} catch {
  SYSTEM_PROMPT = ""
}

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
}

const sseHeaders: Record<string, string> = {
  ...corsHeaders,
  "Content-Type": "text/event-stream; charset=utf-8",
  "Cache-Control": "no-cache, no-transform",
  Connection: "keep-alive",
}

function buildUserMessage(
  creatorType: string,
  brief: string,
  remix: boolean,
): string {
  const base = `Creator type: ${creatorType}\n\nBrand brief:\n${brief.trim()}`
  if (remix) {
    return `${base}\n\nTake a different creative angle this time.`
  }
  return base
}

async function callClaude(
  client: Anthropic,
  system: string,
  user: string,
  temperature: number,
): Promise<string> {
  const msg = await client.messages.create({
    model: MODEL,
    max_tokens: 4096,
    temperature,
    system,
    messages: [{ role: "user", content: user }],
  })
  const block = msg.content[0]
  if (!block || block.type !== "text") {
    throw new Error("Unexpected response from model (no text content)")
  }
  return block.text
}

async function runClaudeWithJsonRetry(
  client: Anthropic,
  system: string,
  userMessage: string,
  temperature: number,
): Promise<PitchPackage> {
  let text = await callClaude(client, system, userMessage, temperature)
  let parsed = tryParsePitchPackage(text)
  if (parsed.ok) {
    return parsed.data
  }

  const firstErr = parsed.error
  const retryUser = `Your previous response was not valid JSON. Return only valid JSON, no markdown fences, no preamble, no text outside the object.

Validation error: ${firstErr}

Previous response to fix:
${text.slice(0, 14_000)}`

  text = await callClaude(client, system, retryUser, 0.3)
  parsed = tryParsePitchPackage(text)
  if (parsed.ok) {
    return parsed.data
  }

  throw new Error(
    `The model could not return valid JSON after a retry. ${parsed.error}`,
  )
}

export function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders })
}

export async function POST(request: Request) {
  let body: { creatorType?: string; brief?: string; remix?: boolean } = {}
  try {
    body = (await request.json()) as typeof body
  } catch {
    return jsonError("Invalid JSON", 400)
  }

  const { creatorType, brief, remix = false } = body

  if (typeof brief !== "string" || !brief.trim()) {
    return jsonError("brief is required", 400)
  }
  if (typeof creatorType !== "string" || !creatorType.trim()) {
    return jsonError("creatorType is required", 400)
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return jsonError("ANTHROPIC_API_KEY is not configured on the server", 503)
  }
  if (!SYSTEM_PROMPT) {
    return jsonError(
      "System prompt is missing. Add prompt.txt at the project root.",
      500,
    )
  }

  const userMessage = buildUserMessage(creatorType, brief, Boolean(remix))
  const temperature = remix ? 0.9 : 0.7

  const stream = new ReadableStream({
    async start(controller) {
      const enc = new TextEncoder()
      const send = (data: object) => {
        controller.enqueue(
          enc.encode(`data: ${JSON.stringify(data)}\n\n`),
        )
      }
      const delay = (ms: number) => new Promise((r) => setTimeout(r, ms))

      try {
        const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
        const claudePromise = runClaudeWithJsonRetry(
          client,
          SYSTEM_PROMPT,
          userMessage,
          temperature,
        )

        send({ phase: "analyzing", progress: 0 })
        await delay(250)
        send({ phase: "concepts", progress: 25 })
        await delay(250)
        send({ phase: "shotlist", progress: 50 })
        await delay(250)
        send({ phase: "pitch", progress: 75 })

        const result = await claudePromise
        send({ phase: "done", progress: 100, result })
      } catch (e) {
        const message = e instanceof Error ? e.message : "Unknown error"
        send({ phase: "error", message })
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, { status: 200, headers: sseHeaders })
}

function jsonError(message: string, status: number) {
  return Response.json(
    { error: message },
    { status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  )
}
