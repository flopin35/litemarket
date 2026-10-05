import { useEffect, useMemo, useRef, useState, type CSSProperties, type FormEvent } from "react";
import { FaWhatsapp } from "react-icons/fa6";
import {
  LuArrowRight,
  LuBot,
  LuCircleCheck,
  LuCreditCard,
  LuMinus,
  LuPlus,
  LuSearch,
  LuSend,
  LuShieldCheck,
  LuShoppingBag,
  LuSparkles,
  LuStar,
  LuStore,
  LuTrash2,
  LuX,
  LuZap,
} from "react-icons/lu";
import { Avatar, Logo, ProductImage, ThemeToggle } from "../../components/bits";
import { flyToCart } from "../../components/motion";
import { Drawer, Modal } from "../../components/Overlay";
import { Button, Input, Skeleton, Textarea } from "../../components/ui";
import { BRAND } from "../../config";
import { api, ApiError, errorMessage } from "../../lib/api";
import { useCart } from "../../lib/cart";
import { cn } from "../../lib/cn";
import { money } from "../../lib/format";
import { useDebounced, useLoad, usePageTitle } from "../../lib/hooks";
import { Link, navigate, useLocation } from "../../lib/router";
import { useToast } from "../../lib/toast";
import type { ChatMessage, ChatReply, CheckoutStart, PublicProduct, Shop, WhatsAppOrder } from "../../lib/types";

export default function Storefront({ slug }: { slug: string }) {
  const { data: shop, error, loading } = useLoad(() => api.get<Shop>(`/api/shops/${encodeURIComponent(slug)}`), [slug]);
  const { query } = useLocation();
  const toast = useToast();
  usePageTitle(shop ? `${shop.name} · Shop online` : "Shop");

  useEffect(() => {
    if (query.get("checkout") === "cancelled") {
      toast("Payment cancelled. Your cart is still here.", "info");
      navigate(`/s/${slug}`, { replace: true });
    }
  }, [query, slug, toast]);

  if (error) return <ShopMissing message={error} />;
  if (loading || !shop) return <ShopSkeleton />;
  return <ShopView shop={shop} />;
}

