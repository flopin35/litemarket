import { useEffect, useState } from "react";
import { FaWhatsapp } from "react-icons/fa6";
import { LuBot, LuCircleCheck, LuSearch, LuShoppingBag } from "react-icons/lu";
import { cn } from "../../lib/cn";

const PRODUCTS = [
  { name: "Jollof & Chicken", price: "45.00", emoji: "🍲", bg: "from-amber-200 to-orange-300" },
  { name: "Waakye Special", price: "35.00", emoji: "🥘", bg: "from-rose-200 to-orange-200" },
  { name: "Sobolo 500ml", price: "12.00", emoji: "🥤", bg: "from-fuchsia-200 to-rose-200" },
  { name: "Kelewele", price: "15.00", emoji: "🍠", bg: "from-yellow-200 to-amber-300" },
];

const EVENTS = [
  { icon: "wa", title: "New WhatsApp order", text: "LM-7KQ2XA · 2 items · GHS 90.00" },
  { icon: "paid", title: "Payment received", text: "Mobile Money · GHS 45.00" },
  { icon: "ai", title: "AI assistant", text: "\"Try our Sobolo with that jollof!\"" },
  { icon: "wa", title: "New WhatsApp order", text: "LM-Q4HN2C · 1 item · GHS 35.00" },
];

