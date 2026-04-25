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
import { PitchDeckView } from "@/components/pitch-deck-view"
import { ShotListView } from "@/components/shot-list-view"

const CREATOR_ROLES = [
  { value: "Skit Creator", emoji: "🎭" },
  { value: "Filmmaker", emoji: "🎬" },
  { value: "Photographer", emoji: "📸" },
  { value: "Fashion Designer", emoji: "👔" },
  { value: "Visual Artist", emoji: "🎨" },
  { value: "Music Video Director", emoji: "🎵" },
] as const

const EXAMPLE_BRIEFS_BY_TYPE: Record<
  (typeof CREATOR_ROLES)[number]["value"],
  readonly [string, string, string, string]
> = {
  "Skit Creator": [
    "Indomie Detty December skit campaign for IG Reels, Nigerian humour, 45–60s",
    "GTBank – funny skit series on saving culture for young Lagos professionals on Reels",
    "MTN – quick comedy skit to explain a new data bundle, street-to-studio vibe",
    "Chivita – playful skit for a new juice line, family-friendly, shareable on TikTok",
  ],
  Filmmaker: [
    "Documentary on Lagos street food culture, 8–10 min, brand-funded by a FMCG",
    "Branded short film for a bank—emotional, cinematic, YouTube and cinema ads",
    "Series of 3 micro-films for a telco launch, urban Nigeria, high production value",
    "Fashion film for Lagos Fashion Week—runway B-roll + narrative, 2–3 minutes",
  ],
  Photographer: [
    "Chivita product stills and lifestyle shots for a new juice line, bright FMCG look",
    "Lookbook and campaign stills for a Lagos streetwear label, on-location and studio",
    "Bank annual report and brand imagery—Lagos business life, corporate but warm",
    "Restaurant chain food photography and social stills, overhead and table scenes",
  ],
  "Fashion Designer": [
    "GTBank Lagos Fashion Week—runway set or booth activation, looking for a designer",
    "Capsule collection collab with a drink brand, limited drop and launch event",
    "Retail lookbook and influencer seeding for a new boutique in Lekki",
    "Corporate wardrobe capsule for a fintech, smart casual, campaign + social assets",
  ],
  "Visual Artist": [
    "Maggi or FMCG—limited mural or installation in a Lagos market hub",
    "Brand commission: mixed-media pieces for a bank lobby and digital campaign",
    "Festival or Detty December—immersive art piece for a beer or spirits pop-up",
    "Chivita or similar—bottle art series and gallery-style social content",
  ],
  "Music Video Director": [
    "MTN wants a music video for a new data plan, Afrobeats artist, premium look",
    "Indomie or similar—playful MV-style spot with dance and street culture",
    "Bank or telco—anthem or hero film with full MV treatment and artist feature",
    "Brand live session series—Nigerian artist + product placement, 3 x performance films",
  ],
}

type CreatorValue = (typeof CREATOR_ROLES)[number]["value"]

