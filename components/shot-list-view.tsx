import type { LucideIcon } from "lucide-react"
import { Camera, Clapperboard, MapPin, Package } from "lucide-react"
import type { Shot } from "@/lib/pitch"
import { cn } from "@/lib/utils"

const ROWS: {
  key: keyof Pick<Shot, "shotType" | "setting" | "props" | "direction">
  label: string
  icon: LucideIcon
}[] = [
  { key: "shotType", label: "Shot", icon: Camera },
  { key: "setting", label: "Setting", icon: MapPin },
  { key: "props", label: "Props", icon: Package },
  { key: "direction", label: "Direction", icon: Clapperboard },
]

function sceneHeading(scene: string, index: number) {
  const t = String(scene).trim()
  if (/^scene/i.test(t)) {
    return t
  }
  return t.length > 0 ? `Scene: ${t}` : `Scene ${index + 1}`
}

export function ShotListView({
  shots,
  className,
}: {
  shots: Shot[]
  className?: string
}) {
  const total = shots.length

  return (
    <div
      className={cn("shot-list w-full", className)}
      role="list"
      aria-label="Shot list by scene"
    >
      <ol className="relative m-0 list-none p-0 sm:pl-1">
        <div
          className="pointer-events-none absolute top-2 bottom-6 left-[19px] hidden w-px bg-gradient-to-b from-primary/45 via-border/80 to-border/25 sm:left-[21px] sm:block"
          aria-hidden
        />

        {shots.map((s, i) => {
          const n = i + 1
          return (
            <li
              key={`${s.scene}-${s.shotType}-${i}`}
              className="group relative m-0 mb-4 flex gap-0 last:mb-0 sm:mb-5 sm:gap-4"
              role="listitem"
            >
              <div
                className="relative z-[1] hidden w-10 shrink-0 flex-col items-center sm:flex"
                aria-hidden
              >
                <div
                  className={cn(
                    "mt-0.5 flex size-10 items-center justify-center rounded-full",
                    "border-2 border-primary/55 bg-primary/12 text-sm font-bold tabular-nums text-primary",
                    "shadow-sm ring-2 ring-primary/15 ring-offset-2 ring-offset-background",
                    "transition-transform duration-300 group-hover:scale-105",
                  )}
                >
                  {n}
                </div>
              </div>

              <article
                className={cn(
                  "relative min-w-0 flex-1 overflow-hidden rounded-2xl border border-border/55",
                  "bg-gradient-to-br from-card/95 via-card/75 to-background/25",
                  "p-4 shadow-sm ring-1 ring-border/25",
                  "transition-all duration-300 will-change-transform",
                  "sm:p-5",
                  "group-hover:-translate-y-0.5 group-hover:border-primary/35",
                  "group-hover:shadow-md group-hover:ring-primary/10",
                  "motion-safe:animate-ui-fade-up",
                )}
                style={{ animationDelay: `${50 + i * 50}ms` }}
              >
                <div
                  className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-primary/90 to-primary/15 sm:w-[3px]"
                  aria-hidden
                />

                <div className="relative pl-3 sm:pl-4">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2 sm:mb-4">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <span
                        className="flex size-8 shrink-0 items-center justify-center rounded-full border border-primary/40 bg-primary/10 text-xs font-bold text-primary sm:hidden"
                        aria-hidden
                      >
                        {n}
                      </span>
                      <h3 className="min-w-0 text-base font-semibold leading-snug tracking-tight text-foreground sm:text-lg">
                        {sceneHeading(s.scene, i)}
                      </h3>
                    </div>
                    <span className="shrink-0 rounded-md bg-muted/70 px-2 py-0.5 font-mono text-[0.65rem] tabular-nums text-muted-foreground">
                      {n} / {total}
                    </span>
                  </div>

                  <dl className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-3">
                    {ROWS.map((row) => {
                      const Icon = row.icon
                      const value = s[row.key]
                      return (
                        <div
                          key={row.key}
                          className="rounded-xl border border-border/40 bg-background/45 p-3 transition-colors sm:p-3.5"
                        >
                          <dt className="mb-1.5 flex items-center gap-1.5 text-[0.65rem] font-semibold uppercase tracking-[0.1em] text-primary/90">
                            <Icon className="size-3.5 shrink-0" aria-hidden />
                            {row.label}
                          </dt>
                          <dd className="text-sm leading-relaxed text-foreground/95 [text-wrap:pretty]">
                            {value}
                          </dd>
                        </div>
                      )
                    })}
                  </dl>
                </div>
              </article>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
