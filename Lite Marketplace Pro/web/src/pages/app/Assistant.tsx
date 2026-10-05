import { useState } from "react";
import { FaWhatsapp } from "react-icons/fa6";
import {
  LuBot,
  LuChartColumn,
  LuCheck,
  LuCircleAlert,
  LuCopy,
  LuLightbulb,
  LuMegaphone,
  LuMessageSquare,
  LuPackage,
  LuRefreshCw,
  LuSparkles,
  LuTrendingDown,
  LuTrendingUp,
  LuTruck,
} from "react-icons/lu";
import { EngineBadge, ProductImage } from "../../components/bits";
import { Badge, Button, Card, Input, PageHeader, Progress, Segmented, Select } from "../../components/ui";
import { api, ApiError, errorMessage } from "../../lib/api";
import { cn } from "../../lib/cn";
import { LANGUAGES, TONES } from "../../lib/constants";
import { money } from "../../lib/format";
import { copyText, useLoad, usePageTitle } from "../../lib/hooks";
import { navigate } from "../../lib/router";
import { useToast } from "../../lib/toast";
import type { AiUsage, BroadcastResult, CoachReport, Product } from "../../lib/types";
import { ReplyHelper } from "./Orders";

type Tab = "coach" | "broadcast" | "reply";

export default function Assistant() {
  usePageTitle("AI assistant");
  const usage = useLoad(() => api.get<AiUsage>("/api/ai/usage"));
  const [tab, setTab] = useState<Tab>("coach");
  const refreshUsage = () => usage.reload();

  return (
    <div>
      <PageHeader title="AI assistant" subtitle="Your sales coach, copywriter and reply helper. Each answer uses one AI credit." />

      <div className="mb-6 grid gap-4 lg:grid-cols-[1fr_280px]">
        <Segmented
          value={tab}
          onChange={setTab}
          className="w-full animate-fade-up overflow-x-auto sm:w-fit"
          options={[
            { value: "coach", label: <span className="flex items-center gap-2"><LuChartColumn /> Sales coach</span> },
            { value: "broadcast", label: <span className="flex items-center gap-2"><LuMegaphone /> Broadcast</span> },
            { value: "reply", label: <span className="flex items-center gap-2"><LuMessageSquare /> Replies</span> },
          ]}
        />
        {usage.data && (
          <div className="animate-fade-up rounded-2xl border border-zinc-200 bg-white p-3.5 dark:border-white/10 dark:bg-white/5">
            <div className="mb-1.5 flex justify-between text-xs font-semibold">
              <span className="flex items-center gap-1.5">
                <LuSparkles className="text-violet-500" /> AI credits
              </span>
              <span>
                {usage.data.limit - usage.data.used} of {usage.data.limit} left
              </span>
            </div>
            <Progress value={(usage.data.used / Math.max(1, usage.data.limit)) * 100} tone="amber" />
          </div>
        )}
      </div>

      <div key={tab} className="animate-fade-up">
        {tab === "coach" && <Coach onUsed={refreshUsage} />}
        {tab === "broadcast" && <Broadcast onUsed={refreshUsage} />}
        {tab === "reply" && (
          <Card className="max-w-2xl p-5 sm:p-6">
            <h2 className="mb-1 font-bold">Reply to a customer</h2>
            <p className="mb-4 text-sm text-zinc-500">Paste any message from WhatsApp, Instagram or SMS. You'll get three replies to choose from.</p>
            <ReplyHelper compact />
          </Card>
        )}
      </div>
    </div>
  );
}

function useAiError() {
  const toast = useToast();
  return (e: unknown) => {
    toast(errorMessage(e), "error");
    if (e instanceof ApiError && e.code === "AI_CREDITS") navigate("/app/billing");
  };
}

// ── Sales coach ───────────────────────────────────────────────────────────────

