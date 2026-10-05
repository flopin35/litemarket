import { useEffect, useState } from "react";
import { LuArrowRight, LuCircleX, LuCrown, LuLoaderCircle } from "react-icons/lu";
import { ButtonLink, Card } from "../../components/ui";
import { api, errorMessage } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import { shortDate } from "../../lib/format";
import { usePageTitle } from "../../lib/hooks";
import { useLocation } from "../../lib/router";
import type { PaymentStatus } from "../../lib/types";

/** Where Paystack / Flutterwave / Stripe send the seller back after paying for a plan. */
export default function BillingCallback() {
  usePageTitle("Confirming payment");
  const { query } = useLocation();
  const { reload } = useAuth();
  const reference = query.get("reference") ?? query.get("tx_ref") ?? query.get("trxref") ?? "";
  const [status, setStatus] = useState<PaymentStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!reference) {
      setError("We couldn't find a payment reference in the link.");
      return;
    }
    let alive = true;
    let tries = 0;
    const check = async () => {
      try {
        const s = await api.post<PaymentStatus>("/api/payments/verify", { reference });
        if (!alive) return;
        setStatus(s);
        if (s.status === "SUCCESS") reload().catch(() => {});
        if (s.status === "PENDING" && ++tries < 10) setTimeout(check, 2500);
      } catch (e) {
        if (alive) setError(errorMessage(e));
      }
    };
    check();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reference]);

  return <PaymentResult status={status} error={error} />;
}

export function PaymentResult({ status, error }: { status: PaymentStatus | null; error: string | null }) {
  const success = status?.status === "SUCCESS";
  const failed = !!error || status?.status === "FAILED";
  return (
    <div className="mx-auto max-w-lg py-10">
      <Card className="relative overflow-hidden p-8 text-center sm:p-10">
        {success && <Confetti />}
        <div className="relative">
          {success ? (
            <div className="mx-auto flex size-20 animate-pop items-center justify-center rounded-full bg-gradient-to-br from-sun-300 to-sun-500 text-4xl text-white shadow-xl shadow-amber-500/30">
              <LuCrown />
            </div>
          ) : failed ? (
            <div className="mx-auto flex size-20 animate-pop items-center justify-center rounded-full bg-rose-100 text-4xl text-rose-600 dark:bg-rose-500/15">
              <LuCircleX />
            </div>
          ) : (
            <div className="mx-auto flex size-20 items-center justify-center rounded-full bg-brand-50 text-4xl text-brand-600 dark:bg-brand-500/15">
              <LuLoaderCircle className="animate-spin" />
            </div>
          )}
          <h1 className="mt-6 text-2xl font-extrabold">
            {success ? `You're on ${status?.planName}!` : failed ? "Payment not completed" : "Confirming your payment..."}
          </h1>
          <p className="mt-2 text-zinc-500">
            {success
              ? `Unlimited products and more AI credits are switched on until ${shortDate(status?.planExpiresAt)}.`
              : failed
                ? error ?? status?.message
                : "This usually takes a few seconds. Please keep this page open."}
          </p>
          {status && <p className="mt-4 font-mono text-xs text-zinc-400">Ref: {status.reference}</p>}
          <div className="mt-8 flex justify-center gap-3">
            {success ? (
              <ButtonLink to="/app">
                Go to dashboard <LuArrowRight />
              </ButtonLink>
            ) : failed ? (
              <ButtonLink to="/app/billing">Try again</ButtonLink>
            ) : (
              <ButtonLink to="/app/billing" variant="secondary">
                Back to billing
              </ButtonLink>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}

export function Confetti() {
  const colors = ["#12a574", "#fbbf24", "#f97316", "#8b5cf6", "#ec4899", "#0ea5e9"];
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {Array.from({ length: 40 }).map((_, i) => (
        <span
          key={i}
          className="absolute top-[-10%] block h-3 w-1.5 rounded-sm"
          style={{
            left: `${(i * 97) % 100}%`,
            background: colors[i % colors.length],
            animation: `confetti ${2.2 + ((i * 7) % 10) / 10}s ${((i * 13) % 10) / 10}s cubic-bezier(.2,.6,.4,1) forwards`,
            transform: `rotate(${i * 37}deg)`,
          }}
        />
      ))}
      <style>{`@keyframes confetti { 0% { transform: translateY(0) rotate(0); opacity: 1 } 100% { transform: translateY(560px) rotate(720deg); opacity: 0 } }`}</style>
    </div>
  );
}
