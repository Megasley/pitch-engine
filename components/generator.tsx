"use client"

import { useCallback, useState, type ReactNode } from "react"
import { toast } from "sonner"
import {
  Check,
  Circle,
  Copy,
  Download,
  Loader2,
  RefreshCw,
  Sparkles,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { type PitchPackage } from "@/lib/pitch"

const CREATOR_ROLES = [
  { value: "Skit Creator", emoji: "🎭" },
  { value: "Filmmaker", emoji: "🎬" },
  { value: "Photographer", emoji: "📸" },
  { value: "Fashion Designer", emoji: "👔" },
  { value: "Visual Artist", emoji: "🎨" },
  { value: "Music Video Director", emoji: "🎵" },
] as const

const EXAMPLE_BRIEFS = [
  "Indomie Detty December skit campaign for IG Reels",
  "MTN wants a music video director for new data plan launch",
  "Gtbank fashion week brand activation, looking for designers",
  "Chivita wants product photography for new juice line",
] as const

const PHASES = [
  "Analyzing brief",
  "Generating concepts",
  "Building shot list",
  "Writing pitch + email",
] as const

const CREATOR_EMOJI: Record<string, string> = Object.fromEntries(
  CREATOR_ROLES.map((r) => [r.value, r.emoji]),
)

type StepState = "pending" | "running" | "done"

function phaseToStepStates(phase: string): StepState[] {
  switch (phase) {
    case "analyzing":
      return ["running", "pending", "pending", "pending"]
    case "concepts":
      return ["done", "running", "pending", "pending"]
    case "shotlist":
      return ["done", "done", "running", "pending"]
    case "pitch":
      return ["done", "done", "done", "running"]
    case "done":
      return ["done", "done", "done", "done"]
    default:
      return ["pending", "pending", "pending", "pending"]
  }
}

function lineFillRatio(states: StepState[]): number {
  const first = states.findIndex((s) => s !== "done")
  if (first === -1) {
    return 1
  }
  return first / 3
}

function formatConcepts(data: PitchPackage) {
  return data.concepts
    .map((c, i) => {
      const rationale =
        c.rationale != null && c.rationale.length > 0
          ? `\nRationale: ${c.rationale}`
          : ""
      return `## ${i + 1}. ${c.title}\nHook: ${c.hook}\nEmotion: ${c.emotion}${rationale}`
    })
    .join("\n\n")
}

function formatShotList(data: PitchPackage) {
  return data.shotList
    .map(
      (s) =>
        `### ${s.scene}\n- Shot: ${s.shotType}\n- Setting: ${s.setting}\n- Props: ${s.props}\n- Direction: ${s.direction}`,
    )
    .join("\n\n")
}

function formatPitchDeckPlain(d: PitchPackage["pitchDeck"]) {
  return `Concept: ${d.concept}\n\nAudience: ${d.audience}\n\nDeliverables: ${d.deliverables}\n\nFee range: ${d.feeRange}\n\nWhy this creative: ${d.whyThisCreative}`
}

function formatPitchDeckMd(d: PitchPackage["pitchDeck"]) {
  return `## Concept\n\n${d.concept}\n\n## Audience\n\n${d.audience}\n\n## Deliverables\n\n${d.deliverables}\n\n## Suggested fee range\n\n${d.feeRange}\n\n## Why this creative\n\n${d.whyThisCreative}`
}

function formatEmail(e: PitchPackage["email"]) {
  return `Subject: ${e.subject}\n\n${e.body}`
}

function downloadFile(filename: string, text: string, mime: string) {
  const blob = new Blob([text], { type: `${mime};charset=utf-8` })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

type SseEvent = {
  phase: string
  progress?: number
  message?: string
  result?: PitchPackage
}

function parseSseBlock(block: string): SseEvent | null {
  const line = block.replace(/^data:\s*/i, "").trim()
  if (!line) {
    return null
  }
  try {
    return JSON.parse(line) as SseEvent
  } catch {
    return null
  }
}

function StepNode({ state, label }: { state: StepState; label: string }) {
  return (
    <div className="flex items-start gap-3 text-sm">
      <div
        className={cn(
          "relative mt-0.5 flex size-5 shrink-0 items-center justify-center",
          state === "running" &&
            "rounded-full ring-2 ring-primary/50 shadow-[0_0_10px] shadow-primary/25",
        )}
      >
        <div className="absolute inset-0 flex items-center justify-center">
          <span
            className={cn(
              "flex items-center justify-center transition-opacity duration-200",
              state === "pending" ? "opacity-100" : "opacity-0",
            )}
            aria-hidden
          >
            <Circle className="size-3 fill-muted-foreground/50 text-transparent" />
          </span>
          <span
            className={cn(
              "absolute flex items-center justify-center transition-opacity duration-200",
              state === "running" ? "opacity-100" : "opacity-0",
            )}
            aria-hidden
          >
            <Loader2 className="size-4 animate-spin text-primary" />
          </span>
          <span
            className={cn(
              "absolute flex items-center justify-center text-emerald-500 transition-opacity duration-200",
              state === "done" ? "opacity-100" : "opacity-0",
            )}
            aria-hidden
          >
            <Check className="size-4" strokeWidth={2.5} />
          </span>
        </div>
      </div>
      <span
        className={cn(
          "leading-5",
          state === "pending" && "text-muted-foreground/70",
          state === "running" && "font-medium text-foreground",
          state === "done" && "text-muted-foreground",
        )}
      >
        {label}
      </span>
    </div>
  )
}

export function Generator() {
  const [creatorType, setCreatorType] = useState<string>(CREATOR_ROLES[0].value)
  const [brief, setBrief] = useState("")
  const [generating, setGenerating] = useState(false)
  const [stepStates, setStepStates] = useState<StepState[]>([
    "pending",
    "pending",
    "pending",
    "pending",
  ])
  const [result, setResult] = useState<PitchPackage | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState("concepts")
  const [remixAnim, setRemixAnim] = useState(false)

  const runGenerate = useCallback(
    async (remix: boolean) => {
      if (!brief.trim()) {
        toast.error("Add a brand brief to generate.")
        return
      }
      setGenerating(true)
      setError(null)
      setResult(null)
      setStepStates(["pending", "pending", "pending", "pending"])

      let gotDone = false
      let streamError = false
      const body = {
        creatorType,
        brief: brief.trim(),
        remix,
      }

      try {
        const res = await fetch("/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        })

        if (!res.ok) {
          const ct = res.headers.get("content-type")
          if (ct?.includes("application/json")) {
            const j = (await res.json()) as { error?: string }
            setError(j.error ?? `Error ${res.status}`)
          } else {
            setError(res.statusText || "Request failed")
          }
          return
        }

        if (!res.body) {
          setError("No response stream")
          return
        }

        const reader = res.body.getReader()
        const dec = new TextDecoder()
        let buffer = ""

        const handleEvent = (data: SseEvent) => {
          if (data.phase === "error") {
            streamError = true
            setError(
              data.message ??
                "Generation failed. Try a shorter brief or retry.",
            )
            return
          }
          if (data.phase) {
            setStepStates(phaseToStepStates(data.phase))
          }
          if (data.phase === "done" && data.result) {
            gotDone = true
            setResult(data.result)
            toast.success(remix ? "Remix ready" : "Pitch package ready")
          }
        }

        const flushSse = (raw: string) => {
          for (const line of raw.split("\n")) {
            if (!line.trim().startsWith("data:")) {
              continue
            }
            const ev = parseSseBlock(line)
            if (ev) {
              handleEvent(ev)
            }
          }
        }

        let doneReading = false
        while (!doneReading) {
          const { value, done } = await reader.read()
          if (value) {
            buffer += dec.decode(value, { stream: true })
          }
          let idx: number
          while ((idx = buffer.indexOf("\n\n")) >= 0) {
            const chunk = buffer.slice(0, idx)
            buffer = buffer.slice(idx + 2)
            flushSse(chunk)
          }
          if (done) {
            doneReading = true
            if (buffer.trim().length) {
              flushSse(buffer)
            }
            break
          }
          if (streamError) {
            try {
              await reader.cancel()
            } catch {
              // ignore
            }
            return
          }
        }

        if (!gotDone && !streamError) {
          setError(
            "The stream closed before a complete result. Please try again.",
          )
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Network error")
      } finally {
        setGenerating(false)
        if (gotDone) {
          setStepStates(["done", "done", "done", "done"])
        }
      }
    },
    [brief, creatorType],
  )

  const onGenerate = useCallback(() => void runGenerate(false), [runGenerate])
  const onRemix = useCallback(() => {
    setRemixAnim(true)
    window.setTimeout(() => setRemixAnim(false), 200)
    void runGenerate(true)
  }, [runGenerate])

  const fill = lineFillRatio(stepStates)
  const canGenerate = Boolean(brief.trim()) && !generating

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 sm:py-16">
        <header className="mb-10 space-y-2 text-center sm:mb-12 sm:text-left">
          <h1 className="inline-flex items-center justify-center gap-2.5 text-3xl font-semibold tracking-tight sm:justify-start sm:text-4xl md:text-5xl">
            <span
              className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary sm:size-10"
              aria-hidden
            >
              <Sparkles className="size-5 sm:size-6" strokeWidth={1.75} />
            </span>
            <span>Pitch Engine</span>
          </h1>
          <p className="text-base text-muted-foreground sm:text-lg">
            Turn any brand brief into a pitch-ready package
          </p>
        </header>

        {error && !generating && (
          <Alert variant="destructive" className="mb-8" role="alert">
            <AlertTitle>Could not generate</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <section className="w-full max-w-full space-y-6 sm:space-y-8" aria-label="Inputs">
          <div className="space-y-3">
            <label className="text-sm font-medium leading-none" htmlFor="role">
              I am a&hellip;
            </label>
            <Select value={creatorType} onValueChange={setCreatorType}>
              <SelectTrigger
                id="role"
                className="h-11 w-full focus-visible:ring-2 focus-visible:ring-ring"
                aria-label="Creator type"
              >
                <div className="flex min-w-0 items-center gap-2.5 text-left">
                  <span className="text-base" aria-hidden>
                    {CREATOR_EMOJI[creatorType] ?? "·"}
                  </span>
                  <SelectValue />
                </div>
              </SelectTrigger>
              <SelectContent>
                {CREATOR_ROLES.map((r) => (
                  <SelectItem
                    key={r.value}
                    value={r.value}
                    className="focus:bg-accent"
                  >
                    <span className="mr-2" aria-hidden>
                      {r.emoji}
                    </span>
                    {r.value}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            <label
              className="text-sm font-medium leading-none"
              htmlFor="brief"
            >
              Paste the brand brief or describe the opportunity
            </label>
            <Textarea
              id="brief"
              placeholder="e.g. Indomie wants a fun Detty December skit campaign for Instagram Reels targeting 18-28 year olds in Lagos"
              rows={6}
              className={cn(
                "min-h-36 w-full max-w-full resize-y text-base leading-relaxed",
                "transition-[min-height] duration-200 ease-out",
                "focus-visible:min-h-56 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
              )}
              value={brief}
              onChange={(e) => setBrief(e.target.value)}
            />
            <div className="flex flex-wrap gap-2" role="group" aria-label="Example briefs">
              {EXAMPLE_BRIEFS.map((example) => {
                const active = brief === example
                return (
                  <button
                    key={example}
                    type="button"
                    onClick={() => setBrief(example)}
                    className={cn(
                      "text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      "transition-transform duration-150 will-change-transform",
                      "hover:scale-105",
                    )}
                    aria-label={`Use example brief: ${example}`}
                    aria-pressed={active}
                  >
                    <Badge
                      variant="secondary"
                      className={cn(
                        "whitespace-normal border border-transparent px-3 py-1.5 text-xs font-normal leading-snug",
                        active &&
                          "border-primary bg-primary/5 text-foreground ring-1 ring-primary/30",
                      )}
                    >
                      {example}
                    </Badge>
                  </button>
                )
              })}
            </div>
          </div>

          <Button
            className={cn(
              "h-12 w-full max-w-full text-base font-medium focus-visible:ring-2 focus-visible:ring-offset-2",
              canGenerate &&
                "bg-gradient-to-r from-primary via-primary to-primary/80 text-primary-foreground shadow-sm hover:from-primary/95 hover:via-primary/90 hover:to-primary/75",
            )}
            size="lg"
            onClick={onGenerate}
            disabled={!canGenerate}
            aria-label={
              generating
                ? "Generating pitch package"
                : "Generate pitch package from your brief"
            }
          >
            {generating ? (
              <>
                <Loader2
                  className="mr-2 size-4 shrink-0 animate-spin"
                  aria-hidden
                />
                Generating&hellip;
              </>
            ) : (
              "Generate Pitch Package"
            )}
          </Button>
        </section>

        {!error && !result && !generating && (
          <div
            className="mt-10 flex flex-col items-center justify-center border-t border-border/50 py-10 text-center"
            role="status"
            aria-live="polite"
          >
            <Sparkles
              className="mb-3 size-16 text-primary/50"
              strokeWidth={1.25}
              aria-hidden
            />
            <p className="max-w-sm text-sm text-muted-foreground">
              Your pitch package will appear here
            </p>
          </div>
        )}

        {generating && (
          <section
            className="mt-10 border-t border-border pt-10 sm:mt-12"
            aria-labelledby="progress-label"
            aria-live="polite"
            aria-atomic="false"
          >
            <h2
              id="progress-label"
              className="mb-6 text-sm font-medium uppercase tracking-wide text-muted-foreground"
            >
              Progress
            </h2>
            <div className="relative pl-0">
              <div
                className="absolute top-3 bottom-3 left-[9px] w-0.5 rounded-full bg-border"
                aria-hidden
              />
              <div
                className="absolute top-3 left-[9px] w-0.5 origin-top rounded-full bg-primary transition-transform duration-500 ease-out"
                style={{
                  height: "calc(100% - 24px)",
                  transform: `scaleY(${fill})`,
                }}
                aria-hidden
              />
              <ol className="m-0 list-none space-y-0 p-0" role="list">
                {PHASES.map((label, i) => {
                  const s = stepStates[i] ?? "pending"
                  return (
                    <li
                      key={label}
                      className="relative mb-4 pl-7 last:mb-0"
                      role="listitem"
                      aria-label={`${label}: ${
                        s === "done"
                          ? "complete"
                          : s === "running"
                            ? "in progress"
                            : "pending"
                      }`}
                    >
                      <StepNode state={s} label={label} />
                    </li>
                  )
                })}
              </ol>
            </div>
          </section>
        )}

        {result && !generating && (
          <section
            className="mt-10 border-t border-border pt-10 sm:mt-12"
            aria-label="Your pitch package"
          >
            <Card className="border border-border/80 bg-card/80 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-xl">Your pitch package</CardTitle>
                <CardDescription>
                  Copy or download. Remix asks for a new angle at a higher
                  temperature.
                </CardDescription>
              </CardHeader>
              <CardContent className="w-full min-w-0 max-w-full">
                <Tabs
                  value={activeTab}
                  onValueChange={setActiveTab}
                  className="w-full min-w-0"
                >
                  <div className="min-w-0 max-w-full overflow-x-auto scroll-smooth rounded-full pb-1 [-ms-overflow-style:none] [scrollbar-width:thin] sm:overflow-visible">
                    <TabsList
                      className={cn(
                        "inline-flex w-max min-w-full flex-nowrap gap-1 rounded-full border border-border/60 bg-muted/50 p-1",
                        "sm:grid sm:w-full sm:max-w-full sm:grid-cols-4",
                      )}
                    >
                      <TabsTrigger
                        value="concepts"
                        className="shrink-0 rounded-full px-3 py-2 text-xs after:hidden data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow sm:text-sm"
                        aria-label="View concepts"
                      >
                        Concepts
                      </TabsTrigger>
                      <TabsTrigger
                        value="shot"
                        className="shrink-0 rounded-full px-3 py-2 text-xs after:hidden data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow sm:text-sm"
                        aria-label="View shot list"
                      >
                        Shot List
                      </TabsTrigger>
                      <TabsTrigger
                        value="deck"
                        className="shrink-0 rounded-full px-3 py-2 text-xs after:hidden data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow sm:text-sm"
                        aria-label="View pitch deck"
                      >
                        Pitch Deck
                      </TabsTrigger>
                      <TabsTrigger
                        value="email"
                        className="shrink-0 rounded-full px-3 py-2 text-xs after:hidden data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow sm:text-sm"
                        aria-label="View email"
                      >
                        Email
                      </TabsTrigger>
                    </TabsList>
                  </div>

                  <TabExport
                    tabValue="concepts"
                    getText={() => formatConcepts(result)}
                    getDownloadText={() => formatConcepts(result)}
                    fileName="concepts.txt"
                    mime="text/plain"
                    copyLabel="Copy concepts to clipboard"
                    downloadLabel="Download concepts as a text file"
                  >
                    <div className="mt-1 flex flex-col gap-4">
                      {result.concepts.map((c, i) => (
                        <div
                          key={`${c.title}-${i}`}
                          className="relative rounded-xl border border-border/70 bg-background/60 p-5 pt-8"
                        >
                          <Badge
                            className="absolute left-3 top-3 h-6 min-w-6 justify-center bg-primary/15 px-1.5 text-xs font-medium text-foreground"
                            variant="secondary"
                            aria-label={`Concept ${i + 1}`}
                          >
                            {i + 1}
                          </Badge>
                          <h3 className="pr-2 text-lg font-semibold leading-snug">
                            {c.title}
                          </h3>
                          <p className="mt-2 text-sm text-foreground/90">
                            {c.hook}
                          </p>
                          <p className="mt-3 text-sm text-muted-foreground">
                            <span className="font-medium text-foreground/80">
                              Emotion:{" "}
                            </span>
                            {c.emotion}
                          </p>
                          {c.rationale != null && c.rationale.length > 0 && (
                            <p className="mt-3 text-sm text-muted-foreground">
                              <span className="font-medium text-foreground/80">
                                Rationale:{" "}
                              </span>
                              {c.rationale}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </TabExport>

                  <TabExport
                    tabValue="shot"
                    getText={() => formatShotList(result)}
                    getDownloadText={() => formatShotList(result)}
                    fileName="shotlist.txt"
                    mime="text/plain"
                    copyLabel="Copy shot list to clipboard"
                    downloadLabel="Download shot list as a text file"
                  >
                    <ol className="relative m-0 list-none space-y-0 border-l-2 border-border/80 pl-6">
                      {result.shotList.map((s, i) => (
                        <li
                          key={`${s.scene}-${i}`}
                          className="relative pb-8 pl-1 last:pb-0"
                        >
                          <div
                            className="absolute -left-[calc(0.5rem+5px)] top-0 flex size-6 items-center justify-center rounded-full border-2 border-primary/40 bg-primary/10 text-xs font-medium text-foreground"
                            aria-label={`Shot ${i + 1}`}
                          >
                            {i + 1}
                          </div>
                          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                            Scene: {s.scene}
                          </p>
                          <ul className="mt-2 space-y-2 text-sm">
                            <li>
                              <span className="text-muted-foreground">Shot: </span>
                              {s.shotType}
                            </li>
                            <li>
                              <span className="text-muted-foreground">Setting: </span>
                              {s.setting}
                            </li>
                            <li>
                              <span className="text-muted-foreground">Props: </span>
                              {s.props}
                            </li>
                            <li>
                              <span className="text-muted-foreground">Direction: </span>
                              {s.direction}
                            </li>
                          </ul>
                        </li>
                      ))}
                    </ol>
                  </TabExport>

                  <TabExport
                    tabValue="deck"
                    getText={() => formatPitchDeckPlain(result.pitchDeck)}
                    getDownloadText={() => formatPitchDeckMd(result.pitchDeck)}
                    fileName="pitch.md"
                    mime="text/markdown"
                    copyLabel="Copy pitch deck to clipboard"
                    downloadLabel="Download pitch as Markdown file"
                  >
                    <div className="grid grid-cols-1 gap-5 rounded-xl border border-border/60 bg-background/50 p-5 text-sm leading-relaxed sm:grid-cols-2">
                      <div>
                        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          Concept
                        </p>
                        <p className="mt-1">{result.pitchDeck.concept}</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          Audience
                        </p>
                        <p className="mt-1">{result.pitchDeck.audience}</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          Deliverables
                        </p>
                        <p className="mt-1">{result.pitchDeck.deliverables}</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          Suggested fee range
                        </p>
                        <p className="mt-1">{result.pitchDeck.feeRange}</p>
                      </div>
                      <div className="sm:col-span-2">
                        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          Why this creative
                        </p>
                        <p className="mt-1">
                          {result.pitchDeck.whyThisCreative}
                        </p>
                      </div>
                    </div>
                  </TabExport>

                  <TabExport
                    tabValue="email"
                    getText={() => formatEmail(result.email)}
                    getDownloadText={() => formatEmail(result.email)}
                    fileName="email.txt"
                    mime="text/plain"
                    copyLabel="Copy full email including subject to clipboard"
                    downloadLabel="Download email as a text file"
                  >
                    <div className="space-y-4 rounded-md border border-border/80 bg-muted/30 p-4">
                      <div>
                        <p className="text-xs font-medium text-muted-foreground">
                          Subject:
                        </p>
                        <p className="mt-1 text-sm font-medium text-foreground/95">
                          {result.email.subject}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-muted-foreground">
                          Body
                        </p>
                        <pre
                          className="mt-2 whitespace-pre-wrap font-mono text-sm leading-relaxed text-muted-foreground [font-size:0.9rem] sm:[font-size:0.875rem]"
                        >
                          {result.email.body}
                        </pre>
                      </div>
                    </div>
                  </TabExport>
                </Tabs>
                <div className="mt-6 flex w-full min-w-0 sm:mt-8">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full focus-visible:ring-2 focus-visible:ring-ring sm:w-auto"
                    onClick={onRemix}
                    disabled={generating}
                    aria-label="Remix with a different creative angle"
                  >
                    <RefreshCw
                      className={cn(
                        "mr-2 size-4",
                        remixAnim && "remix-icon-spin-once",
                      )}
                      aria-hidden
                    />
                    Remix
                  </Button>
                </div>
              </CardContent>
            </Card>
          </section>
        )}
      </div>
    </div>
  )
}

function TabExport({
  tabValue,
  getText,
  getDownloadText,
  fileName,
  mime,
  copyLabel,
  downloadLabel,
  children,
}: {
  tabValue: string
  getText: () => string
  getDownloadText: () => string
  fileName: string
  mime: string
  copyLabel: string
  downloadLabel: string
  children?: ReactNode
}) {
  return (
    <TabsContent
      value={tabValue}
      className="mt-4 w-full min-w-0 max-w-full space-y-4 outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
    >
      <div className="flex w-full min-w-0 flex-wrap items-center justify-end gap-2">
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(getText())
              toast.success("Copied!", { duration: 1500 })
            } catch {
              toast.error("Could not copy")
            }
          }}
          className="focus-visible:ring-2"
          aria-label={copyLabel}
        >
          <Copy className="mr-1.5 size-3.5" aria-hidden />
          Copy
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => downloadFile(fileName, getDownloadText(), mime)}
          className="focus-visible:ring-2"
          aria-label={downloadLabel}
        >
          <Download className="mr-1.5 size-3.5" aria-hidden />
          Download
        </Button>
      </div>
      {children ?? (
        <div className="rounded-md border border-border/60 bg-muted/20 p-4 text-sm leading-relaxed">
          <pre className="whitespace-pre-wrap font-sans">{getText()}</pre>
        </div>
      )}
    </TabsContent>
  )
}
