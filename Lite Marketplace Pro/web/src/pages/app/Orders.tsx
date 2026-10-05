import { useEffect, useMemo, useState } from "react";
import { FaWhatsapp } from "react-icons/fa6";
import { LuCopy, LuMapPin, LuMessageSquare, LuPencil, LuPhone, LuPlus, LuReceipt, LuSearch, LuSparkles, LuWallet } from "react-icons/lu";
import { EngineBadge, STATUS_LABEL, StatusBadge } from "../../components/bits";
import { Drawer, Modal } from "../../components/Overlay";
import { Badge, Button, EmptyState, ErrorBox, Input, PageHeader, Select, Skeleton, Textarea } from "../../components/ui";
import { api, ApiError, errorMessage } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import { cn } from "../../lib/cn";
import { LANGUAGES, TONES } from "../../lib/constants";
import { money, prettyPhone, shortDate, timeAgo, whatsappLink } from "../../lib/format";
import { copyText, useLoad, usePageTitle } from "../../lib/hooks";
import { navigate, useLocation } from "../../lib/router";
import { useToast } from "../../lib/toast";
import type { ManualOrderInput, Order, OrderStatus, ReplyDrafts } from "../../lib/types";

const TABS: { value: OrderStatus | "ALL"; label: string }[] = [
  { value: "ALL", label: "All" },
  { value: "NEW", label: "New" },
  { value: "PENDING_PAYMENT", label: "Awaiting payment" },
  { value: "PAID", label: "Paid" },
  { value: "DELIVERED", label: "Delivered" },
  { value: "CANCELLED", label: "Cancelled" },
];