function Coach({ onUsed }: { onUsed: () => void }) {
  const fail = useAiError();
  const [report, setReport] = useState<CoachReport | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<Record<string, boolean>>({});

  async function run() {
    setBusy(true);
    try {
      setReport(await api.post<CoachReport>("/api/ai/coach"));
      setDone({});
      onUsed();
    } catch (e) {
      fail(e);
    } finally {
      setBusy(false);
    }
  }

  if (busy) return <Analysing />;

  if (!report) {
    return (
      <Card className="relative overflow-hidden p-8 text-center sm:p-12">
        <div className="absolute -top-20 left-1/2 size-72 -translate-x-1/2 animate-blob rounded-full bg-brand-300/25 blur-3xl" />
        <div className="relative">
          <div className="mx-auto flex size-16 animate-float items-center justify-center rounded-3xl bg-gradient-to-br from-brand-500 to-brand-700 text-3xl text-white shadow-xl shadow-brand-600/30">
            <LuChartColumn />
          </div>
          <h2 className="mt-6 text-2xl font-extrabold">How is my shop doing?</h2>
          <p className="mx-auto mt-2 max-w-md text-zinc-500">The coach looks at your last 60 days of orders and products, then tells you what's working and what to do next.</p>
          <Button size="lg" className="mt-8" onClick={run} icon={<LuSparkles />}>
            Analyse my shop
          </Button>
        </div>
      </Card>
    );
  }

  const kindIcon = (k: string) =>
    k === "trend" ? <LuTrendingUp /> : k === "stock" ? <LuPackage /> : k === "ops" ? <LuTruck /> : k === "pricing" ? <LuCircleAlert /> : <LuLightbulb />;

  return (
    <div className="space-y-5">
      <Card className="relative overflow-hidden p-6 sm:p-8">
        <div className="absolute -top-24 -right-16 size-72 animate-blob rounded-full bg-brand-300/20 blur-3xl" />
        <div className="relative flex flex-wrap items-start justify-between gap-3">
          <div className="max-w-2xl">
            <h2 className="text-2xl leading-tight font-extrabold sm:text-3xl">{report.headline}</h2>
            <p className="mt-3 text-zinc-600 dark:text-zinc-300">{report.summary}</p>
          </div>
          <div className="flex items-center gap-2">
            <EngineBadge engine={report.engine} />
            <Button size="sm" variant="secondary" icon={<LuRefreshCw />} onClick={run}>
              Refresh
            </Button>
          </div>
        </div>
        {report.stats.length > 0 && (
          <div className="relative mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {report.stats.map((s, i) => (
              <div key={s.label} className="animate-pop rounded-2xl bg-zinc-50 p-3.5 dark:bg-white/5" style={{ animationDelay: `${i * 70}ms` }}>
                <p className="text-xs text-zinc-500">{s.label}</p>
                <p className="mt-1 font-extrabold">{s.value}</p>
                {s.trend && (
                  <p className={cn("mt-0.5 flex items-center gap-1 text-xs font-bold", s.trend.startsWith("-") ? "text-rose-600" : "text-brand-600")}>
                    {s.trend.startsWith("-") ? <LuTrendingDown /> : <LuTrendingUp />} {s.trend} vs last week
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
        <div className="space-y-3">
          {report.insights.map((ins, i) => (
            <div key={ins.title} className="card relative animate-fade-up overflow-hidden p-5 pl-6" style={{ animationDelay: `${i * 90}ms` }}>
              <span className={cn("absolute inset-y-0 left-0 w-1.5", ins.impact === "high" ? "bg-rose-500" : ins.impact === "medium" ? "bg-amber-400" : "bg-sky-400")} />
              <div className="flex items-start gap-4">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-zinc-100 text-lg text-zinc-600 dark:bg-white/10 dark:text-zinc-300">{kindIcon(ins.kind)}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-bold">{ins.title}</p>
                    <Badge tone={ins.impact === "high" ? "rose" : ins.impact === "medium" ? "amber" : "sky"}>{ins.impact} impact</Badge>
                  </div>
                  <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{ins.detail}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
        <Card className="h-fit animate-fade-up p-5 [animation-delay:200ms]">
          <p className="font-bold">Do this week</p>
          <ul className="mt-4 space-y-2">
            {report.actions.map((a) => (
              <li key={a}>
                <button onClick={() => setDone({ ...done, [a]: !done[a] })} className="flex w-full items-start gap-3 rounded-xl p-2 text-left text-sm transition hover:bg-zinc-50 dark:hover:bg-white/5">
                  <span
                    className={cn(
                      "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-md border-2 transition-all duration-300",
                      done[a] ? "scale-110 border-brand-500 bg-brand-500 text-white" : "border-zinc-300 dark:border-zinc-600",
                    )}
                  >
                    {done[a] && <LuCheck className="size-3.5" />}
                  </span>
                  <span className={cn("transition", done[a] && "text-zinc-400 line-through")}>{a}</span>
                </button>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}

function Analysing() {
  const [step] = useState(() => Date.now());
  const lines = ["Reading your orders", "Finding best sellers", "Checking stock", "Writing your plan"];
  return (
    <Card className="p-10 text-center">
      <div className="mx-auto flex h-20 w-48 items-end justify-center gap-2">
        {[40, 70, 55, 90, 65, 100].map((h, i) => (
          <span key={i} className="w-5 origin-bottom animate-pulse rounded-t-lg bg-gradient-to-t from-brand-600 to-brand-300" style={{ height: `${h}%`, animationDelay: `${i * 120}ms` }} />
        ))}
      </div>
      <div className="mt-6 space-y-1.5" key={step}>
        {lines.map((l, i) => (
          <p key={l} className="animate-fade-up text-sm font-medium text-zinc-500" style={{ animationDelay: `${i * 450}ms` }}>
            {l}...
          </p>
        ))}
      </div>
    </Card>
  );
}

// ── Broadcast writer ──────────────────────────────────────────────────────────

const GOALS = ["Weekend special", "New arrivals this week", "Back in stock", "Holiday sale: 10% off", "Lunch is ready!"];

function Broadcast({ onUsed }: { onUsed: () => void }) {
  const toast = useToast();
  const fail = useAiError();
  const products = useLoad(() => api.get<Product[]>("/api/products"));
  const [goal, setGoal] = useState(GOALS[0]!);
  const [tone, setTone] = useState("exciting");
  const [language, setLanguage] = useState("English");
  const [picked, setPicked] = useState<number[]>([]);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<BroadcastResult | null>(null);
  const [view, setView] = useState<"message" | "short">("message");

  async function run() {
    setBusy(true);
    try {
      setResult(await api.post<BroadcastResult>("/api/ai/broadcast", { goal, tone, language, productIds: picked }));
      onUsed();
    } catch (e) {
      fail(e);
    } finally {
      setBusy(false);
    }
  }

  const text = result ? (view === "message" ? result.message : result.short) : "";
  const available = (products.data ?? []).filter((p) => p.available);

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Card className="space-y-5 p-5 sm:p-6">
        <div>
          <h2 className="font-bold">Write a broadcast</h2>
          <p className="text-sm text-zinc-500">For WhatsApp broadcast lists, groups and Status.</p>
        </div>
        <div>
          <Input label="What's it about?" value={goal} onChange={(e) => setGoal(e.target.value)} maxLength={300} />
          <div className="mt-2 flex flex-wrap gap-1.5">
            {GOALS.map((g) => (
              <button key={g} onClick={() => setGoal(g)} className={cn("rounded-full px-3 py-1 text-xs font-semibold transition", goal === g ? "bg-brand-600 text-white" : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-white/10 dark:text-zinc-300")}>
                {g}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Select label="Tone" value={tone} onChange={(e) => setTone(e.target.value)} options={TONES} />
          <Select label="Language" value={language} onChange={(e) => setLanguage(e.target.value)} options={LANGUAGES} />
        </div>
        <div>
          <p className="mb-2 text-sm font-semibold">Products to include {picked.length === 0 && <span className="font-normal text-zinc-400">(we'll pick your best ones)</span>}</p>
          <div className="flex max-h-56 flex-wrap gap-2 overflow-y-auto">
            {available.map((p) => {
              const on = picked.includes(p.id);
              return (
                <button
                  key={p.id}
                  onClick={() => setPicked(on ? picked.filter((x) => x !== p.id) : picked.length < 10 ? [...picked, p.id] : picked)}
                  className={cn(
                    "group flex items-center gap-2 rounded-xl border py-1 pr-3 pl-1 text-sm font-medium transition-all",
                    on ? "border-brand-500 bg-brand-50 text-brand-800 dark:bg-brand-500/15 dark:text-brand-200" : "border-zinc-200 hover:border-zinc-300 dark:border-white/10",
                  )}
                >
                  <span className="size-7 overflow-hidden rounded-lg">
                    <ProductImage src={p.imageUrl} name={p.name} category={p.category} className="text-xs [&_span]:text-base" />
                  </span>
                  {p.name}
                  {on && <LuCheck className="text-brand-600" />}
                </button>
              );
            })}
          </div>
        </div>
        <Button onClick={run} loading={busy} className="w-full" icon={<LuSparkles />}>
          Write my broadcast
        </Button>
      </Card>

      <div className="relative min-h-[420px] overflow-hidden rounded-2xl bg-[#e9e2d6] p-5 dark:bg-[#0b141a]">
        <div className="absolute inset-0 opacity-[0.06] [background-image:radial-gradient(#000_1px,transparent_1px)] [background-size:16px_16px] dark:opacity-[0.15] dark:[background-image:radial-gradient(#fff_1px,transparent_1px)]" />
        <div className="relative mb-4 flex items-center justify-between">
          <Segmented
            value={view}
            onChange={setView}
            options={[
              { value: "message", label: "Broadcast" },
              { value: "short", label: "Status" },
            ]}
          />
          {result && <EngineBadge engine={result.engine} />}
        </div>
        {busy ? (
          <div className="relative w-fit rounded-2xl rounded-tl-sm bg-white px-4 py-3 shadow dark:bg-[#1f2c33]">
            <span className="flex gap-1 text-zinc-400">
              <span className="typing-dot" />
              <span className="typing-dot" />
              <span className="typing-dot" />
            </span>
          </div>
        ) : result ? (
          <div key={view + result.message.length} className="relative animate-pop">
            <div className="ml-auto max-w-md rounded-2xl rounded-tr-sm bg-[#d9fdd3] px-4 py-3 text-[15px] leading-relaxed whitespace-pre-line text-zinc-900 shadow dark:bg-[#005c4b] dark:text-white">
              {text}
              <span className="mt-1 block text-right text-[10px] text-zinc-500 dark:text-zinc-300">now ✓✓</span>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <Button size="sm" variant="secondary" icon={<LuCopy />} onClick={async () => (await copyText(text)) && toast("Copied")}>
                Copy
              </Button>
              <a href={`https://wa.me/?text=${encodeURIComponent(text)}`} target="_blank" rel="noreferrer" className="shine inline-flex h-9 items-center gap-1.5 rounded-xl bg-[#1fae53] px-3.5 text-sm font-semibold text-white">
                <FaWhatsapp /> Share on WhatsApp
              </a>
            </div>
          </div>
        ) : (
          <div className="relative flex h-full flex-col items-center justify-center py-20 text-center text-zinc-500">
            <LuBot className="size-10 animate-float" />
            <p className="mt-3 text-sm">Your message will appear here, ready to send.</p>
          </div>
        )}
        {products.data && available.length === 0 && <p className="relative mt-4 text-center text-xs text-zinc-500">Tip: add products first so the message can show them with prices like {money(45)}.</p>}
      </div>
    </div>
  );
}
