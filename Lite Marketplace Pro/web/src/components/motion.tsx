/** Lightweight animation helpers: CSS transitions + IntersectionObserver, no animation library. */
import { Children, useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { cn } from "../lib/cn";
import { useCountUp, useInView } from "../lib/hooks";

export function Reveal({
  children,
  delay = 0,
  from = "up",
  className,
  as: Tag = "div",
}: {
  children: ReactNode;
  delay?: number;
  from?: "up" | "left" | "right" | "zoom";
  className?: string;
  as?: "div" | "section" | "li" | "span";
}) {
  const { ref, inView } = useInView<HTMLDivElement>();
  return (
    <Tag
      ref={ref as never}
      className={cn("reveal", from !== "up" && `reveal-${from}`, inView && "is-visible", className)}
      style={{ "--delay": `${delay}ms` } as CSSProperties}
    >
      {children}
    </Tag>
  );
}

/** Reveals each child one after the other. */
export function Stagger({ children, step = 90, className, from }: { children: ReactNode; step?: number; className?: string; from?: "up" | "left" | "right" | "zoom" }) {
  return (
    <div className={className}>
      {Children.toArray(children).map((child, i) => (
        <Reveal key={i} delay={i * step} from={from}>
          {child}
        </Reveal>
      ))}
    </div>
  );
}

export function CountUp({
  value,
  format = (v) => Math.round(v).toLocaleString(),
  className,
}: {
  value: number;
  format?: (v: number) => string;
  className?: string;
}) {
  const { ref, inView } = useInView<HTMLSpanElement>();
  const v = useCountUp(value, inView);
  return (
    <span ref={ref} className={cn("tabular-nums", className)}>
      {format(v)}
    </span>
  );
}

/** Cycles through words with a slide animation ("food" → "fashion" → ...). */
export function RotatingWords({ words, interval = 2200, className, wordClassName }: { words: string[]; interval?: number; className?: string; wordClassName?: string }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((x) => (x + 1) % words.length), interval);
    return () => clearInterval(t);
  }, [words.length, interval]);
  return (
    <span className={cn("relative inline-grid overflow-hidden align-bottom", className)}>
      {words.map((w, idx) => (
        <span
          key={w}
          aria-hidden={idx !== i}
          className={cn(
            "col-start-1 row-start-1 pb-1 text-left transition-all duration-700 ease-[var(--ease-out-expo)]",
            wordClassName,
            idx === i ? "translate-y-0 opacity-100" : idx === (i - 1 + words.length) % words.length ? "-translate-y-full opacity-0" : "translate-y-full opacity-0",
          )}
        >
          {w}
        </span>
      ))}
    </span>
  );
}

/** Types text out character by character (restarts when text changes). */
export function Typewriter({ text, speed = 18, className, onDone }: { text: string; speed?: number; className?: string; onDone?: () => void }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    setN(0);
    const t = setInterval(() => {
      setN((x) => {
        if (x >= text.length) {
          clearInterval(t);
          onDone?.();
          return x;
        }
        return x + 2;
      });
    }, speed);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, speed]);
  return (
    <span className={cn("whitespace-pre-line", className)}>
      {text.slice(0, n)}
      {n < text.length && <span className="ml-0.5 inline-block h-4 w-0.5 animate-pulse bg-current align-middle" />}
    </span>
  );
}

export function Marquee({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("group relative flex overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]", className)}>
      <div className="flex shrink-0 animate-marquee items-center gap-10 pr-10 group-hover:[animation-play-state:paused]">
        {children}
        {children}
      </div>
    </div>
  );
}

/** Tilts a card toward the pointer. */
export function Tilt({ children, className, max = 6 }: { children: ReactNode; className?: string; max?: number }) {
  const [style, setStyle] = useState<CSSProperties>({});
  return (
    <div
      className={cn("transition-transform duration-300 ease-out will-change-transform", className)}
      style={style}
      onPointerMove={(e) => {
        if (e.pointerType !== "mouse") return;
        const r = e.currentTarget.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - 0.5;
        const y = (e.clientY - r.top) / r.height - 0.5;
        setStyle({ transform: `perspective(900px) rotateX(${-y * max}deg) rotateY(${x * max}deg) translateY(-4px)` });
      }}
      onPointerLeave={() => setStyle({})}
    >
      {children}
    </div>
  );
}

/** Sends a small dot from an element to the cart button, then bumps the cart. */
export function flyToCart(from: HTMLElement, color: string, targetSelector = "[data-cart-target]") {
  const target = document.querySelector(targetSelector);
  if (!target) return;
  const a = from.getBoundingClientRect();
  const b = target.getBoundingClientRect();
  const dot = document.createElement("div");
  dot.className = "fly-dot";
  dot.style.background = color;
  dot.style.left = `${a.left + a.width / 2 - 7}px`;
  dot.style.top = `${a.top + a.height / 2 - 7}px`;
  document.body.appendChild(dot);
  requestAnimationFrame(() => {
    dot.style.transform = `translate(${b.left + b.width / 2 - (a.left + a.width / 2)}px, ${b.top + b.height / 2 - (a.top + a.height / 2)}px) scale(0.5)`;
    dot.style.opacity = "0.3";
  });
  setTimeout(() => {
    dot.remove();
    target.classList.remove("animate-bump");
    void (target as HTMLElement).offsetWidth;
    target.classList.add("animate-bump");
  }, 700);
}
