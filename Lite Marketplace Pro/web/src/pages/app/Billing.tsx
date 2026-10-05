import { useEffect, useState } from "react";
import { LuCheck, LuCreditCard, LuCrown, LuLock, LuSmartphone, LuSparkles, LuZap } from "react-icons/lu";
import { Badge, Button, Card, ErrorBox, PageHeader, Progress, Skeleton } from "../../components/ui";
import { api, errorMessage } from "../../lib/api";
import { cn } from "../../lib/cn";
import { money, shortDate } from "../../lib/format";
import { useLoad, usePageTitle } from "../../lib/hooks";
import { navigate, useLocation } from "../../lib/router";
import { useToast } from "../../lib/toast";
import type { Billing as BillingData, CheckoutStart } from "../../lib/types";

export default function Billing() {
  usePageTitle("Plan & billing");
  const toast = useToast();
  const { query } = useLocation();
  const { data, error, loading, reload } = useLoad(() => api.get<BillingData>("/api/billing"));
  const [plan, setPlan] = useState<string | null>(null);
  const [provider, setProvider] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (query.get("cancelled")) {
      toast("Payment cancelled. No money was taken.", "info");
      navigate("/app/billing", { replace: true });
    }
  }, [query, toast]);

  useEffect(() => {
    if (data) {
      setPlan((p) => p ?? data.plans.find((x) => x.popular)?.code ?? data.plans[0]?.code ?? null);
      setProvider((p) => p ?? data.providers[0]?.id ?? null);
    }
  }, [data]);

  if (error) return <ErrorBox message={error} onRetry={reload} />;
  if (loading || !data) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-40" />
        <Skeleton className="h-72" />
      </div>
    );
  }

  const current = data.current;
  const chosen = data.plans.find((p) => p.code === plan);

  async function pay() {
    if (!plan || !provider) return;
    setBusy(true);
    try {
      const r = await api.post<CheckoutStart>("/api/billing/checkout", { planCode: plan, provider });
      window.location.href = r.checkoutUrl;
    } catch (e) {
      toast(errorMessage(e), "error");
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Plan & billing" subtitle="Upgrade any time. Days you buy are added on top of the days you have left." />

      <Card className={cn("relative animate-fade-up overflow-hidden p-6 sm:p-8", current.premium && "border-sun-300/60")}>
        {current.premium && <div className="absolute -top-20 -right-20 size-64 animate-blob rounded-full bg-sun-300/25 blur-3xl" />}
        <div className="relative grid gap-6 sm:grid-cols-[1fr_auto] sm:items-center">
          <div>
            <p className="text-sm font-semibold text-zinc-500">Current plan</p>
            <p className="mt-1 flex items-center gap-2 text-3xl font-extrabold">
              {current.premium && <LuCrown className="text-sun-500" />} {current.name}
            </p>
            {current.premium ? (
              <p className="mt-1 text-sm text-zinc-500">
                Active until <b>{shortDate(current.expiresAt)}</b> · {current.daysLeft} days left
              </p>
            ) : (
              <p className="mt-1 text-sm text-zinc-500">Up to {current.productLimit} products and {current.aiCreditsLimit} AI credits a month.</p>
            )}
          </div>
          <div className="grid w-full gap-3 sm:w-64">
            <div>
              <div className="mb-1 flex justify-between text-xs">
                <span className="text-zinc-500">AI credits</span>
                <span className="font-semibold">
                  {current.aiCreditsUsed}/{current.aiCreditsLimit}
                </span>
              </div>
              <Progress value={(current.aiCreditsUsed / Math.max(1, current.aiCreditsLimit)) * 100} tone="amber" />
            </div>
            {current.premium && (
              <div>
                <div className="mb-1 flex justify-between text-xs">
                  <span className="text-zinc-500">Time left</span>
                  <span className="font-semibold">{current.daysLeft} days</span>
                </div>
                <Progress value={Math.min(100, (current.daysLeft / 30) * 100)} />
              </div>
            )}
          </div>
        </div>
      </Card>

      <div>
        <h2 className="mb-3 font-bold">{current.premium ? "Add more time" : "Choose a plan"}</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {data.plans.map((p, i) => (
            <button
              key={p.code}
              onClick={() => setPlan(p.code)}
              className={cn(
                "relative animate-fade-up rounded-2xl border-2 p-5 text-left transition-all duration-300 hover:-translate-y-0.5",
                plan === p.code ? "border-brand-500 bg-brand-50/60 shadow-lg shadow-brand-600/10 dark:bg-brand-500/10" : "border-zinc-200 bg-white hover:border-zinc-300 dark:border-white/10 dark:bg-white/5",
              )}
              style={{ animationDelay: `${i * 70}ms` }}
            >
              {p.popular && (
                <Badge tone="amber" className="absolute -top-2.5 right-4 bg-sun-300! text-zinc-900!">
                  Most popular
                </Badge>
              )}
              <div className="flex items-center justify-between">
                <p className="font-bold">{p.name}</p>
                <span className={cn("flex size-5 items-center justify-center rounded-full border-2 transition-all", plan === p.code ? "scale-110 border-brand-500 bg-brand-500 text-white" : "border-zinc-300 dark:border-zinc-600")}>
                  {plan === p.code && <LuCheck className="size-3" />}
                </span>
              </div>
              <p className="mt-3 text-2xl font-black">{money(p.price, data.currency)}</p>
              <p className="text-xs text-zinc-500">
                {p.days} days · about {money((p.price / p.days) * 30, data.currency)}/month
              </p>
            </button>
          ))}
        </div>
      </div>

      <Card className="animate-fade-up p-5 sm:p-6">
        <h2 className="font-bold">Pay with</h2>
        {data.providers.length === 0 ? (
          <p className="mt-2 text-sm text-zinc-500">Online payments aren't switched on yet. Contact the admin to activate your plan by Mobile Money or cash.</p>
        ) : (
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {data.providers.map((pr) => (
              <button
                key={pr.id}
                onClick={() => setProvider(pr.id)}
                className={cn(
                  "flex items-center gap-3 rounded-2xl border-2 p-4 text-left transition-all",
                  provider === pr.id ? "border-brand-500 bg-brand-50/60 dark:bg-brand-500/10" : "border-zinc-200 hover:border-zinc-300 dark:border-white/10",
                )}
              >
                <span className={cn("flex size-10 items-center justify-center rounded-xl text-white", pr.id === "demo" ? "bg-amber-500" : "bg-zinc-900 dark:bg-white dark:text-zinc-900")}>
                  {pr.id === "stripe" ? <LuCreditCard /> : pr.id === "demo" ? <LuZap /> : <LuSmartphone />}
                </span>
                <span className="text-sm font-semibold">{pr.label}</span>
              </button>
            ))}
          </div>
        )}
        <div className="mt-6 flex flex-col items-center justify-between gap-4 border-t border-zinc-100 pt-5 sm:flex-row dark:border-white/10">
          <p className="flex items-center gap-2 text-xs text-zinc-500">
            <LuLock /> You'll pay on the provider's secure page. We never see your card or MoMo PIN.
          </p>
          <Button size="lg" onClick={pay} loading={busy} disabled={!chosen || !provider} icon={<LuSparkles />} className="w-full sm:w-auto">
            {chosen ? `Pay ${money(chosen.price, data.currency)}` : "Choose a plan"}
          </Button>
        </div>
      </Card>

      {data.history.length > 0 && (
        <Card className="animate-fade-up overflow-hidden">
          <h2 className="px-5 pt-5 font-bold sm:px-6">Payment history</h2>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-y border-zinc-100 bg-zinc-50/80 text-left text-xs font-bold tracking-wide text-zinc-400 uppercase dark:border-white/5 dark:bg-white/[0.02]">
                  <th className="px-5 py-2.5 sm:px-6">Date</th>
                  <th className="px-3 py-2.5">Plan</th>
                  <th className="px-3 py-2.5">Paid with</th>
                  <th className="px-3 py-2.5 text-right">Amount</th>
                  <th className="px-5 py-2.5 text-right sm:px-6">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-white/5">
                {data.history.map((h) => (
                  <tr key={h.reference}>
                    <td className="px-5 py-3 whitespace-nowrap sm:px-6">{shortDate(h.createdAt)}</td>
                    <td className="px-3 py-3">{h.planName}</td>
                    <td className="px-3 py-3 capitalize">{h.provider}</td>
                    <td className="px-3 py-3 text-right font-semibold tabular-nums">{money(h.amount, h.currency)}</td>
                    <td className="px-5 py-3 text-right sm:px-6">
                      <Badge tone={h.status === "SUCCESS" ? "green" : h.status === "PENDING" ? "amber" : "rose"}>{h.status === "SUCCESS" ? "Paid" : h.status === "PENDING" ? "Pending" : "Failed"}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
