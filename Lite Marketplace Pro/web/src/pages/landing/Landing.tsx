import { useEffect, useState, type ReactNode } from "react";
import { FaWhatsapp } from "react-icons/fa6";
import {
  LuArrowRight,
  LuBadgeCheck,
  LuBot,
  LuChartColumn,
  LuCheck,
  LuChevronDown,
  LuCreditCard,
  LuLink,
  LuMegaphone,
  LuMenu,
  LuMessagesSquare,
  LuShield,
  LuSmartphone,
  LuSparkles,
  LuSplit,
  LuStore,
  LuWandSparkles,
  LuX,
  LuZap,
} from "react-icons/lu";
import { Logo, ThemeToggle } from "../../components/bits";
import { CountUp, Marquee, Reveal, RotatingWords, Stagger, Tilt, Typewriter } from "../../components/motion";
import { ButtonLink } from "../../components/ui";
import { BRAND } from "../../config";
import { api } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import { cn } from "../../lib/cn";
import { money } from "../../lib/format";
import { useLoad, usePageTitle } from "../../lib/hooks";
import { Link } from "../../lib/router";
import type { PublicConfig } from "../../lib/types";
import { PhoneMockup } from "./PhoneMockup";

const FALLBACK_CONFIG: PublicConfig = {
  brandName: BRAND.name,
  supportEmail: BRAND.supportEmail,
  currency: "GHS",
  freeProductLimit: 5,
  freeAiCredits: 50,
  paidAiCredits: 2000,
  plans: [
    { code: "WEEKLY", name: "Weekly", price: 30, days: 7, popular: false },
    { code: "MONTHLY", name: "Monthly", price: 100, days: 30, popular: true },
    { code: "QUARTER", name: "3 Months", price: 230, days: 91, popular: false },
    { code: "FIVE_MONTHS", name: "5 Months", price: 400, days: 152, popular: false },
  ],
  providers: [],
  demoPayments: false,
};

export default function Landing() {
  usePageTitle(`${BRAND.name}: your online shop on WhatsApp`);
  const { data } = useLoad(() => api.get<PublicConfig>("/api/config"));
  const config = data ?? FALLBACK_CONFIG;

  return (
    <div className="overflow-x-clip">
      <Nav />
      <Hero />
      <CategoryMarquee />
      <Features />
      <HowItWorks />
      <AIShowcase />
      <Payments />
      <Numbers />
      <Pricing config={config} />
      <FAQ />
      <FinalCTA />
      <Footer />
    </div>
  );
}

// ── Navigation ────────────────────────────────────────────────────────────────