function getExampleBriefsForType(creatorType: string): readonly string[] {
  const key = creatorType as CreatorValue
  return EXAMPLE_BRIEFS_BY_TYPE[key] ?? EXAMPLE_BRIEFS_BY_TYPE["Skit Creator"]
}

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
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-primary/[0.04] text-foreground">
      <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 sm:py-16">
        <header
          className="mb-10 space-y-2 text-center sm:mb-12 sm:text-left motion-safe:animate-ui-fade-up"
          style={{ animationDelay: "0ms" }}
        >
          <h1 className="inline-flex items-center justify-center gap-2.5 text-3xl font-semibold tracking-tight sm:justify-start sm:text-4xl md:text-5xl">
            <span
              className="inline-flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/12 text-primary shadow-sm ring-1 ring-primary/20 transition-transform duration-300 motion-safe:hover:scale-[1.03] sm:size-10"
              aria-hidden
            >
              <Sparkles className="size-5 sm:size-6" strokeWidth={1.75} />
            </span>
            <span className="text-foreground">Pitch Engine</span>
          </h1>
          <p className="text-base text-muted-foreground/95 sm:text-lg">
            Turn any brand brief into a pitch-ready package
          </p>
        </header>

        {error && !generating && (
          <Alert
            variant="destructive"
            className="mb-8 motion-safe:animate-ui-fade-up"
            role="alert"
          >
            <AlertTitle>Could not generate</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <section
          className="w-full max-w-full space-y-6 rounded-2xl border border-border/50 bg-card/30 p-5 shadow-sm ring-1 ring-border/30 backdrop-blur-sm sm:space-y-8 sm:p-7 motion-safe:animate-ui-fade-up"
          style={{ animationDelay: "60ms" }}
          aria-label="Inputs"
        >
          <div className="space-y-3">
            <label className="text-sm font-medium leading-none" htmlFor="role">
              I am a&hellip;
            </label>
            <Select value={creatorType} onValueChange={setCreatorType}>
              <SelectTrigger
                id="role"
                className="h-11 w-full border-border/60 bg-background/60 transition-colors focus-visible:ring-2 focus-visible:ring-ring hover:border-primary/30"
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
                "min-h-36 w-full max-w-full resize-y border-border/60 bg-background/60 text-base leading-relaxed",
                "transition-[min-height,box-shadow,border-color] duration-200 ease-out",
                "focus-visible:min-h-56 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                "hover:border-border focus-visible:border-primary/40",
              )}
              value={brief}
              onChange={(e) => setBrief(e.target.value)}
            />
            <div
              className="flex flex-wrap gap-2"
              role="group"
              aria-label={`Example briefs for ${creatorType}`}
            >
              {getExampleBriefsForType(creatorType).map((example) => {
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
                        "whitespace-normal border border-border/50 bg-secondary/50 px-3 py-1.5 text-xs font-normal leading-snug transition-all duration-200",
                        "hover:border-primary/25 hover:bg-secondary/80",
                        active &&
                          "border-primary bg-primary/8 text-foreground ring-1 ring-primary/35",
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
              "h-12 w-full max-w-full text-base font-medium transition-all duration-200 focus-visible:ring-2 focus-visible:ring-offset-2",
              canGenerate &&
                "bg-gradient-to-r from-primary via-primary to-primary/80 text-primary-foreground shadow-md shadow-primary/20 hover:from-primary/95 hover:via-primary/90 hover:to-primary/75 hover:shadow-lg hover:shadow-primary/25",
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
            className="mt-10 flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/50 bg-card/20 py-12 text-center motion-safe:animate-ui-fade-up"
            style={{ animationDelay: "100ms" }}
            role="status"
            aria-live="polite"
          >
            <Sparkles
              className="mb-3 size-16 text-primary/60 motion-safe:animate-ui-soft-pulse"
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
            className="mt-10 rounded-2xl border border-border/40 bg-card/20 p-5 pt-8 motion-safe:animate-ui-fade-up sm:mt-12 sm:p-6"
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
            className="mt-10 motion-safe:animate-ui-fade-up sm:mt-12"
            style={{ animationDelay: "40ms" }}
            aria-label="Your pitch package"
          >
            <Card className="overflow-hidden border border-border/60 bg-card/90 shadow-lg shadow-black/20 ring-1 ring-border/30 transition-shadow duration-300 hover:shadow-xl hover:ring-primary/15">
              <CardHeader className="border-b border-border/40 bg-gradient-to-r from-card to-card/60 pb-4">
                <CardTitle className="text-xl tracking-tight">Your pitch package</CardTitle>
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
                        "inline-flex w-max min-w-full flex-nowrap gap-0.5 rounded-full border border-border/50 bg-muted/40 p-1",
                        "sm:grid sm:w-full sm:max-w-full sm:grid-cols-4",
                      )}
                    >
                      <TabsTrigger
                        value="concepts"
                        className="shrink-0 rounded-full px-3 py-2 text-xs transition-all duration-200 after:hidden data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md sm:text-sm"
                        aria-label="View concepts"
                      >
                        Concepts
                      </TabsTrigger>
                      <TabsTrigger
                        value="shot"
                        className="shrink-0 rounded-full px-3 py-2 text-xs transition-all duration-200 after:hidden data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md sm:text-sm"
                        aria-label="View shot list"
                      >
                        Shot List
                      </TabsTrigger>
                      <TabsTrigger
                        value="deck"
                        className="shrink-0 rounded-full px-3 py-2 text-xs transition-all duration-200 after:hidden data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md sm:text-sm"
                        aria-label="View pitch deck"
                      >
                        Pitch Deck
                      </TabsTrigger>
                      <TabsTrigger
                        value="email"
                        className="shrink-0 rounded-full px-3 py-2 text-xs transition-all duration-200 after:hidden data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md sm:text-sm"
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
                          className="relative motion-safe:animate-ui-fade-up rounded-xl border border-border/60 bg-gradient-to-b from-card/80 to-card/50 p-5 pt-8 shadow-sm transition-all duration-300 hover:border-primary/20 hover:shadow-md"
                          style={{ animationDelay: `${120 + i * 55}ms` }}
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
                    <div className="mt-1 rounded-xl border border-border/30 bg-primary/[0.02] p-1 sm:p-2">
                      <ShotListView shots={result.shotList} />
                    </div>
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
                    <div className="mt-1 rounded-xl border border-border/30 bg-primary/[0.03] p-1 sm:p-2">
                      <PitchDeckView deck={result.pitchDeck} />
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
                    <div className="space-y-4 rounded-xl border border-border/50 bg-gradient-to-b from-card/60 to-background/30 p-4 sm:p-5 motion-safe:animate-ui-fade-up">
                      <div>
                        <p className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-primary/80">
                          Subject
                        </p>
                        <p className="mt-1.5 text-sm font-medium text-foreground/95">
                          {result.email.subject}
                        </p>
                      </div>
                      <div>
                        <p className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-primary/80">
                          Body
                        </p>
                        <pre
                          className="mt-2 max-h-[min(50vh,28rem)] overflow-y-auto rounded-lg border border-border/40 bg-background/50 p-3 whitespace-pre-wrap font-mono text-sm leading-relaxed text-muted-foreground [font-size:0.9rem] sm:[font-size:0.875rem]"
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
