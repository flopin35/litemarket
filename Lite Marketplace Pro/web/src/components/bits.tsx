import { useState } from "react";
import { LuMoon, LuSparkles, LuSun } from "react-icons/lu";
import { assetUrl, BRAND } from "../config";
import { cn } from "../lib/cn";
import { useTheme } from "../lib/theme";
import type { Engine, OrderStatus } from "../lib/types";
import { Badge } from "./ui";

export function Logo({ className, compact }: { className?: string; compact?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5 font-extrabold tracking-tight", className)}>
      <span className="relative flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-400 to-brand-700 shadow-lg shadow-brand-600/30">
        <svg viewBox="0 0 24 24" className="size-5 text-white" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 8h14l-1.2 10.2A2 2 0 0 1 15.8 20H8.2a2 2 0 0 1-2-1.8L5 8Z" fill="currentColor" stroke="none" />
          <path d="M9 8V7a3 3 0 0 1 6 0v1" />
        </svg>
        <span className="absolute -top-1 -right-1 size-3 rounded-full bg-sun-400 ring-2 ring-white dark:ring-ink-950" />
      </span>
      {!compact && <span className="text-[17px] whitespace-nowrap">{BRAND.name}</span>}
    </span>
  );
}

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggle } = useTheme();
  return (
    <button
      onClick={toggle}
      aria-label="Switch light or dark mode"
      className={cn(
        "relative inline-flex size-10 items-center justify-center overflow-hidden rounded-xl text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-white/10 dark:hover:text-white",
        className,
      )}
    >
      <LuSun className={cn("absolute size-5 transition-all duration-500", theme === "dark" ? "rotate-90 scale-0 opacity-0" : "rotate-0 scale-100")} />
      <LuMoon className={cn("absolute size-5 transition-all duration-500", theme === "dark" ? "rotate-0 scale-100" : "-rotate-90 scale-0 opacity-0")} />
    </button>
  );
}

const CATEGORY_EMOJI: Record<string, string> = {
  food: "🍲", drinks: "🥤", snacks: "🍿", clothes: "👗", shoes: "👟", bags: "👜", beauty: "✨",
  "phones & gadgets": "📱", home: "🏠", services: "🛠️",
};

/** A fitting emoji from the product name first ("tilapia" -> fish), then the category. */
const NAME_EMOJI: [RegExp, string][] = [
  [/jollof|fried rice|rice/i, "🍛"], [/chicken|wings/i, "🍗"], [/tilapia|fish/i, "🐟"], [/waakye|beans|stew/i, "🥘"],
  [/pie|pastry/i, "🥧"], [/plantain|kelewele/i, "🍌"], [/juice|pineapple/i, "🍍"], [/sobolo|hibiscus|zobo/i, "🍹"],
  [/coffee|tea/i, "☕"], [/cake/i, "🎂"], [/pizza/i, "🍕"], [/burger/i, "🍔"], [/chips|fries/i, "🍟"],
  [/sneaker|trainer|runner/i, "👟"], [/heel/i, "👠"], [/sandal|slipper|slide/i, "🩴"], [/dress|gown|kente/i, "👗"],
  [/shirt|tee|top/i, "👕"], [/bag|purse/i, "👜"], [/shea|butter|cream|lotion/i, "🧴"], [/perfume|fragrance/i, "🌸"],
  [/phone|iphone/i, "📱"], [/charger|cable|power bank/i, "🔌"], [/earbud|headphone/i, "🎧"], [/watch/i, "⌚"],
];

const GRADIENTS = [
  "from-amber-200 via-orange-200 to-rose-200",
  "from-emerald-200 via-teal-200 to-cyan-200",
  "from-violet-200 via-fuchsia-200 to-pink-200",
  "from-sky-200 via-indigo-200 to-violet-200",
  "from-lime-200 via-emerald-200 to-teal-200",
  "from-rose-200 via-orange-200 to-amber-200",
];

/** Product photo, or a friendly gradient tile with an emoji when there's no photo. */
export function ProductImage({ src, name, category, className }: { src?: string | null; name: string; category?: string | null; className?: string }) {
  const [broken, setBroken] = useState(false);
  const url = assetUrl(src);
  if (url && !broken) {
    return <img src={url} alt={name} loading="lazy" onError={() => setBroken(true)} className={cn("h-full w-full object-cover", className)} />;
  }
  const hash = [...name].reduce((n, c) => n + c.charCodeAt(0), 0);
  const emoji = NAME_EMOJI.find(([re]) => re.test(name))?.[1] ?? CATEGORY_EMOJI[(category ?? "").toLowerCase()] ?? "🛍️";
  return (
    <div className={cn("flex h-full w-full items-center justify-center bg-gradient-to-br dark:opacity-90", GRADIENTS[hash % GRADIENTS.length], className)}>
      <span className="text-4xl drop-shadow-sm transition-transform duration-500 group-hover:scale-125 group-hover:-rotate-6">{emoji}</span>
    </div>
  );
}

export const STATUS_LABEL: Record<OrderStatus, string> = {
  NEW: "New",
  PENDING_PAYMENT: "Awaiting payment",
  PAID: "Paid",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
};

export function StatusBadge({ status }: { status: OrderStatus }) {
  const tone = status === "NEW" ? "sky" : status === "PENDING_PAYMENT" ? "amber" : status === "PAID" ? "green" : status === "DELIVERED" ? "violet" : "zinc";
  return (
    <Badge tone={tone}>
      <span className={cn("size-1.5 rounded-full bg-current", status === "NEW" && "animate-pulse")} />
      {STATUS_LABEL[status]}
    </Badge>
  );
}

export function EngineBadge({ engine }: { engine: Engine }) {
  const label = engine === "claude" ? "Claude" : engine === "openai" ? "OpenAI" : engine === "demo" ? "Demo AI" : "Smart rules";
  return (
    <Badge tone="violet">
      <LuSparkles className="size-3" /> {label}
    </Badge>
  );
}

export function Avatar({ name, src, className, color }: { name: string; src?: string | null; className?: string; color?: string | null }) {
  const url = assetUrl(src);
  const letters = name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join("");
  return (
    <span
      className={cn("inline-flex shrink-0 items-center justify-center overflow-hidden rounded-2xl font-bold text-white", className)}
      style={{ background: color ?? "linear-gradient(135deg, var(--color-brand-400), var(--color-brand-700))" }}
    >
      {url ? <img src={url} alt={name} className="h-full w-full object-cover" /> : letters}
    </span>
  );
}