function ShopView({ shop }: { shop: Shop }) {
  const toast = useToast();
  const cart = useCart(shop.slug, shop.products);
  const [search, setSearch] = useState("");
  const [cat, setCat] = useState("All");
  const [viewing, setViewing] = useState<PublicProduct | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [checkout, setCheckout] = useState(false);
  const q = useDebounced(search.trim().toLowerCase(), 150);
  const accent = shop.accentColor || "#0F9D7A";

  // Modals and drawers render outside this page (portals), so the shop colour goes on <html>.
  useEffect(() => {
    document.documentElement.style.setProperty("--shop", accent);
    return () => document.documentElement.style.removeProperty("--shop");
  }, [accent]);

  const visible = useMemo(
    () =>
      shop.products.filter(
        (p) => (cat === "All" || p.category === cat) && (!q || `${p.name} ${p.description ?? ""} ${p.category ?? ""}`.toLowerCase().includes(q)),
      ),
    [shop.products, cat, q],
  );
  const featured = shop.products.filter((p) => p.featured && p.available);

  function add(p: PublicProduct, from?: HTMLElement, qty = 1) {
    cart.add(p.id, qty);
    if (from) flyToCart(from, accent);
    else toast(`${p.name} added to your cart`);
  }

  return (
    <div className="min-h-dvh bg-zinc-50 pb-28 dark:bg-ink-950" style={{ "--shop": accent } as CSSProperties}>
      {/* Header */}
      <header className="relative overflow-hidden text-white" style={{ background: `linear-gradient(135deg, ${accent}, ${accent}dd 60%, ${accent}aa)` }}>
        <div className="absolute -top-24 -right-24 size-80 animate-blob rounded-full bg-white/15 blur-2xl" />
        <div className="absolute -bottom-32 -left-16 size-72 animate-blob rounded-full bg-black/10 blur-2xl [animation-delay:-9s]" />
        <div className="relative mx-auto max-w-6xl px-4 pt-5 pb-10 sm:px-6 sm:pt-6 sm:pb-14">
          <div className="flex items-center justify-between">
            <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold backdrop-blur">Open for orders</span>
            <ThemeToggle className="text-white/80 hover:bg-white/15 hover:text-white" />
          </div>
          <div className="mt-6 flex animate-fade-up items-center gap-4 sm:gap-5">
            <Avatar name={shop.name} src={shop.logoUrl} color="rgba(255,255,255,.22)" className="size-16 text-xl ring-4 ring-white/30 sm:size-20 sm:text-2xl" />
            <div className="min-w-0">
              <h1 className="text-2xl font-extrabold tracking-tight sm:text-4xl">{shop.name}</h1>
              {shop.about && <p className="mt-1 line-clamp-2 max-w-2xl text-sm text-white/90 sm:text-base">{shop.about}</p>}
            </div>
          </div>
          <div className="mt-5 flex animate-fade-up flex-wrap gap-2 text-xs font-semibold [animation-delay:100ms]">
            {shop.whatsappOrders && (
              <span className="flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 backdrop-blur">
                <FaWhatsapp /> Order on WhatsApp
              </span>
            )}
            {shop.onlinePayments && (
              <span className="flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 backdrop-blur">
                <LuCreditCard /> Pay with MoMo or card
              </span>
            )}
            <span className="flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 backdrop-blur">
              <LuShieldCheck /> Secure checkout
            </span>
          </div>
        </div>
      </header>

      {/* Search + categories */}
      <div className="sticky top-0 z-30 -mt-6 px-4 sm:px-6">
        <div className="mx-auto max-w-6xl rounded-2xl border border-zinc-200/70 bg-white/85 p-3 shadow-lg shadow-black/5 backdrop-blur-xl dark:border-white/10 dark:bg-zinc-900/85">
          <div className="relative">
            <LuSearch className="absolute top-1/2 left-3.5 -translate-y-1/2 text-zinc-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={`Search ${shop.name}`}
              className="h-11 w-full rounded-xl bg-zinc-100 pr-3 pl-10 text-[15px] outline-none focus:bg-white focus:ring-2 focus:ring-[var(--shop)] dark:bg-white/5 dark:focus:bg-white/10"
            />
          </div>
          {shop.categories.length > 1 && (
            <div className="mt-3 flex gap-2 overflow-x-auto no-scrollbar">
              {["All", ...shop.categories].map((c) => (
                <button
                  key={c}
                  onClick={() => setCat(c)}
                  className={cn(
                    "shrink-0 rounded-full px-4 py-1.5 text-sm font-semibold transition-all duration-300",
                    cat === c ? "bg-[var(--shop)] text-white shadow-md" : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-white/5 dark:text-zinc-300",
                  )}
                >
                  {c}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <main className="mx-auto max-w-6xl px-4 pt-6 sm:px-6">
        {featured.length > 0 && cat === "All" && !q && (
          <section className="mb-8">
            <h2 className="mb-3 flex items-center gap-2 text-lg font-extrabold">
              <LuStar className="fill-amber-400 text-amber-400" /> Popular right now
            </h2>
            <div className="-mx-4 flex snap-x gap-4 overflow-x-auto px-4 pb-2 no-scrollbar sm:mx-0 sm:px-0">
              {featured.map((p, i) => (
                <button
                  key={p.id}
                  onClick={() => setViewing(p)}
                  className="group relative h-44 w-72 shrink-0 animate-fade-up snap-start overflow-hidden rounded-3xl text-left shadow-lg"
                  style={{ animationDelay: `${i * 80}ms` }}
                >
                  <div className="absolute inset-0 transition-transform duration-700 group-hover:scale-110">
                    <ProductImage src={p.imageUrl} name={p.name} category={p.category} />
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />
                  <div className="absolute inset-x-4 bottom-4 text-white">
                    <p className="font-bold">{p.name}</p>
                    <p className="text-sm font-extrabold text-white/90">{money(p.price, shop.currency)}</p>
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4">
          {visible.map((p, i) => (
            <ProductCard key={p.id} p={p} currency={shop.currency} index={i} onOpen={() => setViewing(p)} onAdd={(el) => add(p, el)} />
          ))}
        </div>
        {visible.length === 0 && (
          <div className="py-20 text-center text-zinc-500">
            <LuSearch className="mx-auto size-8" />
            <p className="mt-3">{shop.products.length ? "No products match. Try another search." : "The shop is getting ready. Check back soon!"}</p>
          </div>
        )}

        <footer className="mt-16 flex flex-col items-center gap-2 text-center text-xs text-zinc-400">
          <Link to="/" className="opacity-80 transition hover:opacity-100">
            <Logo className="scale-90" />
          </Link>
          <p>
            Shop made with {BRAND.name}.{" "}
            <Link to="/signup" className="font-semibold text-zinc-500 underline-offset-4 hover:underline">
              Create yours free
            </Link>
          </p>
        </footer>
      </main>

      {/* Cart button */}
      {cart.count > 0 && (
        <div className="fixed inset-x-4 bottom-4 z-40 mx-auto max-w-md animate-slide-in-up sm:right-6 sm:left-auto sm:mx-0 sm:w-80">
          <button
            onClick={() => setCartOpen(true)}
            className="shine flex w-full items-center justify-between rounded-2xl bg-zinc-900 px-5 py-4 text-white shadow-2xl shadow-black/30 transition active:scale-[0.98] dark:bg-white dark:text-zinc-900"
          >
            <span className="flex items-center gap-3 font-bold">
              <span data-cart-target className="relative">
                <LuShoppingBag className="size-6" />
                <span className="absolute -top-2 -right-2.5 flex size-5 items-center justify-center rounded-full bg-[var(--shop)] text-[11px] text-white">{cart.count}</span>
              </span>
              View cart
            </span>
            <span className="font-extrabold tabular-nums">{money(cart.total, shop.currency)}</span>
          </button>
        </div>
      )}
      {cart.count === 0 && <span data-cart-target className="fixed right-8 bottom-8" />}

      {shop.assistant && <ChatWidget shop={shop} cartIds={cart.lines.map((l) => l.productId)} onAdd={(p) => add(p)} raised={cart.count > 0} />}

      <ProductModal product={viewing} currency={shop.currency} onClose={() => setViewing(null)} onAdd={(p, qty) => (add(p, undefined, qty), setViewing(null))} />

      <Drawer
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        title="Your cart"
        subtitle={`${cart.count} item${cart.count === 1 ? "" : "s"} from ${shop.name}`}
        width="max-w-md"
        footer={
          cart.count > 0 && (
            <div className="space-y-3">
              <div className="flex justify-between text-lg font-extrabold">
                <span>Total</span>
                <span className="tabular-nums">{money(cart.total, shop.currency)}</span>
              </div>
              <Button
                variant="shop"
                size="lg"
                className="w-full"
                onClick={() => {
                  setCartOpen(false);
                  setCheckout(true);
                }}
              >
                Checkout <LuArrowRight />
              </Button>
            </div>
          )
        }
      >
        {cart.lines.length === 0 ? (
          <div className="py-16 text-center text-zinc-500">
            <LuShoppingBag className="mx-auto size-10" />
            <p className="mt-3">Your cart is empty.</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {cart.lines.map((l) => (
              <li key={l.productId} className="flex animate-fade-up items-center gap-3 rounded-2xl border border-zinc-100 p-2.5 dark:border-white/10">
                <div className="size-16 shrink-0 overflow-hidden rounded-xl">
                  <ProductImage src={l.product.imageUrl} name={l.product.name} category={l.product.category} className="[&_span]:text-2xl" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{l.product.name}</p>
                  <p className="text-sm font-bold text-[var(--shop)]">{money(l.product.price * l.quantity, shop.currency)}</p>
                </div>
                <Stepper value={l.quantity} onChange={(v) => cart.setQuantity(l.productId, v)} max={l.product.stockLeft ?? 99} />
              </li>
            ))}
            <li>
              <button onClick={cart.clear} className="flex items-center gap-1.5 px-1 text-xs font-semibold text-zinc-400 hover:text-rose-600">
                <LuTrash2 /> Empty cart
              </button>
            </li>
          </ul>
        )}
      </Drawer>

      <CheckoutModal open={checkout} onClose={() => setCheckout(false)} shop={shop} cart={cart} />
    </div>
  );
}

function ProductCard({ p, currency, index, onOpen, onAdd }: { p: PublicProduct; currency: string; index: number; onOpen: () => void; onAdd: (el: HTMLElement) => void }) {
  const btn = useRef<HTMLButtonElement>(null);
  return (
    <div className="group relative animate-fade-up overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-zinc-200/70 transition-all duration-500 hover:-translate-y-1 hover:shadow-xl dark:bg-zinc-900 dark:ring-white/10" style={{ animationDelay: `${Math.min(index, 12) * 45}ms` }}>
      <button onClick={onOpen} className="block w-full text-left">
        <div className="relative aspect-square overflow-hidden">
          <div className="h-full w-full transition-transform duration-700 ease-[var(--ease-out-expo)] group-hover:scale-110">
            <ProductImage src={p.imageUrl} name={p.name} category={p.category} />
          </div>
          {!p.available && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/60 backdrop-blur-[2px] dark:bg-black/50">
              <span className="rounded-full bg-zinc-900 px-3 py-1 text-xs font-bold text-white">Sold out</span>
            </div>
          )}
          {p.available && p.stockLeft !== null && (
            <span className="absolute top-2.5 left-2.5 rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-bold text-rose-600 shadow-sm">Only {p.stockLeft} left</span>
          )}
        </div>
        <div className="p-3 pb-14 sm:p-4 sm:pb-16">
          <p className="line-clamp-2 text-sm leading-snug font-semibold sm:text-[15px]">{p.name}</p>
          <p className="mt-1.5 text-base font-extrabold sm:text-lg">{money(p.price, currency)}</p>
        </div>
      </button>
      {p.available && (
        <button
          ref={btn}
          onClick={() => btn.current && onAdd(btn.current)}
          className="absolute right-3 bottom-3 flex size-10 items-center justify-center rounded-2xl bg-[var(--shop)] text-white shadow-lg transition-all duration-300 hover:scale-110 hover:rotate-90 active:scale-90 sm:right-4 sm:bottom-4"
          aria-label={`Add ${p.name} to cart`}
        >
          <LuPlus className="size-5" />
        </button>
      )}
    </div>
  );
}

function Stepper({ value, onChange, max = 99 }: { value: number; onChange: (v: number) => void; max?: number }) {
  return (
    <div className="flex items-center rounded-xl bg-zinc-100 p-1 dark:bg-white/10">
      <button onClick={() => onChange(value - 1)} className="flex size-8 items-center justify-center rounded-lg transition hover:bg-white dark:hover:bg-white/10" aria-label="One less">
        <LuMinus />
      </button>
      <span key={value} className="w-7 animate-pop text-center text-sm font-bold tabular-nums">
        {value}
      </span>
      <button onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max} className="flex size-8 items-center justify-center rounded-lg transition hover:bg-white disabled:opacity-30 dark:hover:bg-white/10" aria-label="One more">
        <LuPlus />
      </button>
    </div>
  );
}

function ProductModal({ product, currency, onClose, onAdd }: { product: PublicProduct | null; currency: string; onClose: () => void; onAdd: (p: PublicProduct, qty: number) => void }) {
  const [qty, setQty] = useState(1);
  useEffect(() => setQty(1), [product?.id]);
  const p = product;
  return (
    <Modal open={!!p} onClose={onClose} size="md">
      {p && (
        <div className="-mx-6 -mt-5">
          <div className="relative aspect-[4/3] overflow-hidden">
            <ProductImage src={p.imageUrl} name={p.name} category={p.category} className="[&_span]:text-7xl" />
            <button onClick={onClose} className="absolute top-3 right-3 rounded-full bg-white/90 p-2 shadow-lg backdrop-blur" aria-label="Close">
              <LuX />
            </button>
          </div>
          <div className="px-6 pt-5">
            {p.category && <p className="text-xs font-bold tracking-wider text-[var(--shop)] uppercase">{p.category}</p>}
            <h2 className="mt-1 text-2xl font-extrabold">{p.name}</h2>
            <p className="mt-2 text-2xl font-black">{money(p.price, currency)}</p>
            {p.description && <p className="mt-4 leading-relaxed whitespace-pre-line text-zinc-600 dark:text-zinc-300">{p.description}</p>}
            {p.available ? (
              <div className="mt-6 flex items-center gap-3 pb-1">
                <Stepper value={qty} onChange={(v) => setQty(Math.max(1, v))} max={p.stockLeft ?? 99} />
                <Button variant="shop" size="lg" className="flex-1" onClick={() => onAdd(p, qty)} icon={<LuShoppingBag />}>
                  Add · {money(p.price * qty, currency)}
                </Button>
              </div>
            ) : (
              <p className="mt-6 rounded-2xl bg-zinc-100 py-3 text-center font-semibold text-zinc-500 dark:bg-white/5">Sold out for now</p>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}

// ── Checkout ──────────────────────────────────────────────────────────────────

type Cart = ReturnType<typeof useCart>;

function readCustomer() {
  try {
    return JSON.parse(localStorage.getItem("lm-customer") ?? "{}") as Record<string, string>;
  } catch {
    return {};
  }
}

function CheckoutModal({ open, onClose, shop, cart }: { open: boolean; onClose: () => void; shop: Shop; cart: Cart }) {
  const toast = useToast();
  const canPay = shop.onlinePayments && shop.providers.length > 0;
  const [method, setMethod] = useState<"pay" | "whatsapp">(canPay ? "pay" : "whatsapp");
  const [provider, setProvider] = useState(shop.providers[0]?.id ?? "");
  const [form, setForm] = useState(() => ({ name: "", phone: "", email: "", address: "", note: "", ...readCustomer() }));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<WhatsAppOrder | null>(null);

  useEffect(() => {
    if (open) {
      setDone(null);
      setErrors({});
    }
  }, [open]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = "Please type your name.";
    if (form.phone.replace(/\D/g, "").length < 9) errs.phone = "Please type a phone number we can reach.";
    if (!form.address.trim()) errs.address = "Where should we deliver?";
    if (method === "pay" && provider !== "demo" && !/^\S+@\S+\.\S+$/.test(form.email)) errs.email = "Your email is needed for the payment receipt.";
    setErrors(errs);
    if (Object.keys(errs).length) return;

    localStorage.setItem("lm-customer", JSON.stringify({ name: form.name, phone: form.phone, email: form.email, address: form.address }));
    const body = {
      items: cart.lines.map((l) => ({ productId: l.productId, quantity: l.quantity })),
      customer: { name: form.name, phone: form.phone, email: form.email || null, address: form.address, note: form.note || null },
      provider: method === "pay" ? provider : undefined,
    };
    setBusy(true);
    try {
      if (method === "whatsapp") {
        const r = await api.post<WhatsAppOrder>(`/api/shops/${shop.slug}/orders`, body);
        setDone(r);
        cart.clear();
        window.open(r.whatsappUrl, "_blank");
      } else {
        const r = await api.post<CheckoutStart>(`/api/shops/${shop.slug}/checkout`, body);
        window.location.href = r.checkoutUrl;
        return;
      }
    } catch (e) {
      if (e instanceof ApiError && Object.keys(e.fields).length) toast("Please check your details.", "error");
      else toast(errorMessage(e), "error");
    }
    setBusy(false);
  }

  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm({ ...form, [k]: e.target.value });

  return (
    <Modal open={open} onClose={onClose} title={done ? undefined : "Checkout"} size="md">
      {done ? (
        <div className="relative py-6 text-center">
          <div className="mx-auto flex size-20 animate-pop items-center justify-center rounded-full bg-[#1fae53] text-4xl text-white shadow-xl shadow-emerald-600/30">
            <FaWhatsapp />
          </div>
          <h2 className="mt-5 text-2xl font-extrabold">Almost done!</h2>
          <p className="mt-2 text-zinc-500">
            Your order <b className="font-mono text-zinc-800 dark:text-zinc-200">{done.orderNumber}</b> ({money(done.total, done.currency)}) is saved. Send the message on WhatsApp so {shop.name} can confirm it.
          </p>
          <a href={done.whatsappUrl} target="_blank" rel="noreferrer" className="shine mt-6 flex h-13 items-center justify-center gap-2 rounded-2xl bg-[#1fae53] text-base font-bold text-white shadow-lg">
            <FaWhatsapp className="size-5" /> Send order on WhatsApp
          </a>
          <button onClick={onClose} className="mt-3 text-sm font-semibold text-zinc-500 hover:text-zinc-800">
            Keep shopping
          </button>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <div className="rounded-2xl bg-zinc-50 p-4 dark:bg-white/5">
            {cart.lines.map((l) => (
              <div key={l.productId} className="flex justify-between py-0.5 text-sm">
                <span className="text-zinc-600 dark:text-zinc-300">
                  {l.quantity} × {l.product.name}
                </span>
                <span className="font-semibold tabular-nums">{money(l.quantity * l.product.price, shop.currency)}</span>
              </div>
            ))}
            <div className="mt-2 flex justify-between border-t border-dashed border-zinc-200 pt-2 font-extrabold dark:border-white/10">
              <span>Total</span>
              <span className="tabular-nums">{money(cart.total, shop.currency)}</span>
            </div>
          </div>

          {canPay && shop.whatsappOrders && (
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  ["pay", <LuCreditCard key="i" />, "Pay now"],
                  ["whatsapp", <FaWhatsapp key="i" />, "Order on WhatsApp"],
                ] as const
              ).map(([value, icon, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setMethod(value)}
                  className={cn(
                    "flex items-center justify-center gap-2 rounded-2xl border-2 py-3 text-sm font-bold transition-all duration-300",
                    method === value ? "border-[var(--shop)] bg-[var(--shop)]/10 text-zinc-900 dark:text-white" : "border-zinc-200 text-zinc-500 dark:border-white/10",
                  )}
                >
                  {icon} {label}
                </button>
              ))}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Input label="Your name" value={form.name} onChange={set("name")} error={errors.name} autoComplete="name" />
            <Input label="Phone" value={form.phone} onChange={set("phone")} error={errors.phone} inputMode="tel" autoComplete="tel" />
          </div>
          {method === "pay" && <Input label={provider === "demo" ? "Email (optional)" : "Email (for your receipt)"} type="email" value={form.email} onChange={set("email")} error={errors.email} autoComplete="email" />}
          <Input label="Delivery address" value={form.address} onChange={set("address")} error={errors.address} placeholder="Town, area, landmark" autoComplete="street-address" />
          <Textarea label="Anything else? (optional)" value={form.note} onChange={set("note")} rows={2} placeholder="Size, colour, delivery time..." />

          {method === "pay" && shop.providers.length > 1 && (
            <div>
              <p className="mb-2 text-sm font-semibold">Pay with</p>
              <div className="grid gap-2">
                {shop.providers.map((pr) => (
                  <button
                    key={pr.id}
                    type="button"
                    onClick={() => setProvider(pr.id)}
                    className={cn(
                      "flex items-center gap-3 rounded-xl border-2 px-4 py-3 text-left text-sm font-semibold transition",
                      provider === pr.id ? "border-[var(--shop)] bg-[var(--shop)]/5" : "border-zinc-200 dark:border-white/10",
                    )}
                  >
                    <span className={cn("flex size-5 items-center justify-center rounded-full border-2", provider === pr.id ? "border-[var(--shop)] bg-[var(--shop)]" : "border-zinc-300")}>
                      {provider === pr.id && <span className="size-2 rounded-full bg-white" />}
                    </span>
                    {pr.id === "demo" ? <LuZap className="text-amber-500" /> : <LuCreditCard className="text-zinc-400" />}
                    {pr.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <Button type="submit" variant={method === "whatsapp" ? "whatsapp" : "shop"} size="lg" loading={busy} className="w-full" icon={method === "whatsapp" ? <FaWhatsapp className="size-5" /> : <LuShieldCheck />}>
            {method === "whatsapp" ? "Send order on WhatsApp" : `Pay ${money(cart.total, shop.currency)}`}
          </Button>
          <p className="text-center text-xs text-zinc-400">
            {method === "whatsapp" ? `${shop.name} will confirm your order and delivery on WhatsApp.` : "You'll pay on a secure page. Your card or MoMo details never touch this shop."}
          </p>
        </form>
      )}
    </Modal>
  );
}

// ── AI shopping assistant ─────────────────────────────────────────────────────

function ChatWidget({ shop, cartIds, onAdd, raised }: { shop: Shop; cartIds: number[]; onAdd: (p: PublicProduct) => void; raised: boolean }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<(ChatMessage & { suggestions?: number[] })[]>([
    { role: "assistant", content: `Hi! 👋 I'm the ${shop.name} assistant. Ask me about products, prices, or what to get within your budget.` },
  ]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const end = useRef<HTMLDivElement>(null);
  const byId = useMemo(() => new Map(shop.products.map((p) => [p.id, p])), [shop.products]);

  useEffect(() => {
    end.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, busy]);

  async function send(content: string) {
    const msg = content.trim();
    if (!msg || busy) return;
    const next = [...messages, { role: "user" as const, content: msg }];
    setMessages(next);
    setText("");
    setBusy(true);
    try {
      const r = await api.post<ChatReply>(`/api/shops/${shop.slug}/assistant`, {
        messages: next.slice(-12).map(({ role, content }) => ({ role, content })),
        cartProductIds: cartIds,
      });
      setMessages((m) => [...m, { role: "assistant", content: r.reply, suggestions: r.suggestions }]);
    } catch (e) {
      setMessages((m) => [...m, { role: "assistant", content: errorMessage(e) }]);
    } finally {
      setBusy(false);
    }
  }

  const quick = ["What's popular?", `Something under ${shop.currency} 50`, "Do you deliver?"];

  return (
    <>
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          "fixed left-4 z-40 flex items-center gap-2 rounded-full bg-gradient-to-br from-violet-600 to-fuchsia-600 py-3 pr-5 pl-3 font-semibold text-white shadow-xl shadow-violet-600/30 transition-all duration-500 hover:scale-105 sm:left-6",
          raised ? "bottom-24 sm:bottom-6" : "bottom-4 sm:bottom-6",
          open && "scale-0 opacity-0",
        )}
        aria-label="Ask the shop assistant"
      >
        <span className="relative flex size-8 items-center justify-center rounded-full bg-white/20">
          <span className="absolute inset-0 animate-ping-slow rounded-full bg-white/40" />
          <LuSparkles />
        </span>
        Ask us
      </button>

      {open && (
        <div className="fixed inset-x-3 bottom-3 z-50 flex max-h-[78vh] animate-scale-in flex-col overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-black/5 sm:inset-x-auto sm:left-6 sm:w-[380px] dark:bg-zinc-900 dark:ring-white/10">
          <div className="flex items-center gap-3 bg-gradient-to-br from-violet-600 to-fuchsia-600 px-4 py-3.5 text-white">
            <span className="flex size-10 items-center justify-center rounded-2xl bg-white/20">
              <LuBot className="size-5" />
            </span>
            <div className="flex-1">
              <p className="text-sm font-bold">{shop.name} assistant</p>
              <p className="flex items-center gap-1.5 text-xs text-white/80">
                <span className="size-1.5 rounded-full bg-emerald-300" /> Online · AI powered
              </p>
            </div>
            <button onClick={() => setOpen(false)} className="rounded-lg p-1.5 hover:bg-white/15" aria-label="Close chat">
              <LuX />
            </button>
          </div>
          <div className="flex-1 space-y-3 overflow-y-auto bg-zinc-50 p-4 dark:bg-zinc-950">
            {messages.map((m, i) => (
              <div key={i} className={cn("flex animate-fade-up flex-col", m.role === "user" ? "items-end" : "items-start")}>
                <div
                  className={cn(
                    "max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-line",
                    m.role === "user" ? "rounded-br-md bg-violet-600 text-white" : "rounded-bl-md bg-white text-zinc-800 shadow-sm dark:bg-zinc-800 dark:text-zinc-100",
                  )}
                >
                  {m.content}
                </div>
                {m.suggestions && m.suggestions.length > 0 && (
                  <div className="mt-2 w-full space-y-2">
                    {m.suggestions.map((id) => {
                      const p = byId.get(id);
                      if (!p) return null;
                      return (
                        <div key={id} className="flex items-center gap-3 rounded-2xl bg-white p-2 shadow-sm dark:bg-zinc-800">
                          <div className="size-11 shrink-0 overflow-hidden rounded-xl">
                            <ProductImage src={p.imageUrl} name={p.name} category={p.category} className="[&_span]:text-xl" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-xs font-semibold">{p.name}</p>
                            <p className="text-xs font-bold text-violet-600">{money(p.price, shop.currency)}</p>
                          </div>
                          <button onClick={() => onAdd(p)} className="rounded-xl bg-violet-600 px-3 py-1.5 text-xs font-bold text-white transition hover:scale-105 active:scale-95">
                            Add
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
            {busy && (
              <div className="w-fit rounded-2xl rounded-bl-md bg-white px-4 py-3 text-zinc-400 shadow-sm dark:bg-zinc-800">
                <span className="flex gap-1">
                  <span className="typing-dot" />
                  <span className="typing-dot" />
                  <span className="typing-dot" />
                </span>
              </div>
            )}
            {messages.length === 1 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {quick.map((q) => (
                  <button key={q} onClick={() => send(q)} className="rounded-full border border-violet-200 bg-white px-3 py-1.5 text-xs font-semibold text-violet-700 transition hover:bg-violet-50 dark:border-violet-500/30 dark:bg-transparent dark:text-violet-300">
                    {q}
                  </button>
                ))}
              </div>
            )}
            <div ref={end} />
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(text);
            }}
            className="flex items-center gap-2 border-t border-zinc-100 p-3 dark:border-white/10"
          >
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Ask about a product..."
              maxLength={500}
              className="h-11 flex-1 rounded-xl bg-zinc-100 px-4 text-sm outline-none focus:ring-2 focus:ring-violet-500 dark:bg-white/5"
            />
            <button type="submit" disabled={busy || !text.trim()} className="flex size-11 items-center justify-center rounded-xl bg-violet-600 text-white transition hover:bg-violet-500 disabled:opacity-40" aria-label="Send">
              <LuSend />
            </button>
          </form>
        </div>
      )}
    </>
  );
}

// ── States ────────────────────────────────────────────────────────────────────

function ShopSkeleton() {
  return (
    <div className="min-h-dvh bg-zinc-50 dark:bg-ink-950">
      <div className="h-56 animate-pulse bg-zinc-200 dark:bg-zinc-800" />
      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-4 p-4 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="aspect-[3/4] rounded-3xl" />
        ))}
      </div>
    </div>
  );
}

function ShopMissing({ message }: { message: string }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <div className="flex size-20 animate-float items-center justify-center rounded-3xl bg-zinc-100 text-4xl text-zinc-400 dark:bg-white/5">
        <LuStore />
      </div>
      <h1 className="mt-6 text-2xl font-extrabold">Shop not found</h1>
      <p className="mt-2 max-w-sm text-zinc-500">{message}</p>
      <Link to="/" className="mt-8 inline-flex items-center gap-2 font-semibold text-brand-600">
        <LuCircleCheck /> Create your own shop free
      </Link>
    </div>
  );
}
