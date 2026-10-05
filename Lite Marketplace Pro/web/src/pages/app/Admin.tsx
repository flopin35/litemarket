import { useState } from "react";
import { FaWhatsapp } from "react-icons/fa6";
import {
  LuBan,
  LuBot,
  LuCircleCheck,
  LuCircleX,
  LuCrown,
  LuExternalLink,
  LuHandCoins,
  LuMail,
  LuPackage,
  LuPercent,
  LuReceipt,
  LuSearch,
  LuSplit,
  LuStore,
  LuUsers,
  LuWallet,
  LuZap,
} from "react-icons/lu";
import { Avatar } from "../../components/bits";
import { CountUp } from "../../components/motion";
import { Modal } from "../../components/Overlay";
import { Badge, Button, Card, ErrorBox, Input, PageHeader, Segmented, Select, Skeleton } from "../../components/ui";
import { api, errorMessage } from "../../lib/api";
import { cn } from "../../lib/cn";
import { money, prettyPhone, shortDate, timeAgo, whatsappLink } from "../../lib/format";
import { useDebounced, useLoad, usePageTitle } from "../../lib/hooks";
import { useToast } from "../../lib/toast";
import type { AdminOverview, AdminPayment, PayoutRow, PublicConfig, SellerRow } from "../../lib/types";

type Tab = "overview" | "sellers" | "payments" | "payouts";

export default function Admin() {
  usePageTitle("Admin");
  const [tab, setTab] = useState<Tab>("overview");
  return (
    <div>
      <PageHeader title="Admin" subtitle="Run the whole marketplace: sellers, plans, payments and payouts." />
      <Segmented
        value={tab}
        onChange={setTab}
        className="mb-6 w-full animate-fade-up overflow-x-auto sm:w-fit"
        options={[
          { value: "overview", label: "Overview" },
          { value: "sellers", label: "Sellers" },
          { value: "payments", label: "Payments" },
          { value: "payouts", label: "Payouts" },
        ]}
      />
      <div key={tab} className="animate-fade-up">
        {tab === "overview" && <OverviewTab />}
        {tab === "sellers" && <SellersTab />}
        {tab === "payments" && <PaymentsTab />}
        {tab === "payouts" && <PayoutsTab />}
      </div>
    </div>
  );
}

