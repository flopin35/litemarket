import { useEffect, useState } from "react";
import { FaWhatsapp } from "react-icons/fa6";
import { LuArrowLeft, LuCircleCheck, LuCircleX, LuLoaderCircle } from "react-icons/lu";
import { Card } from "../../components/ui";
import { api, errorMessage } from "../../lib/api";
import { money } from "../../lib/format";
import { usePageTitle } from "../../lib/hooks";
import { Link, useLocation } from "../../lib/router";
import type { PaymentStatus } from "../../lib/types";
import { Confetti } from "../app/BillingCallback";

/** Where customers land after paying for an order (any gateway). */
export default function ThankYou({ slug }: { slug: string }) {
  usePageTitle("Thank you!");
  const { query } = useLocation();
  const reference = query.get("reference") ?? query.get("tx_ref") ?? query.get("trxref") ?? "";
  const [status, setStatus] = useState<PaymentStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!reference) {
      setError("We couldn't find your payment reference.");
      return;
    }
    let alive = true;
    let tries = 0;
    const check = async () => {
      try {
        const s = await api.post<PaymentStatus>("/api/payments/verify", { reference });
        if (!alive) return;
        setStatus(s);
        if (s.status === "SUCCESS") localStorage.removeItem(`lm-cart-${slug}`);
        if (s.status === "PENDING" && ++tries < 12) setTimeout(check, 2500);
      } catch (e) {
        if (alive) setError(errorMessage(e));
      }
    };
    check();
    return () => {
      alive = false;
    };
  }, [reference, slug]);

  const success = status?.status === "SUCCESS";
  const failed = !!error || status?.status === "FAILED";

  return (
    <div className="flex min-h-dvh items-center justify-center bg-zinc-50 px-4 py-10 dark:bg-ink-950">
      <Card className="relative w-full max-w-md overflow-hidden p-8 text-center sm:p-10">
        {success && <Confetti />}
        <div className="relative">
          <div className={`mx-auto flex size-20 animate-pop items-center justify-center rounded-full text-4xl ${success ? "bg-brand-500 text-white shadow-xl shadow-brand-600/30" : failed ? "bg-rose-100 text-rose-600" : "bg-zinc-100 text-zinc-500 dark:bg-white/10"}`}>
            {success ? <LuCircleCheck /> : failed ? <LuCircleX /> : <LuLoaderCircle className="animate-spin" />}
          </div>
          <h1 className="mt-6 text-2xl font-extrabold">{success ? "Thank you! Payment received." : failed ? "Payment not completed" : "Confirming your payment..."}</h1>
          {status && (
            <p className="mt-2 text-zinc-500">
              {success ? (
                <>
                  {status.storeName} has your order <b className="font-mono text-zinc-800 dark:text-zinc-100">{status.orderNumber}</b> for {money(status.amount, status.currency)}.
                </>
              ) : (
                status.message
              )}
            </p>
          )}
          {error && <p className="mt-2 text-zinc-500">{error}</p>}
          {success && status?.whatsappUrl && (
            <a href={status.whatsappUrl} target="_blank" rel="noreferrer" className="shine mt-7 flex h-12 items-center justify-center gap-2 rounded-2xl bg-[#1fae53] font-bold text-white shadow-lg">
              <FaWhatsapp className="size-5" /> Tell the seller on WhatsApp
            </a>
          )}
          <Link to={`/s/${slug}`} className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-zinc-500 hover:text-zinc-900 dark:hover:text-white">
            <LuArrowLeft /> {failed ? "Back to the shop and try again" : "Back to the shop"}
          </Link>
          {status && <p className="mt-6 font-mono text-[11px] text-zinc-400">Ref: {status.reference}</p>}
        </div>
      </Card>
    </div>
  );
}