export default function Orders() {
  usePageTitle("Orders");
  const { query } = useLocation();
  const toast = useToast();
  const { data, error, loading, reload, setData } = useLoad(() => api.get<Order[]>("/api/orders"));
  const [tab, setTab] = useState<OrderStatus | "ALL">("ALL");
  const [search, setSearch] = useState("");
  const [openId, setOpenId] = useState<number | null>(null);
  const [manual, setManual] = useState<Order | "new" | null>(null);

  useEffect(() => {
    const id = Number(query.get("open"));
    if (id) {
      setOpenId(id);
      navigate("/app/orders", { replace: true });
    }
  }, [query]);

  const orders = data ?? [];
  const counts = useMemo(() => {
    const c: Record<string, number> = { ALL: orders.length };
    orders.forEach((o) => (c[o.status] = (c[o.status] ?? 0) + 1));
    return c;
  }, [orders]);
  const q = search.trim().toLowerCase();
  const visible = orders.filter(
    (o) => (tab === "ALL" || o.status === tab) && (!q || `${o.number} ${o.customerName} ${o.customerPhone ?? ""} ${o.itemsSummary ?? ""}`.toLowerCase().includes(q)),
  );
  const open = orders.find((o) => o.id === openId) ?? null;

  function replace(o: Order) {
    setData(orders.some((x) => x.id === o.id) ? orders.map((x) => (x.id === o.id ? o : x)) : [o, ...orders]);
  }

  async function setStatus(o: Order, status: OrderStatus) {
    try {
      const updated = await api.patch<Order>(`/api/orders/${o.id}/status`, { status });
      replace(updated);
      toast(`Order ${o.number} marked ${STATUS_LABEL[status].toLowerCase()}`);
    } catch (e) {
      toast(errorMessage(e), "error");
    }
  }

  return (
    <div>
      <PageHeader
        title="Orders"
        subtitle="Every WhatsApp and online order lands here automatically."
        actions={
          <Button icon={<LuPlus />} variant="secondary" onClick={() => setManual("new")}>
            Add an order
          </Button>
        }
      />

      <div className="mb-4 flex animate-fade-up gap-2 overflow-x-auto pb-1 no-scrollbar">
        {TABS.map((t) => (
          <button
            key={t.value}
            onClick={() => setTab(t.value)}
            className={cn(
              "flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-all",
              tab === t.value ? "bg-zinc-900 text-white shadow-lg dark:bg-white dark:text-zinc-900" : "bg-white text-zinc-600 ring-1 ring-zinc-200 hover:ring-zinc-300 dark:bg-white/5 dark:text-zinc-300 dark:ring-white/10",
            )}
          >
            {t.label}
            {counts[t.value] ? (
              <span className={cn("rounded-full px-1.5 text-xs", tab === t.value ? "bg-white/20 dark:bg-zinc-900/10" : "bg-zinc-100 dark:bg-white/10")}>{counts[t.value]}</span>
            ) : null}
          </button>
        ))}
      </div>

      <div className="relative mb-4 animate-fade-up sm:max-w-sm">
        <LuSearch className="absolute top-1/2 left-3.5 -translate-y-1/2 text-zinc-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name, phone or order number"
          className="h-10 w-full rounded-xl border border-zinc-200 bg-white pr-3 pl-10 text-sm outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/15 dark:border-white/10 dark:bg-white/5"
        />
      </div>

      {error ? (
        <ErrorBox message={error} onRetry={reload} />
      ) : loading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
      ) : orders.length === 0 ? (
        <div className="card">
          <EmptyState icon={<LuReceipt />} title="No orders yet" text="When customers order from your shop (on WhatsApp or online), they show up here." />
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="hidden grid-cols-[1.1fr_1.2fr_1.6fr_0.9fr_1fr] gap-4 border-b border-zinc-100 bg-zinc-50/80 px-5 py-3 text-xs font-bold tracking-wide text-zinc-400 uppercase md:grid dark:border-white/5 dark:bg-white/[0.02]">
            <span>Order</span>
            <span>Customer</span>
            <span>Items</span>
            <span className="text-right">Total</span>
            <span className="text-right">Status</span>
          </div>
          <ul className="divide-y divide-zinc-100 dark:divide-white/5">
            {visible.map((o, i) => (
              <li key={o.id} className="animate-fade-up" style={{ animationDelay: `${Math.min(i, 15) * 30}ms` }}>
                <button
                  onClick={() => setOpenId(o.id)}
                  className="grid w-full grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1 px-5 py-4 text-left transition hover:bg-zinc-50 md:grid-cols-[1.1fr_1.2fr_1.6fr_0.9fr_1fr] dark:hover:bg-white/[0.03]"
                >
                  <span className="flex items-center gap-3">
                    <ChannelIcon channel={o.channel} />
                    <span>
                      <span className="block font-mono text-sm font-bold">{o.number}</span>
                      <span className="block text-xs text-zinc-400">{timeAgo(o.createdAt)}</span>
                    </span>
                  </span>
                  <span className="text-right md:text-left">
                    <span className="block truncate text-sm font-semibold">{o.customerName}</span>
                    <span className="block truncate text-xs text-zinc-400">{prettyPhone(o.customerPhone)}</span>
                  </span>
                  <span className="hidden truncate text-sm text-zinc-500 md:block">{o.itemsSummary || "-"}</span>
                  <span className="text-sm font-bold tabular-nums md:text-right">{money(o.total, o.currency)}</span>
                  <span className="text-right">
                    <StatusBadge status={o.status} />
                  </span>
                </button>
              </li>
            ))}
            {visible.length === 0 && <li className="px-5 py-12 text-center text-sm text-zinc-500">No orders here.</li>}
          </ul>
        </div>
      )}

      <OrderDrawer order={open} onClose={() => setOpenId(null)} onStatus={setStatus} onEdit={(o) => setManual(o)} />
      <ManualOrderModal
        order={manual}
        onClose={() => setManual(null)}
        onSaved={(o) => {
          replace(o);
          setManual(null);
          toast(`Order ${o.number} saved`);
        }}
      />
    </div>
  );
}

function ChannelIcon({ channel }: { channel: Order["channel"] }) {
  return (
    <span
      title={channel === "WHATSAPP" ? "WhatsApp order" : channel === "ONLINE" ? "Paid online" : "Added by hand"}
      className={cn("flex size-9 shrink-0 items-center justify-center rounded-xl text-white", channel === "WHATSAPP" ? "bg-[#1fae53]" : channel === "ONLINE" ? "bg-brand-600" : "bg-zinc-400 dark:bg-zinc-600")}
    >
      {channel === "WHATSAPP" ? <FaWhatsapp /> : channel === "ONLINE" ? <LuWallet /> : <LuPencil />}
    </span>
  );
}