/** The animated phone in the hero: a mini shop with live notifications sliding in. */
export function PhoneMockup() {
  const [tick, setTick] = useState(0);
  const [cart, setCart] = useState(1);

  useEffect(() => {
    const t = setInterval(() => {
      setTick((x) => x + 1);
      setCart((c) => (c >= 4 ? 1 : c + 1));
    }, 2800);
    return () => clearInterval(t);
  }, []);

  const event = EVENTS[tick % EVENTS.length]!;

  return (
    <div className="relative mx-auto w-[300px] sm:w-[320px]">
      {/* glow */}
      <div className="absolute -inset-10 -z-10 rounded-full bg-gradient-to-tr from-brand-400/40 via-emerald-300/30 to-sun-300/40 blur-3xl" />

      {/* phone */}
      <div className="relative animate-float-slow rounded-[2.8rem] border-[10px] border-zinc-900 bg-zinc-900 shadow-2xl shadow-brand-900/30 dark:border-zinc-800">
        <div className="absolute top-2 left-1/2 z-20 h-5 w-24 -translate-x-1/2 rounded-full bg-zinc-900 dark:bg-zinc-800" />
        <div className="relative h-[600px] overflow-hidden rounded-[2.1rem] bg-zinc-50 dark:bg-zinc-950">
          {/* shop header */}
          <div className="bg-gradient-to-br from-orange-500 to-amber-500 px-5 pt-10 pb-6 text-white">
            <div className="flex items-center gap-3">
              <div className="flex size-11 items-center justify-center rounded-2xl bg-white/25 text-lg font-black backdrop-blur">AK</div>
              <div>
                <p className="text-base leading-tight font-extrabold">Ama's Kitchen</p>
                <p className="text-[11px] opacity-90">Home-cooked meals · Accra</p>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2 rounded-xl bg-white/95 px-3 py-2 text-xs text-zinc-400">
              <LuSearch className="size-3.5" /> Search the menu
            </div>
          </div>
          <div className="flex gap-2 overflow-hidden px-4 pt-3 text-[11px] font-semibold">
            {["All", "Food", "Drinks", "Snacks"].map((c, i) => (
              <span key={c} className={cn("rounded-full px-3 py-1", i === 0 ? "bg-orange-500 text-white" : "bg-white text-zinc-600 shadow-sm dark:bg-zinc-900 dark:text-zinc-300")}>
                {c}
              </span>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3 p-4">
            {PRODUCTS.map((p, i) => (
              <div key={p.name} className="animate-pop overflow-hidden rounded-2xl bg-white shadow-sm dark:bg-zinc-900" style={{ animationDelay: `${600 + i * 120}ms` }}>
                <div className={cn("flex h-20 items-center justify-center bg-gradient-to-br text-3xl", p.bg)}>{p.emoji}</div>
                <div className="p-2.5">
                  <p className="truncate text-[11px] font-bold text-zinc-800 dark:text-zinc-100">{p.name}</p>
                  <div className="mt-1 flex items-center justify-between">
                    <span className="text-[11px] font-extrabold text-orange-600">GHS {p.price}</span>
                    <span className="flex size-5 items-center justify-center rounded-full bg-orange-500 text-xs font-bold text-white">+</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* live event toast inside the phone */}
          <div key={tick} className="absolute inset-x-3 top-[148px] z-10 animate-[pop_0.5s_var(--ease-spring)_both]">
            <div className="flex items-center gap-3 rounded-2xl border border-white/60 bg-white/90 p-3 shadow-xl backdrop-blur-xl dark:border-white/10 dark:bg-zinc-900/90">
              <span
                className={cn(
                  "flex size-9 shrink-0 items-center justify-center rounded-xl text-white",
                  event.icon === "wa" && "bg-[#1fae53]",
                  event.icon === "paid" && "bg-brand-600",
                  event.icon === "ai" && "bg-violet-600",
                )}
              >
                {event.icon === "wa" ? <FaWhatsapp className="size-5" /> : event.icon === "paid" ? <LuCircleCheck className="size-5" /> : <LuBot className="size-5" />}
              </span>
              <div className="min-w-0">
                <p className="text-xs font-bold text-zinc-900 dark:text-white">{event.title}</p>
                <p className="truncate text-[11px] text-zinc-500">{event.text}</p>
              </div>
              <span className="ml-auto self-start text-[10px] text-zinc-400">now</span>
            </div>
          </div>

          {/* cart bar */}
          <div className="absolute inset-x-4 bottom-5 flex items-center justify-between rounded-2xl bg-zinc-900 px-4 py-3 text-white shadow-xl dark:bg-white dark:text-zinc-900">
            <span className="flex items-center gap-2 text-xs font-bold">
              <span key={cart} className="relative animate-bump">
                <LuShoppingBag className="size-5" />
                <span className="absolute -top-1.5 -right-2 flex size-4 items-center justify-center rounded-full bg-orange-500 text-[9px] text-white">{cart}</span>
              </span>
              View cart
            </span>
            <span className="flex items-center gap-1.5 rounded-xl bg-[#1fae53] px-3 py-1.5 text-[11px] font-bold text-white">
              <FaWhatsapp /> Order
            </span>
          </div>
        </div>
      </div>

      {/* floating cards around the phone */}
      <div className="absolute top-24 -left-20 hidden animate-[pop_0.6s_var(--ease-spring)_1.1s_both] lg:block">
        <div className="animate-float rounded-2xl border border-zinc-200/70 bg-white/90 p-3.5 shadow-xl backdrop-blur dark:border-white/10 dark:bg-zinc-900/90">
          <p className="text-[11px] font-semibold text-zinc-500">Sales this week</p>
          <p className="text-lg font-extrabold">GHS 1,280</p>
          <div className="mt-2 flex h-8 items-end gap-1">
            {[30, 45, 35, 60, 50, 80, 95].map((h, i) => (
              <span key={i} className="w-2.5 rounded-sm bg-gradient-to-t from-brand-600 to-brand-400" style={{ height: `${h}%` }} />
            ))}
          </div>
        </div>
      </div>
      <div className="absolute -right-16 bottom-20 hidden animate-[pop_0.6s_var(--ease-spring)_1.4s_both] lg:block">
        <div className="max-w-[190px] animate-float rounded-2xl border border-zinc-200/70 bg-white/90 p-3.5 shadow-xl backdrop-blur [animation-delay:1.5s] dark:border-white/10 dark:bg-zinc-900/90">
          <p className="flex items-center gap-1.5 text-[11px] font-bold text-violet-600">
            <LuBot /> AI wrote this caption
          </p>
          <p className="mt-1 text-[11px] leading-snug text-zinc-600 dark:text-zinc-300">🍲 Smoky party jollof, packed hot. Only GHS 45!</p>
        </div>
      </div>
    </div>
  );
}
