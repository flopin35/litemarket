import { useState } from "react";
import { LuCreditCard, LuFlaskConical, LuLock, LuSmartphone } from "react-icons/lu";
import { Button, Input } from "../../components/ui";
import { api, errorMessage } from "../../lib/api";
import { cn } from "../../lib/cn";
import { money } from "../../lib/format";
import { usePageTitle } from "../../lib/hooks";
import { useLocation } from "../../lib/router";
import { useToast } from "../../lib/toast";

/**
 * Test checkout used when PAYMENTS_DEMO_MODE=true. It is clearly marked as a simulation:
 * nothing is charged, and it only works while demo mode is switched on in the API.
 */
export default function DemoPay() {
  usePageTitle("Test payment");
  const { query } = useLocation();
  const toast = useToast();
  const reference = query.get("reference") ?? "";
  const amount = Number(query.get("amount") ?? 0);
  const currency = query.get("currency") ?? "GHS";
  const title = query.get("title") ?? "Payment";
  const back = safe(query.get("return"));
  const cancel = safe(query.get("cancel"));
  const [method, setMethod] = useState<"momo" | "card">("momo");
  const [busy, setBusy] = useState(false);

  async function pay() {
    setBusy(true);
    try {
      await api.post(`/api/payments/demo/${encodeURIComponent(reference)}/complete`);
      window.location.href = `${back}${back.includes("?") ? "&" : "?"}reference=${encodeURIComponent(reference)}`;
    } catch (e) {
      toast(errorMessage(e), "error");
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-gradient-to-br from-zinc-100 to-zinc-200 px-4 py-10 dark:from-zinc-950 dark:to-zinc-900">
      <div className="w-full max-w-md animate-scale-in overflow-hidden rounded-3xl bg-white shadow-2xl dark:bg-zinc-900">
        <div className="flex items-center gap-2 bg-amber-400 px-5 py-2.5 text-sm font-bold text-amber-950">
          <LuFlaskConical /> TEST MODE: simulated payment, no real money moves
        </div>
        <div className="p-6 sm:p-8">
          <p className="text-sm text-zinc-500">{title}</p>
          <p className="mt-1 text-4xl font-black tracking-tight">{money(amount, currency)}</p>
          <div className="mt-6 grid grid-cols-2 gap-2 rounded-2xl bg-zinc-100 p-1 dark:bg-white/5">
            {(
              [
                ["momo", <LuSmartphone key="i" />, "Mobile Money"],
                ["card", <LuCreditCard key="i" />, "Card"],
              ] as const
            ).map(([v, icon, label]) => (
              <button key={v} onClick={() => setMethod(v)} className={cn("flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold transition", method === v ? "bg-white shadow dark:bg-zinc-800" : "text-zinc-500")}>
                {icon} {label}
              </button>
            ))}
          </div>
          <div key={method} className="mt-5 animate-fade-up space-y-3">
            {method === "momo" ? (
              <Input label="Test phone number" defaultValue="024 000 0000" readOnly hint="Any number works in test mode." />
            ) : (
              <>
                <Input label="Test card number" defaultValue="4242 4242 4242 4242" readOnly />
                <div className="grid grid-cols-2 gap-3">
                  <Input label="Expiry" defaultValue="12 / 30" readOnly />
                  <Input label="CVC" defaultValue="123" readOnly />
                </div>
              </>
            )}
          </div>
          <Button onClick={pay} loading={busy} size="lg" className="mt-6 w-full" icon={<LuLock />}>
            Simulate successful payment
          </Button>
          <a href={cancel} className="mt-3 block text-center text-sm font-semibold text-zinc-500 hover:text-zinc-800 dark:hover:text-white">
            Cancel
          </a>
          <p className="mt-6 text-center font-mono text-[11px] text-zinc-400">Ref: {reference}</p>
        </div>
      </div>
    </div>
  );
}

/** Only allow redirects back to this website (never to another domain). */
function safe(url: string | null): string {
  if (!url) return "/";
  try {
    const u = new URL(url, window.location.origin);
    return u.origin === window.location.origin ? u.pathname + u.search : "/";
  } catch {
    return "/";
  }
}