function OverviewTab() {
  const { data, error, loading, reload } = useLoad(() => api.get<AdminOverview>("/api/admin/overview"));
  if (error) return <ErrorBox message={error} onRetry={reload} />;
  if (loading || !data) return <Skeleton className="h-96" />;
  const cur = data.currency;
  const kpis = [
    { icon: <LuUsers />, label: "Accounts", value: data.users },
    { icon: <LuStore />, label: "Shops", value: data.stores },
    { icon: <LuCrown />, label: "Paying shops", value: data.payingStores },
    { icon: <LuPackage />, label: "Products", value: data.products },
    { icon: <LuReceipt />, label: "Orders", value: data.orders },
    { icon: <LuWallet />, label: "Plan revenue", value: data.subscriptionRevenue, money: true },
    { icon: <LuHandCoins />, label: "Paid online by customers", value: data.orderVolume, money: true },
    { icon: <LuSplit />, label: "Owed to sellers", value: data.owedToSellers, money: true },
  ];
  const checks = [
    { ok: data.providers.some((p) => p.id !== "demo"), icon: <LuWallet />, label: "Payment gateways", detail: data.providers.length ? data.providers.map((p) => p.id).join(", ") : "none: add keys in .env" },
    { ok: data.aiOnline, icon: <LuBot />, label: "AI service", detail: data.aiOnline ? "online" : "offline: start ai-service" },
    { ok: data.emailEnabled, icon: <LuMail />, label: "Email", detail: data.emailEnabled ? "SMTP configured" : "not set: emails go to the log" },
    { ok: !data.demoPayments, icon: <LuZap />, label: "Demo payments", detail: data.demoPayments ? "ON: turn off before going live" : "off" },
    { ok: true, icon: <LuPercent />, label: "Commission on orders", detail: `${data.commissionPercent}%` },
  ];
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {kpis.map((k, i) => (
          <Card key={k.label} className="animate-fade-up p-4 sm:p-5">
            <div style={{ animationDelay: `${i * 50}ms` }}>
              <span className="flex size-9 items-center justify-center rounded-xl bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300">{k.icon}</span>
              <p className="mt-3 text-xs font-semibold text-zinc-500">{k.label}</p>
              <p className="mt-1 text-xl font-extrabold">
                <CountUp value={Number(k.value)} format={(v) => (k.money ? money(v, cur) : Math.round(v).toLocaleString())} />
              </p>
            </div>
          </Card>
        ))}
      </div>
      <Card className="p-5 sm:p-6">
        <h2 className="font-bold">System status</h2>
        <ul className="mt-4 divide-y divide-zinc-100 dark:divide-white/5">
          {checks.map((c) => (
            <li key={c.label} className="flex items-center gap-3 py-3">
              <span className="text-lg text-zinc-400">{c.icon}</span>
              <span className="flex-1 text-sm font-semibold">{c.label}</span>
              <span className="text-right text-sm text-zinc-500">{c.detail}</span>
              {c.ok ? <LuCircleCheck className="text-brand-500" /> : <LuCircleX className="text-amber-500" />}
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

function SellersTab() {
  const toast = useToast();
  const [q, setQ] = useState("");
  const query = useDebounced(q, 300);
  const { data, error, loading, reload, setData } = useLoad(() => api.get<SellerRow[]>(`/api/admin/sellers?q=${encodeURIComponent(query)}`), [query]);
  const config = useLoad(() => api.get<PublicConfig>("/api/config"));
  const [planFor, setPlanFor] = useState<SellerRow | null>(null);
  const [splitFor, setSplitFor] = useState<SellerRow | null>(null);

  function replace(row: SellerRow) {
    setData((data ?? []).map((r) => (r.storeId === row.storeId ? row : r)));
  }

  async function toggleStatus(r: SellerRow) {
    try {
      replace(await api.post<SellerRow>(`/api/admin/sellers/${r.storeId}/status`, { status: r.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE" }));
      toast(r.status === "ACTIVE" ? `${r.storeName} suspended` : `${r.storeName} is active again`);
    } catch (e) {
      toast(errorMessage(e), "error");
    }
  }

  return (
    <div>
      <div className="relative mb-4 sm:max-w-sm">
        <LuSearch className="absolute top-1/2 left-3.5 -translate-y-1/2 text-zinc-400" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search shop, email or phone"
          className="h-10 w-full rounded-xl border border-zinc-200 bg-white pr-3 pl-10 text-sm outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/15 dark:border-white/10 dark:bg-white/5"
        />
      </div>
      {error ? (
        <ErrorBox message={error} onRetry={reload} />
      ) : loading && !data ? (
        <Skeleton className="h-80" />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-sm">
              <thead>
                <tr className="border-b border-zinc-100 bg-zinc-50/80 text-left text-xs font-bold tracking-wide text-zinc-400 uppercase dark:border-white/5 dark:bg-white/[0.02]">
                  <th className="px-5 py-3">Shop</th>
                  <th className="px-3 py-3">Owner</th>
                  <th className="px-3 py-3">Plan</th>
                  <th className="px-3 py-3 text-center">Products</th>
                  <th className="px-3 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-white/5">
                {(data ?? []).map((r) => (
                  <tr key={r.storeId} className="transition hover:bg-zinc-50/70 dark:hover:bg-white/[0.02]">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar name={r.storeName} className="size-9 text-xs" />
                        <div>
                          <p className="font-semibold">{r.storeName}</p>
                          <a href={`/s/${r.slug}`} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs text-brand-600 hover:underline">
                            /s/{r.slug} <LuExternalLink className="size-3" />
                          </a>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <p>{r.email}</p>
                      <a href={whatsappLink(r.whatsapp)} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs text-zinc-500 hover:text-[#1fae53]">
                        <FaWhatsapp /> {prettyPhone(r.whatsapp)}
                      </a>
                    </td>
                    <td className="px-3 py-3">
                      <Badge tone={r.premium ? "amber" : "zinc"}>
                        {r.premium && <LuCrown />} {r.planName}
                      </Badge>
                      {r.planExpiresAt && <p className="mt-1 text-xs text-zinc-400">until {shortDate(r.planExpiresAt)}</p>}
                    </td>
                    <td className="px-3 py-3 text-center font-semibold">{r.products}</td>
                    <td className="px-3 py-3">
                      <Badge tone={r.status === "ACTIVE" ? "green" : "rose"}>{r.status === "ACTIVE" ? "Active" : "Suspended"}</Badge>
                      {r.role === "ADMIN" && (
                        <Badge tone="violet" className="ml-1">
                          Admin
                        </Badge>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex justify-end gap-1.5">
                        <Button size="sm" variant="secondary" icon={<LuCrown />} onClick={() => setPlanFor(r)}>
                          Plan
                        </Button>
                        <Button size="sm" variant="ghost" icon={<LuSplit />} onClick={() => setSplitFor(r)} title="Split payment accounts">
                          Split
                        </Button>
                        {r.role !== "ADMIN" && (
                          <Button size="sm" variant="ghost" className={r.status === "ACTIVE" ? "text-rose-600!" : "text-brand-600!"} icon={r.status === "ACTIVE" ? <LuBan /> : <LuCircleCheck />} onClick={() => toggleStatus(r)}>
                            {r.status === "ACTIVE" ? "Suspend" : "Activate"}
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {data && data.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-5 py-12 text-center text-zinc-500">
                      No sellers found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}
      <GivePlanModal row={planFor} plans={config.data?.plans ?? []} onClose={() => setPlanFor(null)} onDone={(r) => (replace(r), setPlanFor(null))} />
      <SplitModal row={splitFor} onClose={() => setSplitFor(null)} onDone={(r) => (replace(r), setSplitFor(null))} />
    </div>
  );
}

function GivePlanModal({ row, plans, onClose, onDone }: { row: SellerRow | null; plans: PublicConfig["plans"]; onClose: () => void; onDone: (r: SellerRow) => void }) {
  const toast = useToast();
  const [plan, setPlan] = useState("MONTHLY");
  const [busy, setBusy] = useState(false);
  async function give() {
    if (!row) return;
    setBusy(true);
    try {
      const r = await api.post<SellerRow>(`/api/admin/sellers/${row.storeId}/plan`, { planCode: plan });
      toast(`${row.storeName} now has the ${r.planName} plan`);
      onDone(r);
    } catch (e) {
      toast(errorMessage(e), "error");
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      open={!!row}
      onClose={onClose}
      title="Give a plan"
      size="sm"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={give} loading={busy}>
            Give plan
          </Button>
        </div>
      }
    >
      <p className="mb-4 text-sm text-zinc-500">For sellers who paid you by cash or Mobile Money directly. Days are added to any time they have left.</p>
      <Select
        label={`Plan for ${row?.storeName ?? ""}`}
        value={plan}
        onChange={(e) => setPlan(e.target.value)}
        options={[...plans.map((p) => ({ value: p.code, label: `${p.name} · ${p.days} days` })), { value: "FREE", label: "Free (end their plan)" }]}
      />
    </Modal>
  );
}

function SplitModal({ row, onClose, onDone }: { row: SellerRow | null; onClose: () => void; onDone: (r: SellerRow) => void }) {
  const toast = useToast();
  const [form, setForm] = useState({ paystackSubaccount: "", flutterwaveSubaccount: "", stripeAccount: "" });
  const [busy, setBusy] = useState(false);
  const [loadedFor, setLoadedFor] = useState<number | null>(null);
  if (row && loadedFor !== row.storeId) {
    setLoadedFor(row.storeId);
    setForm({ paystackSubaccount: row.paystackSubaccount ?? "", flutterwaveSubaccount: row.flutterwaveSubaccount ?? "", stripeAccount: row.stripeAccount ?? "" });
  }
  async function save() {
    if (!row) return;
    setBusy(true);
    try {
      onDone(await api.put<SellerRow>(`/api/admin/sellers/${row.storeId}/split`, form));
      toast("Split accounts saved");
    } catch (e) {
      toast(errorMessage(e), "error");
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      open={!!row}
      onClose={onClose}
      title="Split payments"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save} loading={busy}>
            Save
          </Button>
        </div>
      }
    >
      <p className="mb-4 text-sm text-zinc-500">
        With a sub-account, customer payments go straight to {row?.storeName} and your commission stays with you. Without one, you collect the money and it shows under Payouts.
      </p>
      <div className="space-y-3">
        <Input label="Paystack subaccount code" value={form.paystackSubaccount} onChange={(e) => setForm({ ...form, paystackSubaccount: e.target.value })} placeholder="ACCT_xxxxxxxx" />
        <Input label="Flutterwave subaccount ID" value={form.flutterwaveSubaccount} onChange={(e) => setForm({ ...form, flutterwaveSubaccount: e.target.value })} placeholder="RS_xxxxxxxx" />
        <Input label="Stripe connected account" value={form.stripeAccount} onChange={(e) => setForm({ ...form, stripeAccount: e.target.value })} placeholder="acct_xxxxxxxx" />
      </div>
    </Modal>
  );
}

function PaymentsTab() {
  const { data, error, loading, reload } = useLoad(() => api.get<AdminPayment[]>("/api/admin/payments"));
  const [filter, setFilter] = useState<"ALL" | "SUBSCRIPTION" | "ORDER">("ALL");
  if (error) return <ErrorBox message={error} onRetry={reload} />;
  if (loading || !data) return <Skeleton className="h-80" />;
  const rows = data.filter((p) => filter === "ALL" || p.purpose === filter);
  return (
    <div>
      <Segmented
        value={filter}
        onChange={setFilter}
        className="mb-4"
        options={[
          { value: "ALL", label: "All" },
          { value: "SUBSCRIPTION", label: "Plans" },
          { value: "ORDER", label: "Orders" },
        ]}
      />
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-sm">
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50/80 text-left text-xs font-bold tracking-wide text-zinc-400 uppercase dark:border-white/5 dark:bg-white/[0.02]">
                <th className="px-5 py-3">When</th>
                <th className="px-3 py-3">Reference</th>
                <th className="px-3 py-3">Shop</th>
                <th className="px-3 py-3">For</th>
                <th className="px-3 py-3">Gateway</th>
                <th className="px-3 py-3 text-right">Amount</th>
                <th className="px-5 py-3 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-white/5">
              {rows.map((p) => (
                <tr key={p.reference}>
                  <td className="px-5 py-3 whitespace-nowrap text-zinc-500">{timeAgo(p.createdAt)}</td>
                  <td className="px-3 py-3 font-mono text-xs">{p.reference}</td>
                  <td className="px-3 py-3 font-semibold">{p.storeName}</td>
                  <td className="px-3 py-3">{p.purpose === "SUBSCRIPTION" ? `${p.planName} plan` : "Customer order"}</td>
                  <td className="px-3 py-3 capitalize">{p.provider}</td>
                  <td className="px-3 py-3 text-right font-semibold tabular-nums">{money(p.amount, p.currency)}</td>
                  <td className="px-5 py-3 text-right">
                    <Badge tone={p.status === "SUCCESS" ? "green" : p.status === "PENDING" ? "amber" : "rose"}>{p.status.toLowerCase()}</Badge>
                    {p.purpose === "ORDER" && p.status === "SUCCESS" && p.settlement !== "NONE" && (
                      <p className={cn("mt-1 text-[11px]", p.settlement === "OWED" ? "text-amber-600" : "text-zinc-400")}>{p.settlement === "SPLIT" ? "split" : p.settlement === "OWED" ? "owed to seller" : "paid out"}</p>
                    )}
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-zinc-500">
                    No payments yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function PayoutsTab() {
  const toast = useToast();
  const { data, error, loading, reload, setData } = useLoad(() => api.get<PayoutRow[]>("/api/admin/payouts"));
  const [busy, setBusy] = useState<number | null>(null);
  async function markPaid(r: PayoutRow) {
    setBusy(r.storeId);
    try {
      await api.post(`/api/admin/payouts/${r.storeId}/paid`);
      setData((data ?? []).filter((x) => x.storeId !== r.storeId));
      toast(`Marked ${money(r.owed, r.currency)} as paid to ${r.storeName}`);
    } catch (e) {
      toast(errorMessage(e), "error");
    } finally {
      setBusy(null);
    }
  }
  if (error) return <ErrorBox message={error} onRetry={reload} />;
  if (loading || !data) return <Skeleton className="h-60" />;
  return (
    <div>
      <p className="mb-4 max-w-2xl text-sm text-zinc-500">
        Customer payments for shops without a split sub-account are collected by the platform. Pay the seller (minus your commission), then mark it here.
      </p>
      {data.length === 0 ? (
        <Card className="p-10 text-center text-sm text-zinc-500">Nothing owed right now. 🎉</Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {data.map((r) => (
            <Card key={r.storeId} className="flex items-center gap-4 p-5">
              <Avatar name={r.storeName} className="size-11" />
              <div className="min-w-0 flex-1">
                <p className="font-bold">{r.storeName}</p>
                <p className="text-xs text-zinc-500">
                  {r.payments} payment{r.payments === 1 ? "" : "s"} · {r.email}
                </p>
                <p className="mt-1 text-lg font-extrabold text-brand-700 dark:text-brand-400">{money(r.owed, r.currency)}</p>
              </div>
              <div className="flex flex-col gap-2">
                <Button size="sm" onClick={() => markPaid(r)} loading={busy === r.storeId}>
                  Mark paid
                </Button>
                <a
                  href={whatsappLink(r.whatsapp, `Hi ${r.storeName}, we're sending your payout of ${money(r.owed, r.currency)}.`)}
                  target="_blank"
                  rel="noreferrer"
                  className="flex h-9 items-center justify-center gap-1.5 rounded-xl border border-zinc-200 px-3 text-xs font-semibold dark:border-white/10"
                >
                  <FaWhatsapp className="text-[#1fae53]" /> Message
                </a>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
