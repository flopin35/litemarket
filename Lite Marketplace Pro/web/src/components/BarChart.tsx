import { useState } from "react";
import { cn } from "../lib/cn";
import { useInView } from "../lib/hooks";

export interface Bar {
  label: string;
  sub?: string;
  value: number;
  extra?: string;
}

/** Animated bar chart: bars grow in when visible, hover shows the value. */
export function BarChart({ data, format, height = 220, className }: { data: Bar[]; format: (v: number) => string; height?: number; className?: string }) {
  const { ref, inView } = useInView<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(1, ...data.map((d) => d.value));
  const dense = data.length > 12;
  const ticks = [1, 0.5, 0];

  return (
    <div ref={ref} className={cn("relative select-none", className)} style={{ height }}>
      <div className="absolute inset-0 bottom-7 flex flex-col justify-between">
        {ticks.map((t) => (
          <div key={t} className="flex items-center gap-2">
            <span className="w-14 shrink-0 text-right text-[10px] text-zinc-400 tabular-nums">{format(max * t).replace(/\.00$/, "")}</span>
            <div className="h-px flex-1 border-t border-dashed border-zinc-200 dark:border-white/10" />
          </div>
        ))}
      </div>
      <div className={cn("absolute inset-0 bottom-0 left-16 flex items-end", dense ? "gap-1" : "gap-2 sm:gap-3")}>
        {data.map((d, i) => {
          const h = (d.value / max) * (height - 28);
          const active = hover === i;
          return (
            <div
              key={i}
              className="group relative flex h-full flex-1 flex-col items-center justify-end"
              onPointerEnter={() => setHover(i)}
              onPointerLeave={() => setHover(null)}
            >
              {active && (
                <div className="absolute z-10 -translate-y-2 animate-pop rounded-xl bg-zinc-900 px-3 py-2 text-center text-xs whitespace-nowrap text-white shadow-xl dark:bg-white dark:text-zinc-900" style={{ bottom: h + 30 }}>
                  <div className="font-bold">{format(d.value)}</div>
                  {d.extra && <div className="opacity-70">{d.extra}</div>}
                </div>
              )}
              <div
                className={cn(
                  "w-full rounded-t-lg bg-gradient-to-t transition-[height,filter] duration-1000 ease-[var(--ease-out-expo)]",
                  d.value > 0 ? "from-brand-600 to-brand-400" : "from-zinc-200 to-zinc-200 dark:from-white/10 dark:to-white/10",
                  active && "brightness-110",
                  dense ? "max-w-5" : "max-w-12",
                )}
                style={{ height: inView ? Math.max(d.value > 0 ? 6 : 3, h) : 0, transitionDelay: `${i * (dense ? 15 : 60)}ms` }}
              />
              <span className={cn("mt-2 h-5 text-[11px] font-medium text-zinc-500", dense && i % 5 !== 4 && "invisible")}>{d.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Thin horizontal bar used in "top products". */
export function MeterRow({ label, value, max, right }: { label: string; value: number; max: number; right: string }) {
  const { ref, inView } = useInView<HTMLDivElement>();
  return (
    <div ref={ref} className="space-y-1.5">
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="truncate font-medium">{label}</span>
        <span className="shrink-0 font-semibold tabular-nums text-zinc-600 dark:text-zinc-300">{right}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-zinc-100 dark:bg-white/10">
        <div
          className="h-full rounded-full bg-gradient-to-r from-sun-300 to-sun-500 transition-[width] duration-1000 ease-[var(--ease-out-expo)]"
          style={{ width: inView ? `${Math.max(4, (value / Math.max(1, max)) * 100)}%` : 0 }}
        />
      </div>
    </div>
  );
}