const FLOW: OrderStatus[] = ["NEW", "PAID", "DELIVERED"];

function OrderDrawer({ order, onClose, onStatus, onEdit }: { order: Order | null; onClose: () => void; onStatus: (o: Order, s: OrderStatus) => void; onEdit: (o: Order) => void }) {
  const { me } = useAuth();
  const o = order;
  const step = o ? FLOW.indexOf(o.status === "PENDING_PAYMENT" ? "NEW" : o.status) : -1;
  const hello = o ? `Hi ${o.customerName.split(" ")[0]}, this is ${me?.store?.name ?? "the shop"} about your order ${o.number}. ` : "";
  return (
    <Drawer
      open={!!o}
      onClose={onClose}
      title={o ? <span className="font-mono">{o.number}</span> : ""}
      subtitle={o ? `${shortDate(o.createdAt)} · ${o.channel === "WHATSAPP" ? "WhatsApp order" : o.channel === "ONLINE" ? "Online order" : "Added by hand"}` : ""}
    >
      {o && (
        <div className="space-y-6">
          {/* Status stepper */}
          {o.status !== "CANCELLED" ? (
            <div>
              <div className="flex items-center">
                {FLOW.map((s, i) => (
                  <div key={s} className="flex flex-1 items-center last:flex-none">
                    <button
                      onClick={() => onStatus(o, s)}
                      disabled={i <= step}
                      className={cn(
                        "flex size-9 items-center justify-center rounded-full text-sm font-bold transition-all duration-500",
                        i <= step ? "bg-brand-600 text-white shadow-lg shadow-brand-600/30" : "bg-zinc-100 text-zinc-400 hover:bg-brand-100 hover:text-brand-700 dark:bg-white/10",
                      )}
                      title={`Mark ${STATUS_LABEL[s].toLowerCase()}`}
                    >
                      {i + 1}
                    </button>
                    {i < FLOW.length - 1 && (
                      <div className="mx-2 h-1 flex-1 overflow-hidden rounded-full bg-zinc-100 dark:bg-white/10">
                        <div className="h-full bg-brand-500 transition-all duration-700" style={{ width: i < step ? "100%" : "0%" }} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <div className="mt-2 flex justify-between text-xs font-semibold text-zinc-500">
                <span>{o.status === "PENDING_PAYMENT" ? "Awaiting payment" : "New"}</span>
                <span>Paid</span>
                <span>Delivered</span>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {o.status !== "PAID" && o.status !== "DELIVERED" && (
                  <Button size="sm" onClick={() => onStatus(o, "PAID")}>
                    Mark paid
                  </Button>
                )}
                {o.status !== "DELIVERED" && (
                  <Button size="sm" variant="secondary" onClick={() => onStatus(o, "DELIVERED")}>
                    Mark delivered
                  </Button>
                )}
                <Button size="sm" variant="ghost" className="text-rose-600! hover:bg-rose-50! dark:hover:bg-rose-500/10!" onClick={() => onStatus(o, "CANCELLED")}>
                  Cancel order
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between rounded-2xl bg-zinc-100 p-4 dark:bg-white/5">
              <StatusBadge status="CANCELLED" />
              <Button size="sm" variant="secondary" onClick={() => onStatus(o, "NEW")}>
                Reopen
              </Button>
            </div>
          )}

          {/* Customer */}
          <div className="rounded-2xl border border-zinc-200 p-4 dark:border-white/10">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-bold">{o.customerName}</p>
                {o.customerPhone && (
                  <p className="mt-1 flex items-center gap-1.5 text-sm text-zinc-500">
                    <LuPhone /> {prettyPhone(o.customerPhone)}
                  </p>
                )}
                {o.address && (
                  <p className="mt-1 flex items-start gap-1.5 text-sm text-zinc-500">
                    <LuMapPin className="mt-0.5 shrink-0" /> {o.address}
                  </p>
                )}
              </div>
              {o.channel === "MANUAL" && (
                <Button size="sm" variant="ghost" icon={<LuPencil />} onClick={() => onEdit(o)}>
                  Edit
                </Button>
              )}
            </div>
            {o.note && <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:bg-amber-500/10 dark:text-amber-200">“{o.note}”</p>}
            {o.customerPhone && (
              <a href={whatsappLink(o.customerPhone, hello)} target="_blank" rel="noreferrer" className="shine mt-4 flex h-10 items-center justify-center gap-2 rounded-xl bg-[#1fae53] text-sm font-semibold text-white">
                <FaWhatsapp /> Message on WhatsApp
              </a>
            )}
          </div>

          {/* Items */}
          <div>
            <p className="mb-2 text-sm font-bold">Items</p>
            {o.items.length ? (
              <ul className="divide-y divide-zinc-100 rounded-2xl border border-zinc-200 dark:divide-white/5 dark:border-white/10">
                {o.items.map((it, i) => (
                  <li key={i} className="flex justify-between gap-4 px-4 py-3 text-sm">
                    <span>
                      <b>{it.quantity} ×</b> {it.name}
                    </span>
                    <span className="font-semibold tabular-nums">{money(it.lineTotal, o.currency)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="rounded-2xl border border-zinc-200 px-4 py-3 text-sm whitespace-pre-line dark:border-white/10">{o.itemsSummary || "-"}</p>
            )}
            <div className="mt-3 flex justify-between px-1 text-lg font-extrabold">
              <span>Total</span>
              <span className="tabular-nums">{money(o.total, o.currency)}</span>
            </div>
            {o.paymentProvider && (
              <p className="mt-1 px-1 text-xs text-zinc-500">
                Paid with <Badge tone="green">{o.paymentProvider}</Badge> {o.paidAt ? `on ${shortDate(o.paidAt)}` : ""}
              </p>
            )}
          </div>

          <ReplyHelper order={o} />
        </div>
      )}
    </Drawer>
  );
}

export function ReplyHelper({ order, compact }: { order?: Order; compact?: boolean }) {
  const toast = useToast();
  const [message, setMessage] = useState("");
  const [tone, setTone] = useState("friendly");
  const [language, setLanguage] = useState("English");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ReplyDrafts | null>(null);

  async function run() {
    if (!message.trim()) return toast("Paste the customer's message first.", "info");
    setBusy(true);
    try {
      setResult(await api.post<ReplyDrafts>("/api/ai/reply-drafts", { message, orderId: order?.id ?? null, tone, language }));
    } catch (e) {
      toast(errorMessage(e), "error");
      if (e instanceof ApiError && e.code === "AI_CREDITS") navigate("/app/billing");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={cn("rounded-2xl border border-violet-200 bg-gradient-to-b from-violet-50/70 to-transparent p-4 dark:border-violet-500/25 dark:from-violet-500/10", compact && "border-0 bg-none p-0")}>
      {!compact && (
        <p className="mb-3 flex items-center gap-2 text-sm font-bold">
          <LuMessageSquare className="text-violet-500" /> AI reply helper
        </p>
      )}
      <Textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={3} placeholder="Paste what the customer wrote, e.g. “Where is my order? I'm waiting 😩”" />
      <div className="mt-3 grid grid-cols-2 gap-3">
        <Select value={tone} onChange={(e) => setTone(e.target.value)} options={TONES} />
        <Select value={language} onChange={(e) => setLanguage(e.target.value)} options={LANGUAGES} />
      </div>
      <Button onClick={run} loading={busy} className="mt-3 w-full bg-gradient-to-b! from-violet-500! to-fuchsia-600! border-violet-600/50!" icon={<LuSparkles />}>
        Draft replies
      </Button>
      {result && !busy && (
        <div className="mt-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-500">
              Detected: <b className="capitalize">{result.intent}</b>
            </span>
            <EngineBadge engine={result.engine} />
          </div>
          {result.drafts.map((d, i) => (
            <div key={d.label} className="animate-fade-up rounded-xl bg-white p-3.5 shadow-sm dark:bg-zinc-900" style={{ animationDelay: `${i * 80}ms` }}>
              <p className="text-xs font-bold tracking-wide text-violet-500 uppercase">{d.label}</p>
              <p className="mt-1 text-sm whitespace-pre-line">{d.text}</p>
              <div className="mt-2.5 flex gap-2">
                <button onClick={async () => (await copyText(d.text)) && toast("Copied")} className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-zinc-500 hover:bg-zinc-100 dark:hover:bg-white/10">
                  <LuCopy /> Copy
                </button>
                {order?.customerPhone && (
                  <a href={whatsappLink(order.customerPhone, d.text)} target="_blank" rel="noreferrer" className="flex items-center gap-1 rounded-lg bg-[#1fae53] px-2.5 py-1 text-xs font-semibold text-white">
                    <FaWhatsapp /> Send
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ManualOrderModal({ order, onClose, onSaved }: { order: Order | "new" | null; onClose: () => void; onSaved: (o: Order) => void }) {
  const { me } = useAuth();
  const toast = useToast();
  const editing = order && order !== "new" ? order : null;
  const [form, setForm] = useState({ customerName: "", customerPhone: "", itemsSummary: "", total: "", status: "NEW" as OrderStatus, address: "", note: "" });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!order) return;
    setForm(
      editing
        ? {
            customerName: editing.customerName,
            customerPhone: editing.customerPhone ?? "",
            itemsSummary: editing.itemsSummary ?? "",
            total: String(editing.total),
            status: editing.status,
            address: editing.address ?? "",
            note: editing.note ?? "",
          }
        : { customerName: "", customerPhone: "", itemsSummary: "", total: "", status: "NEW", address: "", note: "" },
    );
  }, [order, editing]);

  async function save() {
    const total = Number(form.total.replace(",", "."));
    if (!form.customerName.trim()) return toast("Type the customer's name.", "error");
    if (Number.isNaN(total) || total < 0 || !form.total) return toast("The total needs to be a number, like 45.", "error");
    setBusy(true);
    const body: ManualOrderInput = {
      customerName: form.customerName,
      customerPhone: form.customerPhone || null,
      itemsSummary: form.itemsSummary || null,
      total,
      status: form.status,
      address: form.address || null,
      note: form.note || null,
    };
    try {
      onSaved(editing ? await api.put<Order>(`/api/orders/${editing.id}`, body) : await api.post<Order>("/api/orders", body));
    } catch (e) {
      toast(errorMessage(e), "error");
    } finally {
      setBusy(false);
    }
  }

  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm({ ...form, [k]: e.target.value });
  return (
    <Modal
      open={order !== null}
      onClose={onClose}
      title={editing ? `Edit ${editing.number}` : "Add an order"}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save} loading={busy}>
            Save order
          </Button>
        </div>
      }
    >
      <p className="mb-4 text-sm text-zinc-500">For orders you got by phone, DM or in person, so all your sales are in one place.</p>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Input label="Customer name" value={form.customerName} onChange={set("customerName")} />
          <Input label="Phone (optional)" value={form.customerPhone} onChange={set("customerPhone")} inputMode="tel" />
        </div>
        <Textarea label="What they ordered" value={form.itemsSummary} onChange={set("itemsSummary")} rows={2} placeholder="2 x Meat pie, 1 x Sobolo" />
        <div className="grid grid-cols-2 gap-3">
          <Input label="Total" value={form.total} onChange={set("total")} leading={me?.store?.currency ?? "GHS"} inputMode="decimal" />
          <Select
            label="Status"
            value={form.status}
            onChange={set("status")}
            options={(["NEW", "PAID", "DELIVERED", "CANCELLED"] as OrderStatus[]).map((s) => ({ value: s, label: STATUS_LABEL[s] }))}
          />
        </div>
        <Input label="Delivery address (optional)" value={form.address} onChange={set("address")} />
        <Input label="Note (optional)" value={form.note} onChange={set("note")} />
      </div>
    </Modal>
  );
}
