import { useMemo, useState, type ReactNode } from "react";
import { FaWhatsapp } from "react-icons/fa6";
import {
  LuArrowRight,
  LuCheck,
  LuCopy,
  LuCrown,
  LuExternalLink,
  LuPackage,
  LuPlus,
  LuReceipt,
  LuShoppingBag,
  LuSparkles,
  LuTrendingUp,
  LuWallet,
  LuX,
} from "react-icons/lu";
import { BarChart, MeterRow } from "../../components/BarChart";
import { StatusBadge } from "../../components/bits";
import { CountUp } from "../../components/motion";
import { Badge, Button, ButtonLink, Card, ErrorBox, Progress, Segmented, Skeleton } from "../../components/ui";
import { api } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import { cn } from "../../lib/cn";
import { dayLabel, dayMonth, money, timeAgo } from "../../lib/format";
import { copyText, useLoad, usePageTitle } from "../../lib/hooks";
import { Link, navigate, useLocation } from "../../lib/router";
import { useToast } from "../../lib/toast";
import type { Dashboard } from "../../lib/types";

export default function Overview() {
  usePageTitle("Dashboard");
  const { me } = useAuth();
  const { query } = useLocation();
  const { data, error, loading, reload } = useLoad(() => api.get<Dashboard>("/api/dashboard"));
  const [range, setRange] = useState<"7" | "30">("7");
  const [welcome, setWelcome] = useState(query.get("welcome") === "1");

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  const bars = useMemo(() => {
    if (!data) return [];
    const points = range === "7" ? data.last7 : data.last30;
    return points.map((p) => ({
      label: range === "7" ? dayLabel(p.date) : dayMonth(p.date),
      value: Number(p.total),
      extra: `${p.orders} order${p.orders === 1 ? "" : "s"} · ${dayMonth(p.date)}`,
    }));
  }, [data, range]);

  if (error) return <ErrorBox message={error} onRetry={reload} />;

  const cur = data?.currency ?? me?.store?.currency ?? "GHS";
  const weekTotal = data ? data.last7.reduce((n, p) => n + Number(p.total), 0) : 0;

  return (
    <div className="space-y-6">
      {welcome && <Welcome onClose={() => setWelcome(false)} />}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="animate-fade-up">
          <p className="text-sm font-semibold text-zinc-500 dark:text-zinc-400">{greeting} 👋</p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight sm:text-3xl">{me?.store?.name}</h1>
        </div>
        <div className="flex animate-fade-up gap-2 [animation-delay:80ms]">
          <ButtonLink to="/app/products?new=1" icon={<LuPlus />}>
            Add product
          </ButtonLink>
          <ButtonLink to="/app/assistant" variant="secondary" icon={<LuSparkles className="text-violet-500" />}>
            Ask AI
          </ButtonLink>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <Kpi loading={loading} icon={<LuWallet />} tone="green" label="Total sales" value={data?.revenue ?? 0} money={cur} sub={data ? `${money(data.revenue30, cur)} in 30 days` : ""} delay={0} />
        <Kpi loading={loading} icon={<LuTrendingUp />} tone="amber" label="This week" value={weekTotal} money={cur} sub="paid & delivered" delay={60} />
        <Kpi loading={loading} icon={<LuReceipt />} tone="sky" label="Orders" value={data?.totalOrders ?? 0} sub={data ? `${data.newOrders} new, ${data.paidOrders} paid` : ""} delay={120} />
        <Kpi loading={loading} icon={<LuShoppingBag />} tone="violet" label="Average order" value={data?.averageOrder ?? 0} money={cur} sub={data ? `${data.productCount} products` : ""} delay={180} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Chart */}
        <Card className="animate-fade-up p-5 [animation-delay:150ms] sm:p-6 lg:col-span-2">
          <div className="mb-6 flex items-center justify-between gap-4">
            <div>
              <h2 className="font-bold">Sales</h2>
              <p className="text-sm text-zinc-500">Paid and delivered orders</p>
            </div>
            <Segmented value={range} onChange={setRange} options={[{ value: "7", label: "7 days" }, { value: "30", label: "30 days" }]} />
          </div>
          {loading ? <Skeleton className="h-[220px] w-full" /> : <BarChart key={range} data={bars} format={(v) => money(v, cur)} />}
        </Card>

        {/* Share */}
        {me?.store && <ShareCard url={data?.shopUrl ?? me.store.shopUrl} name={me.store.name} />}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="animate-fade-up p-5 [animation-delay:200ms] sm:p-6 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-bold">Latest orders</h2>
            <Link to="/app/orders" className="flex items-center gap-1 text-sm font-semibold text-brand-600 hover:underline dark:text-brand-400">
              All orders <LuArrowRight />
            </Link>
          </div>
          {loading ? (
            <div className="space-y-3">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-14" />
              ))}
            </div>
          ) : data && data.recentOrders.length ? (
            <ul className="-mx-2 divide-y divide-zinc-100 dark:divide-white/5">
              {data.recentOrders.map((o, i) => (
                <li key={o.id} className="animate-fade-up" style={{ animationDelay: `${i * 50}ms` }}>
                  <button onClick={() => navigate(`/app/orders?open=${o.id}`)} className="flex w-full items-center gap-3 rounded-xl px-2 py-3 text-left transition hover:bg-zinc-50 dark:hover:bg-white/5">
                    <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-xl text-white", o.channel === "WHATSAPP" ? "bg-[#1fae53]" : o.channel === "ONLINE" ? "bg-brand-600" : "bg-zinc-500")}>
                      {o.channel === "WHATSAPP" ? <FaWhatsapp /> : o.channel === "ONLINE" ? <LuWallet /> : <LuReceipt />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold">{o.customerName}</span>
                      <span className="block truncate text-xs text-zinc-500">
                        {o.number} · {timeAgo(o.createdAt)}
                      </span>
                    </span>
                    <span className="text-right">
                      <span className="block text-sm font-bold tabular-nums">{money(o.total, o.currency)}</span>
                      <StatusBadge status={o.status} />
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="py-10 text-center text-sm text-zinc-500">No orders yet. Share your shop link to get the first one!</p>
          )}
        </Card>

        <div className="space-y-4">
          <Card className="animate-fade-up p-5 [animation-delay:250ms] sm:p-6">
            <h2 className="mb-4 font-bold">Best sellers · 30 days</h2>
            {loading ? (
              <Skeleton className="h-28" />
            ) : data && data.topProducts.length ? (
              <div className="space-y-4">
                {data.topProducts.map((p) => (
                  <MeterRow key={p.name} label={p.name} value={Number(p.revenue)} max={Number(data.topProducts[0]!.revenue)} right={money(p.revenue, cur)} />
                ))}
              </div>
            ) : (
              <p className="text-sm text-zinc-500">Your top products will show up here.</p>
            )}
          </Card>
          {data && <PlanCard data={data} />}
        </div>
      </div>
    </div>
  );
}

function Kpi(props: { loading: boolean; icon: ReactNode; tone: "green" | "amber" | "sky" | "violet"; label: string; value: number; money?: string; sub: string; delay: number }) {
  const tones = {
    green: "from-brand-50 to-brand-100 text-brand-700 dark:from-brand-500/20 dark:to-brand-500/5 dark:text-brand-300",
    amber: "from-amber-50 to-amber-100 text-amber-700 dark:from-amber-500/20 dark:to-amber-500/5 dark:text-amber-300",
    sky: "from-sky-50 to-sky-100 text-sky-700 dark:from-sky-500/20 dark:to-sky-500/5 dark:text-sky-300",
    violet: "from-violet-50 to-violet-100 text-violet-700 dark:from-violet-500/20 dark:to-violet-500/5 dark:text-violet-300",
  };
  return (
    <div className="animate-fade-up" style={{ animationDelay: `${props.delay}ms` }}>
    <Card className="group h-full p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg sm:p-5">
      <div>
        <span className={cn("flex size-10 items-center justify-center rounded-xl bg-gradient-to-br text-lg transition-transform duration-500 group-hover:scale-110 group-hover:rotate-6", tones[props.tone])}>{props.icon}</span>
        <p className="mt-4 text-xs font-semibold text-zinc-500 sm:text-sm dark:text-zinc-400">{props.label}</p>
        {props.loading ? (
          <Skeleton className="mt-2 h-7 w-24" />
        ) : (
          <p className="mt-1 text-lg font-extrabold tracking-tight sm:text-2xl">
            <CountUp value={Number(props.value)} format={(v) => (props.money ? money(v, props.money) : Math.round(v).toLocaleString())} />
          </p>
        )}
        <p className="mt-1 truncate text-xs text-zinc-400">{props.sub}</p>
      </div>
    </Card>
    </div>
  );
}

function ShareCard({ url, name }: { url: string; name: string }) {
  const toast = useToast();
  const [copied, setCopied] = useState(false);
  const message = `Shop with ${name} online 🛍️ Browse, order on WhatsApp or pay with MoMo: ${url}`;
  return (
    <Card className="relative animate-fade-up overflow-hidden p-5 [animation-delay:180ms] sm:p-6">
      <div className="absolute -top-16 -right-16 size-48 animate-blob rounded-full bg-brand-300/30 blur-2xl dark:bg-brand-500/20" />
      <div className="relative">
        <Badge tone="green">
          <span className="size-1.5 animate-pulse rounded-full bg-current" /> Your shop is live
        </Badge>
        <h2 className="mt-3 font-bold">Share your link</h2>
        <p className="text-sm text-zinc-500">Customers can order from it right now.</p>
        <div className="mt-4 flex items-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50 p-1.5 pl-3 dark:border-white/10 dark:bg-white/5">
          <span className="min-w-0 flex-1 truncate font-mono text-xs">{url.replace(/^https?:\/\//, "")}</span>
          <button
            onClick={async () => {
              if (await copyText(url)) {
                setCopied(true);
                toast("Link copied");
                localStorage.setItem("lm-shared", "1");
                setTimeout(() => setCopied(false), 1800);
              }
            }}
            className="flex size-8 items-center justify-center rounded-lg bg-white shadow-sm transition hover:scale-105 dark:bg-zinc-800"
            aria-label="Copy link"
          >
            {copied ? <LuCheck className="text-brand-600" /> : <LuCopy />}
          </button>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <a
            href={`https://wa.me/?text=${encodeURIComponent(message)}`}
            target="_blank"
            rel="noreferrer"
            onClick={() => localStorage.setItem("lm-shared", "1")}
            className="shine flex h-10 items-center justify-center gap-2 rounded-xl bg-[#1fae53] text-sm font-semibold text-white"
          >
            <FaWhatsapp /> Share
          </a>
          <a href={url} target="_blank" rel="noreferrer" className="flex h-10 items-center justify-center gap-2 rounded-xl border border-zinc-200 text-sm font-semibold hover:bg-zinc-50 dark:border-white/10 dark:hover:bg-white/5">
            <LuExternalLink /> Open
          </a>
        </div>
      </div>
    </Card>
  );
}

function PlanCard({ data }: { data: Dashboard }) {
  const p = data.plan;
  return (
    <Card className="animate-fade-up p-5 [animation-delay:300ms] sm:p-6">
      <div className="flex items-center justify-between">
        <h2 className="font-bold">Your plan</h2>
        <Badge tone={p.premium ? "amber" : "zinc"}>
          {p.premium && <LuCrown />} {p.name}
        </Badge>
      </div>
      <div className="mt-4 space-y-4 text-sm">
        <div>
          <div className="mb-1.5 flex justify-between">
            <span className="text-zinc-500">Products</span>
            <span className="font-semibold">
              {data.productCount}
              {p.productLimit !== null ? ` / ${p.productLimit}` : " · unlimited"}
            </span>
          </div>
          <Progress value={p.productLimit ? (data.productCount / p.productLimit) * 100 : 100} tone={p.productLimit && data.productCount >= p.productLimit ? "rose" : "brand"} />
        </div>
        <div>
          <div className="mb-1.5 flex justify-between">
            <span className="text-zinc-500">AI credits this month</span>
            <span className="font-semibold">
              {p.aiCreditsUsed} / {p.aiCreditsLimit}
            </span>
          </div>
          <Progress value={(p.aiCreditsUsed / Math.max(1, p.aiCreditsLimit)) * 100} tone="amber" />
        </div>
      </div>
      {!p.premium ? (
        <ButtonLink to="/app/billing" className="mt-5 w-full" icon={<LuCrown />}>
          Upgrade for unlimited
        </ButtonLink>
      ) : (
        <p className="mt-4 text-xs text-zinc-500">{p.daysLeft} days left on your plan.</p>
      )}
    </Card>
  );
}

function Welcome({ onClose }: { onClose: () => void }) {
  const { me } = useAuth();
  const steps = [
    { done: true, label: "Create your shop" },
    { done: false, label: "Add your first product", to: "/app/products?new=1" },
    { done: false, label: "Add your logo and colour", to: "/app/shop" },
    { done: false, label: "Share your link on WhatsApp Status", to: "/app/shop" },
  ];
  return (
    <div className="relative animate-scale-in overflow-hidden rounded-3xl bg-gradient-to-br from-brand-600 via-brand-700 to-brand-900 p-6 text-white shadow-xl shadow-brand-900/20 sm:p-8">
      {Array.from({ length: 9 }).map((_, i) => (
        <span
          key={i}
          className="pointer-events-none absolute animate-[pop_0.8s_var(--ease-spring)_both] text-xl"
          style={{ left: `${(i * 37) % 100}%`, top: `${(i * 53) % 90}%`, animationDelay: `${i * 70}ms`, opacity: 0.22 }}
        >
          {["🎉", "✨", "🛍️", "💚"][i % 4]}
        </span>
      ))}
      <button onClick={onClose} className="absolute top-4 right-4 rounded-lg p-1.5 text-white/70 hover:bg-white/10 hover:text-white" aria-label="Close">
        <LuX />
      </button>
      <div className="relative grid gap-6 lg:grid-cols-2 lg:items-center">
        <div>
          <p className="text-sm font-semibold text-brand-100">Welcome aboard!</p>
          <h2 className="mt-1 text-2xl font-extrabold sm:text-3xl">{me?.store?.name} is live 🎉</h2>
          <p className="mt-2 text-brand-100">Finish these steps and you're ready for your first order.</p>
        </div>
        <ul className="space-y-2">
          {steps.map((s, i) => (
            <li key={s.label} className="animate-fade-up" style={{ animationDelay: `${200 + i * 90}ms` }}>
              {s.to ? (
                <Link to={s.to} className="flex items-center gap-3 rounded-xl bg-white/10 px-4 py-3 text-sm font-semibold backdrop-blur transition hover:bg-white/20">
                  <span className="flex size-6 items-center justify-center rounded-full border-2 border-white/50 text-xs">{i + 1}</span>
                  {s.label}
                  <LuArrowRight className="ml-auto" />
                </Link>
              ) : (
                <div className="flex items-center gap-3 rounded-xl bg-white/10 px-4 py-3 text-sm font-semibold text-white/70 line-through">
                  <span className="flex size-6 items-center justify-center rounded-full bg-sun-400 text-zinc-900">
                    <LuCheck />
                  </span>
                  {s.label}
                </div>
              )}
            </li>
          ))}
        </ul>
      </div>
      <Button variant="dark" size="sm" className="relative mt-6 bg-white! text-zinc-900!" onClick={() => navigate("/app/products?new=1")} icon={<LuPackage />}>
        Add my first product
      </Button>
    </div>
  );
}
