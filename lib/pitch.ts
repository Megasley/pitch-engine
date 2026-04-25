/**
 * Client-safe types + parsing helpers for Claude pitch package JSON
 */

export type Concept = {
  title: string
  hook: string
  emotion: string
  rationale?: string
}
export type Shot = {
  scene: string
  shotType: string
  setting: string
  props: string
  direction: string
}
export type PitchDeck = {
  concept: string
  audience: string
  deliverables: string
  feeRange: string
  whyThisCreative: string
}
export type EmailBlock = { subject: string; body: string }
export type PitchPackage = {
  concepts: Concept[]
  shotList: Shot[]
  pitchDeck: PitchDeck
  email: EmailBlock
}

export function extractJsonFromText(text: string): string {
  const trimmed = text.trim()
  const fence = /^```(?:json)?\s*([\s\S]*?)```/m
  const m = fence.exec(trimmed)
  if (m?.[1]) return m[1].trim()
  const start = trimmed.indexOf("{")
  const end = trimmed.lastIndexOf("}")
  if (start === -1 || end === -1 || end <= start) return trimmed
  return trimmed.slice(start, end + 1)
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v)
}

export function normalizePitchPackage(raw: unknown): PitchPackage {
  if (!isObject(raw)) {
    throw new Error("Response must be a JSON object")
  }
  const { concepts, shotList, pitchDeck, email } = raw
  if (!Array.isArray(concepts) || !Array.isArray(shotList) || !isObject(pitchDeck) || !isObject(email)) {
    throw new Error("Missing or invalid top-level fields")
  }

  const normConcepts: Concept[] = concepts.map((c) => {
    if (!isObject(c)) throw new Error("Invalid concept")
    return {
      title: String(c.title ?? ""),
      hook: String(c.hook ?? ""),
      emotion: String(c.emotion ?? ""),
      rationale: c.rationale != null ? String(c.rationale) : undefined,
    }
  })

  const normShots: Shot[] = shotList.map((s) => {
    if (!isObject(s)) throw new Error("Invalid shot")
    return {
      scene: String(s.scene ?? ""),
      shotType: String(s.shotType ?? ""),
      setting: String(s.setting ?? ""),
      props: String(s.props ?? ""),
      direction: String(s.direction ?? ""),
    }
  })

  const d = pitchDeck
  const normDeck: PitchDeck = {
    concept: String(d.concept ?? ""),
    audience: String(d.audience ?? ""),
    deliverables: String(d.deliverables ?? ""),
    feeRange: String(d.feeRange ?? ""),
    whyThisCreative: String(d.whyThisCreative ?? ""),
  }

  const e = email
  const normEmail: EmailBlock = {
    subject: String((e as Record<string, unknown>).subject ?? ""),
    body: String((e as Record<string, unknown>).body ?? ""),
  }

  if (!normConcepts.length || !normShots.length) {
    throw new Error("concepts and shotList must be non-empty")
  }

  return {
    concepts: normConcepts,
    shotList: normShots,
    pitchDeck: normDeck,
    email: normEmail,
  }
}

export function tryParsePitchPackage(text: string): { ok: true; data: PitchPackage } | { ok: false; error: string } {
  try {
    const json = extractJsonFromText(text)
    const raw = JSON.parse(json) as unknown
    return { ok: true, data: normalizePitchPackage(raw) }
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Invalid JSON",
    }
  }
}
