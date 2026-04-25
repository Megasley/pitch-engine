import type { PitchDeck } from "@/lib/pitch"
import { cn } from "@/lib/utils"

type Slide = {
  id: string
  kicker: string
  title: string
  body: string
  layout?: "hero" | "split" | "full"
  pair?: { kicker: string; title: string; body: string }
}

function buildSlides(d: PitchDeck): Slide[] {
  return [
    {
      id: "cover",
      kicker: "Pitch summary",
      title: "The opportunity",
      body: d.concept,
      layout: "hero",
    },
    {
      id: "audience",
      kicker: "Target",
      title: "Who this reaches",
      body: d.audience,
      layout: "full",
    },
    {
      id: "scope",
      kicker: "Engagement",
      title: "What we deliver",
      body: d.deliverables,
      layout: "split",
      pair: {
        kicker: "Investment",
        title: "Suggested fee range",
        body: d.feeRange,
      },
    },
    {
      id: "closer",
      kicker: "Why us",
      title: "Why this creative",
      body: d.whyThisCreative,
      layout: "full",
    },
  ]
}

export function PitchDeckView({ deck, className }: { deck: PitchDeck; className?: string }) {
  const slides = buildSlides(deck)
  const total = slides.length

  return (
    <div
      className={cn("pitch-deck space-y-5 sm:space-y-6", className)}
      role="region"
      aria-label="Pitch deck presentation"
    >
      {slides.map((slide, index) => (
        <PitchSlide
          key={slide.id}
          slide={slide}
          index={index}
          total={total}
        />
      ))}
    </div>
  )
}

function PitchSlide({
  slide,
  index,
  total,
}: {
  slide: Slide
  index: number
  total: number
}) {
  const n = index + 1
  const isHero = slide.layout === "hero"

  return (
    <article
      className={cn(
        "pitch-deck__slide group relative overflow-hidden rounded-2xl border border-border/60",
        "bg-gradient-to-br from-card via-card/95 to-background/80",
        "shadow-[0_1px_0_0_rgba(255,255,255,0.04)_inset,0_20px_50px_-24px_rgba(0,0,0,0.55)]",
        "ring-1 ring-border/30",
        "motion-safe:animate-pitch-deck-in",
        isHero && "min-h-[11rem] sm:min-h-[12.5rem]",
        !isHero && "min-h-0",
      )}
      style={{
        animationDelay: `${80 + index * 70}ms`,
      }}
    >
      <div
        className="absolute top-0 bottom-0 left-0 w-1 bg-gradient-to-b from-primary via-primary/90 to-primary/40"
        aria-hidden
      />
      <div
        className="absolute -right-16 -top-20 size-64 rounded-full bg-primary/[0.06] blur-3xl transition-opacity duration-500 group-hover:opacity-100"
        aria-hidden
      />
      <div className="relative pl-4 pr-4 pt-5 pb-4 sm:pl-7 sm:pr-8 sm:pt-6 sm:pb-5">
        <header
          className={cn(
            "mb-3 flex flex-col gap-0.5 sm:mb-4",
            isHero && "sm:mb-5",
          )}
        >
          <p
            className="text-[0.65rem] font-semibold uppercase tracking-[0.22em] text-primary/90"
            aria-hidden
          >
            {slide.kicker}
          </p>
          <h3
            className={cn(
              "font-semibold tracking-tight text-foreground",
              isHero ? "text-xl sm:text-2xl" : "text-lg sm:text-xl",
            )}
          >
            {slide.title}
          </h3>
        </header>

        {slide.layout === "split" && slide.pair ? (
          <div className="grid gap-5 sm:grid-cols-2 sm:gap-8">
            <div className="min-w-0">
              <p className="text-sm leading-relaxed text-foreground/90 [text-wrap:pretty]">
                {slide.body}
              </p>
            </div>
            <div className="min-w-0 rounded-xl border border-border/50 bg-background/50 p-4 sm:p-5">
              <p className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-primary/80">
                {slide.pair.kicker}
              </p>
              <p className="mt-1 text-base font-medium text-foreground">
                {slide.pair.title}
              </p>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground [text-wrap:pretty]">
                {slide.pair.body}
              </p>
            </div>
          </div>
        ) : (
          <p
            className={cn(
              "text-sm leading-relaxed text-foreground/90 [text-wrap:pretty] sm:text-[0.95rem] sm:leading-7",
              isHero && "text-base sm:text-lg sm:leading-8",
            )}
          >
            {slide.body}
          </p>
        )}

        <footer
          className="mt-4 flex items-center justify-between border-t border-border/40 pt-3 sm:mt-5"
        >
          <span className="text-[0.6rem] font-medium uppercase tracking-[0.2em] text-muted-foreground/80">
            Pitch Engine
          </span>
          <span className="rounded-md bg-muted/60 px-2 py-0.5 font-mono text-[0.7rem] tabular-nums text-muted-foreground">
            {n} / {total}
          </span>
        </footer>
      </div>
    </article>
  )
}