function Nav() {
  const { me } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 12);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  const links = [
    ["Features", "#features"],
    ["AI assistant", "#ai"],
    ["Payments", "#payments"],
    ["Pricing", "#pricing"],
    ["FAQ", "#faq"],
  ];
  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-all duration-500",
        scrolled ? "border-b border-zinc-200/60 bg-white/75 py-2.5 backdrop-blur-xl dark:border-white/10 dark:bg-ink-950/70" : "py-4",
      )}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link to="/" aria-label="Home">
          <Logo />
        </Link>
        <nav className="hidden items-center gap-1 md:flex">
          {links.map(([label, href]) => (
            <a key={href} href={href} className="rounded-lg px-3 py-2 text-sm font-semibold text-zinc-600 transition hover:text-zinc-950 dark:text-zinc-300 dark:hover:text-white">
              {label}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-1.5">
          <ThemeToggle />
          {me ? (
            <ButtonLink to="/app" size="sm" className="hidden sm:inline-flex">
              Dashboard <LuArrowRight />
            </ButtonLink>
          ) : (
            <>
              <Link to="/login" className="hidden rounded-lg px-3 py-2 text-sm font-semibold text-zinc-700 hover:text-zinc-950 sm:block dark:text-zinc-200 dark:hover:text-white">
                Log in
              </Link>
              <ButtonLink to="/signup" size="sm" className="hidden sm:inline-flex">
                Start free
              </ButtonLink>
            </>
          )}
          <button className="rounded-lg p-2 md:hidden" onClick={() => setOpen(!open)} aria-label="Menu">
            {open ? <LuX className="size-5" /> : <LuMenu className="size-5" />}
          </button>
        </div>
      </div>
      {open && (
        <div className="mx-4 mt-2 animate-scale-in rounded-2xl border border-zinc-200 bg-white p-3 shadow-xl md:hidden dark:border-white/10 dark:bg-zinc-900">
          {links.map(([label, href]) => (
            <a key={href} href={href} onClick={() => setOpen(false)} className="block rounded-xl px-4 py-3 font-semibold hover:bg-zinc-50 dark:hover:bg-white/5">
              {label}
            </a>
          ))}
          {me ? (
            <ButtonLink to="/app" className="mt-2 w-full">
              Go to dashboard <LuArrowRight />
            </ButtonLink>
          ) : (
            <div className="mt-2 grid grid-cols-2 gap-2">
              <ButtonLink to="/login" variant="secondary">
                Log in
              </ButtonLink>
              <ButtonLink to="/signup">Start free</ButtonLink>
            </div>
          )}
        </div>
      )}
    </header>
  );
}

// ── Hero ──────────────────────────────────────────────────────────────────────

function Hero() {
  return (
    <section className="relative pt-32 pb-20 sm:pt-40 lg:pb-28">
      <div className="grid-bg absolute inset-0 -z-10" />
      <div className="absolute top-20 -left-32 -z-10 size-[28rem] animate-blob bg-brand-300/30 blur-3xl dark:bg-brand-500/20" />
      <div className="absolute top-40 -right-24 -z-10 size-[24rem] animate-blob bg-sun-300/30 blur-3xl [animation-delay:-6s] dark:bg-sun-500/10" />

      <div className="mx-auto grid max-w-7xl items-center gap-16 px-4 sm:px-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="text-center lg:text-left">
          <a href="#ai" className="inline-flex animate-fade-up items-center gap-2 rounded-full border border-brand-200 bg-white/70 py-1 pr-3 pl-1 text-xs font-semibold text-brand-800 shadow-sm backdrop-blur dark:border-brand-500/30 dark:bg-brand-500/10 dark:text-brand-200">
            <span className="rounded-full bg-gradient-to-r from-brand-500 to-brand-600 px-2 py-0.5 text-white">New</span>
            An AI sales assistant is built in
            <LuArrowRight className="size-3.5" />
          </a>

          <h1 className="mt-6 animate-fade-up text-4xl leading-[1.05] font-extrabold tracking-tight [animation-delay:80ms] sm:text-6xl lg:text-[4.2rem]">
            Sell your <RotatingWords words={["food", "fashion", "beauty", "gadgets", "services"]} wordClassName="text-gradient" />
            <br />
            on WhatsApp,
            <br className="hidden sm:block" /> the smart way.
          </h1>

          <p className="mx-auto mt-6 max-w-xl animate-fade-up text-lg leading-relaxed text-zinc-600 [animation-delay:160ms] lg:mx-0 dark:text-zinc-300">
            Create a beautiful online shop in minutes. Customers order on WhatsApp or pay with Mobile Money and card, and an AI
            assistant writes your listings, chats with shoppers and tells you how to sell more.
          </p>

          <div className="mt-9 flex animate-fade-up flex-col items-center justify-center gap-3 [animation-delay:240ms] sm:flex-row lg:justify-start">
            <ButtonLink to="/signup" size="lg" className="w-full sm:w-auto">
              Create my shop, free <LuArrowRight />
            </ButtonLink>
            <ButtonLink to="/s/amas-kitchen" size="lg" variant="secondary" className="w-full sm:w-auto" icon={<LuStore />}>
              See a live shop
            </ButtonLink>
          </div>

          <ul className="mt-8 flex animate-fade-up flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm font-medium text-zinc-500 [animation-delay:320ms] lg:justify-start dark:text-zinc-400">
            {["No coding", "Free plan forever", "Works on any phone"].map((t) => (
              <li key={t} className="flex items-center gap-1.5">
                <LuBadgeCheck className="size-4 text-brand-500" /> {t}
              </li>
            ))}
          </ul>
        </div>

        <div className="animate-fade-up [animation-delay:200ms]">
          <PhoneMockup />
        </div>
      </div>
    </section>
  );
}

function CategoryMarquee() {
  const items = [
    ["🍲", "Restaurants & home cooks"],
    ["👗", "Fashion & tailoring"],
    ["✨", "Beauty & skincare"],
    ["📱", "Phones & gadgets"],
    ["🥤", "Drinks & juice bars"],
    ["🏠", "Home & decor"],
    ["🎂", "Cakes & pastries"],
    ["🛠️", "Services & bookings"],
  ];
  return (
    <section className="border-y border-zinc-200/70 bg-zinc-50/70 py-6 dark:border-white/5 dark:bg-white/[0.02]">
      <p className="mb-4 text-center text-xs font-bold tracking-[0.2em] text-zinc-400 uppercase">Built for small businesses that sell on WhatsApp</p>
      <Marquee>
        {items.map(([emoji, label]) => (
          <span key={label} className="flex items-center gap-2.5 text-base font-semibold whitespace-nowrap text-zinc-600 dark:text-zinc-300">
            <span className="text-2xl">{emoji}</span>
            {label}
          </span>
        ))}
      </Marquee>
    </section>
  );
}

// ── Features ──────────────────────────────────────────────────────────────────

function SectionTitle({ eyebrow, title, text, id }: { eyebrow: string; title: ReactNode; text?: string; id?: string }) {
  return (
    <div id={id} className="mx-auto max-w-2xl scroll-mt-28 text-center">
      <Reveal>
        <p className="text-sm font-bold tracking-wider text-brand-600 uppercase dark:text-brand-400">{eyebrow}</p>
      </Reveal>
      <Reveal delay={80}>
        <h2 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-5xl">{title}</h2>
      </Reveal>
      {text && (
        <Reveal delay={160}>
          <p className="mt-4 text-lg text-zinc-600 dark:text-zinc-400">{text}</p>
        </Reveal>
      )}
    </div>
  );
}

function Features() {
  const cards: { icon: ReactNode; title: string; text: string; span?: string; art?: ReactNode; dark?: boolean }[] = [
    {
      icon: <LuLink />,
      title: "Your own shop link",
      text: "A fast, beautiful shop at your own address. Share it in your bio, Status and groups.",
      span: "lg:col-span-2",
      art: <ShopLinkArt />,
    },
    { icon: <FaWhatsapp />, title: "Orders on WhatsApp", text: "Customers fill a cart and send a neat order straight to your WhatsApp. Every order is also saved in your dashboard." },
    { icon: <LuCreditCard />, title: "Mobile Money & card", text: "Get paid online through Paystack, Flutterwave or Stripe. Payments are confirmed automatically." },
    { icon: <LuWandSparkles />, title: "AI that sells for you", text: "Writes product descriptions from a photo, answers shoppers 24/7 and drafts your replies." },
    {
      icon: <LuSplit />,
      title: "Run it as a marketplace",
      text: "Sellers pay you for plans. Take a commission on every order, split payments automatically and track payouts from the admin panel.",
      dark: true,
    },
    {
      icon: <LuChartColumn />,
      title: "Know your numbers",
      text: "Sales, best sellers and a 30-day chart, plus a coach that tells you what to do next.",
      span: "lg:col-span-3",
      art: <ChartArt />,
    },
  ];
  return (
    <section className="py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <SectionTitle
          id="features"
          eyebrow="Everything you need"
          title={
            <>
              From first post to <span className="text-gradient">paid order</span>
            </>
          }
          text="One simple app replaces the notebook, the screenshots and the back-and-forth."
        />
        <div className="mt-16 grid gap-5 lg:grid-cols-3">
          {cards.map((c, i) => (
            <Reveal key={c.title} delay={i * 80} className={c.span}>
              <Tilt max={3} className="h-full">
                <div
                  className={cn(
                    "group card relative h-full overflow-hidden p-7 transition-shadow duration-500 hover:shadow-xl hover:shadow-brand-900/5",
                    c.dark && "border-transparent bg-gradient-to-br from-zinc-900 to-zinc-800 text-white dark:from-brand-900 dark:to-zinc-900",
                  )}
                >
                  <div className="absolute -top-24 -right-24 size-48 rounded-full bg-brand-400/0 blur-3xl transition-all duration-700 group-hover:bg-brand-400/20" />
                  <div className="relative flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-50 to-brand-100 text-xl text-brand-700 ring-1 ring-brand-200/70 transition-transform duration-500 group-hover:scale-110 group-hover:-rotate-6 dark:from-brand-500/20 dark:to-brand-500/5 dark:text-brand-300 dark:ring-brand-500/20">
                    {c.icon}
                  </div>
                  <h3 className="relative mt-5 text-xl font-bold">{c.title}</h3>
                  <p className={cn("relative mt-2 max-w-md", c.dark ? "text-zinc-300" : "text-zinc-600 dark:text-zinc-400")}>{c.text}</p>
                  {c.art && <div className="relative mt-6">{c.art}</div>}
                </div>
              </Tilt>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function ShopLinkArt() {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 font-mono text-sm dark:border-white/10 dark:bg-white/5">
        <span className="size-2 animate-pulse rounded-full bg-brand-500" />
        yourshop.com/s/<span className="font-bold text-brand-600 dark:text-brand-400">amas-kitchen</span>
      </div>
      {["Instagram bio", "WhatsApp Status", "TikTok", "Groups"].map((t, i) => (
        <span key={t} className="animate-pop rounded-full bg-white px-3 py-1 text-xs font-semibold text-zinc-600 shadow-sm ring-1 ring-zinc-200 dark:bg-white/5 dark:text-zinc-300 dark:ring-white/10" style={{ animationDelay: `${i * 120}ms` }}>
          {t}
        </span>
      ))}
    </div>
  );
}

function ChartArt() {
  const bars = [35, 50, 42, 66, 58, 82, 100, 74, 88, 95];
  return (
    <Reveal from="zoom">
      <div className="flex h-24 items-end gap-2">
        {bars.map((h, i) => (
          <div key={i} className="flex-1 origin-bottom animate-[pop_0.8s_var(--ease-spring)_both] rounded-t-md bg-gradient-to-t from-brand-600 to-brand-300" style={{ height: `${h}%`, animationDelay: `${i * 70}ms` }} />
        ))}
      </div>
    </Reveal>
  );
}

// ── How it works ──────────────────────────────────────────────────────────────

function HowItWorks() {
  const steps = [
    { n: "1", title: "Create your shop", text: "Sign up with your WhatsApp number and shop name. Your link is live instantly." },
    { n: "2", title: "Add products", text: "Snap a photo, set a price, and let AI write the description and caption." },
    { n: "3", title: "Share & get paid", text: "Share your link. Orders land on WhatsApp and in your dashboard, paid or ready to confirm." },
  ];
  return (
    <section className="relative bg-zinc-50 py-24 sm:py-32 dark:bg-white/[0.02]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <SectionTitle eyebrow="How it works" title="Live in three steps" text="Most sellers are taking orders the same afternoon." />
        <div className="relative mt-16 grid gap-8 md:grid-cols-3">
          <div className="absolute top-10 right-[16%] left-[16%] hidden h-0.5 overflow-hidden rounded bg-zinc-200 md:block dark:bg-white/10">
            <div className="h-full w-1/3 animate-[marquee_3s_linear_infinite] bg-gradient-to-r from-transparent via-brand-500 to-transparent" style={{ animationDirection: "reverse" }} />
          </div>
          {steps.map((s, i) => (
            <Reveal key={s.n} delay={i * 150} className="relative text-center">
              <div className="relative mx-auto flex size-20 items-center justify-center rounded-3xl bg-white text-3xl font-black text-brand-600 shadow-xl ring-1 shadow-brand-900/5 ring-zinc-200 dark:bg-zinc-900 dark:text-brand-400 dark:ring-white/10">
                {s.n}
                <span className="absolute -top-1.5 -right-1.5 size-4 animate-ping-slow rounded-full bg-brand-400/50" />
              </div>
              <h3 className="mt-6 text-xl font-bold">{s.title}</h3>
              <p className="mx-auto mt-2 max-w-xs text-zinc-600 dark:text-zinc-400">{s.text}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── AI showcase ───────────────────────────────────────────────────────────────

const AI_TABS = [
  {
    id: "writer",
    icon: <LuWandSparkles />,
    label: "Product writer",
    prompt: "📸 photo of a kente dress · GHS 350",
    answer:
      "Kente Wrap Dress: Handwoven Statement Piece\n\nBold, handwoven kente in rich gold and green, cut into a flattering wrap shape that works for weddings, church and every celebration in between.\n\n#KenteStyle #MadeInGhana #ShopLocal",
  },
  {
    id: "chat",
    icon: <LuMessagesSquare />,
    label: "Shopper chat",
    prompt: "Customer: What drink goes with jollof? I have GHS 60.",
    answer:
      "Great pick! Jollof Rice & Grilled Chicken (GHS 45) plus a chilled Sobolo (GHS 12) comes to GHS 57, just under your budget. Want me to add both to your cart? 🛒",
  },
  {
    id: "coach",
    icon: <LuChartColumn />,
    label: "Sales coach",
    prompt: "Analyse my shop",
    answer:
      "Sales are up 18% this week.\n\n• Restock Pineapple Juice: it sold 14 last month but is sold out.\n• 2 orders have waited over 2 days. Reply today.\n• Fridays are your best day. Post your Status on Thursday evening.",
  },
  {
    id: "reply",
    icon: <LuMegaphone />,
    label: "Reply & broadcast",
    prompt: "Customer: \"My food came late and cold 😡\"",
    answer:
      "Hi Kofi, I'm really sorry about order LM-7KQ2XA. That's not the experience we want for you. Could you share a photo? I'll send a fresh plate right away, on us. 🙏",
  },
];

function AIShowcase() {
  const [tab, setTab] = useState(0);
  const [auto, setAuto] = useState(true);
  useEffect(() => {
    if (!auto) return;
    const t = setInterval(() => setTab((x) => (x + 1) % AI_TABS.length), 7000);
    return () => clearInterval(t);
  }, [auto]);
  const current = AI_TABS[tab]!;
  return (
    <section className="py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <SectionTitle
          id="ai"
          eyebrow="AI assistant"
          title={
            <>
              Like hiring a <span className="text-gradient">sales team</span> for your phone
            </>
          }
          text="Powered by Claude or OpenAI, with a smart built-in engine that works even without an API key."
        />
        <Reveal from="zoom" className="mt-14">
          <div className="relative overflow-hidden rounded-[2rem] border border-zinc-200 bg-gradient-to-br from-zinc-900 via-zinc-900 to-brand-950 p-2 shadow-2xl shadow-brand-900/20 dark:border-white/10">
            <div className="absolute -top-32 left-1/3 size-80 animate-blob rounded-full bg-brand-500/25 blur-3xl" />
            <div className="relative grid gap-2 lg:grid-cols-[260px_1fr]">
              <div className="flex gap-2 overflow-x-auto p-2 lg:flex-col no-scrollbar">
                {AI_TABS.map((t, i) => (
                  <button
                    key={t.id}
                    onClick={() => {
                      setTab(i);
                      setAuto(false);
                    }}
                    className={cn(
                      "relative flex shrink-0 items-center gap-3 overflow-hidden rounded-2xl px-4 py-3.5 text-left text-sm font-semibold transition-all duration-300",
                      i === tab ? "bg-white text-zinc-900 shadow-lg" : "text-zinc-400 hover:bg-white/5 hover:text-white",
                    )}
                  >
                    <span className={cn("text-lg", i === tab ? "text-brand-600" : "")}>{t.icon}</span>
                    {t.label}
                    {i === tab && auto && <span key={tab} className="absolute bottom-0 left-0 h-0.5 animate-[grow_7s_linear] bg-brand-500" style={{ width: "100%" }} />}
                  </button>
                ))}
              </div>
              <div className="min-h-[330px] rounded-3xl bg-white/[0.04] p-6 ring-1 ring-white/10 sm:p-8">
                <div key={current.id} className="animate-fade-up">
                  <div className="ml-auto w-fit max-w-[90%] rounded-2xl rounded-br-md bg-brand-600 px-4 py-3 text-sm text-white shadow-lg">{current.prompt}</div>
                  <div className="mt-5 flex gap-3">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white shadow-lg">
                      <LuSparkles />
                    </span>
                    <div className="rounded-2xl rounded-tl-md bg-white px-5 py-4 text-[15px] leading-relaxed text-zinc-800 shadow-lg">
                      <Typewriter text={current.answer} speed={14} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Reveal>
        <style>{`@keyframes grow { from { transform: scaleX(0); transform-origin: left } to { transform: scaleX(1); transform-origin: left } }`}</style>
      </div>
    </section>
  );
}

// ── Payments ──────────────────────────────────────────────────────────────────

function Payments() {
  const methods = [
    { icon: <LuSmartphone />, title: "Mobile Money", text: "MTN MoMo, Telecel Cash, AirtelTigo, M-Pesa" },
    { icon: <LuCreditCard />, title: "Cards", text: "Visa, Mastercard, Verve, Apple Pay & Google Pay" },
    { icon: <FaWhatsapp />, title: "WhatsApp orders", text: "Confirm in chat, get paid on delivery or by transfer" },
  ];
  return (
    <section id="payments" className="scroll-mt-24 bg-zinc-50 py-24 sm:py-32 dark:bg-white/[0.02]">
      <div className="mx-auto grid max-w-7xl items-center gap-14 px-4 sm:px-6 lg:grid-cols-2">
        <div>
          <Reveal>
            <p className="text-sm font-bold tracking-wider text-brand-600 uppercase dark:text-brand-400">Payments</p>
          </Reveal>
          <Reveal delay={80}>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-5xl">Get paid the way your customers pay</h2>
          </Reveal>
          <Reveal delay={160}>
            <p className="mt-4 text-lg text-zinc-600 dark:text-zinc-400">
              Connect Paystack, Flutterwave or Stripe. Every payment is verified with the provider before an order is marked paid, and signed webhooks keep
              everything in sync.
            </p>
          </Reveal>
          <Stagger className="mt-8 space-y-3" step={100}>
            {methods.map((m) => (
              <div key={m.title} className="card flex items-center gap-4 p-4">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-lg text-white">{m.icon}</span>
                <div>
                  <p className="font-bold">{m.title}</p>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">{m.text}</p>
                </div>
              </div>
            ))}
          </Stagger>
        </div>
        <Reveal from="right">
          <div className="relative mx-auto max-w-md">
            <div className="absolute -inset-6 -z-10 rounded-[2.5rem] bg-gradient-to-br from-brand-300/40 to-sun-300/40 blur-2xl" />
            <div className="card overflow-hidden p-0">
              <div className="flex items-center justify-between border-b border-zinc-100 px-6 py-4 dark:border-white/10">
                <span className="font-bold">Checkout</span>
                <span className="flex items-center gap-1 text-xs font-semibold text-brand-600">
                  <LuShield /> Secure
                </span>
              </div>
              <div className="space-y-3 p-6">
                {[
                  ["Jollof Rice & Chicken × 2", "90.00"],
                  ["Sobolo 500ml × 1", "12.00"],
                ].map(([a, b]) => (
                  <div key={a} className="flex justify-between text-sm">
                    <span className="text-zinc-600 dark:text-zinc-400">{a}</span>
                    <span className="font-semibold">GHS {b}</span>
                  </div>
                ))}
                <div className="flex justify-between border-t border-dashed border-zinc-200 pt-3 text-lg font-extrabold dark:border-white/10">
                  <span>Total</span>
                  <span>GHS 102.00</span>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-2">
                  <div className="rounded-xl border-2 border-brand-500 bg-brand-50 p-3 text-center text-sm font-bold text-brand-700 dark:bg-brand-500/10 dark:text-brand-300">Pay now</div>
                  <div className="rounded-xl border-2 border-zinc-200 p-3 text-center text-sm font-bold text-zinc-500 dark:border-white/10">On WhatsApp</div>
                </div>
                <div className="relative mt-2 h-12 overflow-hidden rounded-xl bg-gradient-to-b from-brand-500 to-brand-600 text-center leading-[3rem] font-bold text-white">
                  Pay GHS 102.00
                  <span className="absolute inset-0 animate-[shimmer_2.2s_linear_infinite] bg-[linear-gradient(110deg,transparent_35%,rgba(255,255,255,.35)_50%,transparent_65%)] bg-[length:400px_100%]" />
                </div>
                <p className="flex items-center justify-center gap-1.5 pt-1 text-xs text-zinc-400">
                  <LuCheck /> Confirmed with the provider before your order is marked paid
                </p>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function Numbers() {
  const stats = [
    { value: 2, suffix: " min", label: "to open your shop" },
    { value: 3, suffix: "", label: "payment gateways built in" },
    { value: 5, suffix: "", label: "AI tools for sellers & shoppers" },
    { value: 0, suffix: "", label: "lines of code needed" },
  ];
  return (
    <section className="py-20">
      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-6 px-4 sm:px-6 lg:grid-cols-4">
        {stats.map((s, i) => (
          <Reveal key={s.label} delay={i * 90} className="text-center">
            <p className="text-5xl font-black tracking-tight text-brand-600 sm:text-6xl dark:text-brand-400">
              <CountUp value={s.value} />
              {s.suffix}
            </p>
            <p className="mt-2 text-sm font-medium text-zinc-500 dark:text-zinc-400">{s.label}</p>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

// ── Pricing ───────────────────────────────────────────────────────────────────

function Pricing({ config }: { config: PublicConfig }) {
  const perks = [`Unlimited products`, `${config.paidAiCredits.toLocaleString()} AI credits a month`, "Online payments & WhatsApp orders", "Sales coach & broadcast writer"];
  return (
    <section id="pricing" className="scroll-mt-24 bg-zinc-50 py-24 sm:py-32 dark:bg-white/[0.02]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <SectionTitle eyebrow="Pricing" title="Start free. Upgrade when you grow." text="No setup fees. Cancel any time: your shop simply goes back to Free." />
        <div className="mt-16 grid gap-5 md:grid-cols-2 xl:grid-cols-5">
          <Reveal className="xl:col-span-1">
            <div className="card flex h-full flex-col p-6">
              <p className="font-bold">Free</p>
              <p className="mt-4 text-4xl font-black">{money(0, config.currency).replace(".00", "")}</p>
              <p className="text-sm text-zinc-500">forever</p>
              <ul className="mt-6 flex-1 space-y-2.5 text-sm">
                {[`Up to ${config.freeProductLimit} products`, `${config.freeAiCredits} AI credits a month`, "WhatsApp orders", "Your shop link"].map((p) => (
                  <li key={p} className="flex gap-2">
                    <LuCheck className="mt-0.5 size-4 shrink-0 text-brand-500" /> {p}
                  </li>
                ))}
              </ul>
              <ButtonLink to="/signup" variant="secondary" className="mt-6 w-full">
                Start free
              </ButtonLink>
            </div>
          </Reveal>
          {config.plans.map((p, i) => (
            <Reveal key={p.code} delay={(i + 1) * 80}>
              <div
                className={cn(
                  "relative flex h-full flex-col rounded-2xl p-6 transition-all duration-500 hover:-translate-y-1.5",
                  p.popular
                    ? "bg-gradient-to-b from-brand-600 to-brand-800 text-white shadow-2xl shadow-brand-700/30 ring-1 ring-brand-500"
                    : "card hover:shadow-xl",
                )}
              >
                {p.popular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-sun-400 px-3 py-1 text-xs font-bold text-zinc-900 shadow-lg">Most popular</span>
                )}
                <p className="font-bold">{p.name}</p>
                <p className="mt-4 text-4xl font-black">{money(p.price, config.currency).replace(".00", "")}</p>
                <p className={cn("text-sm", p.popular ? "text-brand-100" : "text-zinc-500")}>
                  for {p.days} days · {money(p.price / (p.days / 30), config.currency).replace(".00", "")}/mo
                </p>
                <ul className="mt-6 flex-1 space-y-2.5 text-sm">
                  {perks.map((x) => (
                    <li key={x} className="flex gap-2">
                      <LuCheck className={cn("mt-0.5 size-4 shrink-0", p.popular ? "text-sun-300" : "text-brand-500")} /> {x}
                    </li>
                  ))}
                </ul>
                <ButtonLink to="/signup" variant={p.popular ? "dark" : "primary"} className="mt-6 w-full">
                  Choose {p.name}
                </ButtonLink>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── FAQ ───────────────────────────────────────────────────────────────────────

function FAQ() {
  const items = [
    ["Do I need a website or coding skills?", "No. Sign up, add your products and share your link. Your shop works on every phone and computer."],
    [
      "How do customers pay?",
      "They can pay online with Mobile Money or card (through Paystack, Flutterwave or Stripe), or send their order on WhatsApp and pay you directly, for example on delivery.",
    ],
    [
      "What can the AI assistant do?",
      "It writes product titles, descriptions and captions (even from a photo), chats with shoppers on your shop page, drafts replies to customer messages, writes broadcasts and gives you weekly sales advice.",
    ],
    ["Is it safe?", "Passwords are stored with BCrypt hashing, logins use short-lived tokens, and card and MoMo details are handled by the payment provider. We never see them."],
    ["What happens when my plan ends?", "Your shop goes back to the Free plan. Nothing is deleted, so you can upgrade again any time."],
    ["Can I share my shop on Instagram and TikTok?", "Yes. Put your shop link in your bio, your WhatsApp Status or any group. Customers land straight on your products."],
  ];
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section className="py-24 sm:py-32">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <SectionTitle id="faq" eyebrow="FAQ" title="Questions, answered" />
        <div className="mt-12 space-y-3">
          {items.map(([q, a], i) => (
            <Reveal key={q} delay={i * 60}>
              <div className={cn("card overflow-hidden transition-shadow", open === i && "shadow-lg")}>
                <button onClick={() => setOpen(open === i ? null : i)} className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left font-bold" aria-expanded={open === i}>
                  {q}
                  <LuChevronDown className={cn("size-5 shrink-0 text-zinc-400 transition-transform duration-300", open === i && "rotate-180 text-brand-500")} />
                </button>
                <div className={cn("grid transition-all duration-500 ease-[var(--ease-out-expo)]", open === i ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0")}>
                  <div className="overflow-hidden">
                    <p className="px-6 pb-5 leading-relaxed text-zinc-600 dark:text-zinc-400">{a}</p>
                  </div>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function FinalCTA() {
  return (
    <section className="px-4 pb-24 sm:px-6">
      <Reveal from="zoom">
        <div className="relative mx-auto max-w-6xl overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-brand-600 via-brand-700 to-brand-900 px-6 py-16 text-center text-white shadow-2xl shadow-brand-900/30 sm:px-16 sm:py-20">
          <div className="absolute -top-20 -left-20 size-72 animate-blob bg-sun-400/30 blur-3xl" />
          <div className="absolute -right-10 -bottom-24 size-72 animate-blob bg-emerald-300/30 blur-3xl [animation-delay:-8s]" />
          <LuZap className="relative mx-auto size-10 animate-float text-sun-300" />
          <h2 className="relative mt-6 text-3xl font-extrabold tracking-tight sm:text-5xl">Your next customer is already on WhatsApp.</h2>
          <p className="relative mx-auto mt-4 max-w-xl text-lg text-brand-100">Open your shop today. It's free to start and takes about two minutes.</p>
          <div className="relative mt-9 flex flex-col justify-center gap-3 sm:flex-row">
            <ButtonLink to="/signup" size="lg" variant="dark" className="bg-white! text-zinc-900!">
              Create my shop <LuArrowRight />
            </ButtonLink>
            <ButtonLink to="/s/amas-kitchen" size="lg" variant="ghost" className="text-white! ring-1 ring-white/30 hover:bg-white/10!">
              Browse a demo shop
            </ButtonLink>
          </div>
        </div>
      </Reveal>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-zinc-200 py-12 dark:border-white/10">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 px-4 sm:flex-row sm:px-6">
        <div className="flex flex-col items-center gap-2 sm:items-start">
          <Logo />
          <p className="text-sm text-zinc-500">{BRAND.tagline}</p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-6 text-sm font-medium text-zinc-500">
          <a href="#features" className="hover:text-zinc-900 dark:hover:text-white">
            Features
          </a>
          <a href="#pricing" className="hover:text-zinc-900 dark:hover:text-white">
            Pricing
          </a>
          <Link to="/login" className="hover:text-zinc-900 dark:hover:text-white">
            Log in
          </Link>
          <a href={`mailto:${BRAND.supportEmail}`} className="hover:text-zinc-900 dark:hover:text-white">
            Contact
          </a>
        </div>
        <p className="flex items-center gap-1.5 text-sm text-zinc-400">
          <LuBot /> © {new Date().getFullYear()} {BRAND.name}
        </p>
      </div>
    </footer>
  );
}
