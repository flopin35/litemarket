import { lazy, Suspense, useEffect, useState, type ReactNode } from "react";
import {
  LuBot,
  LuCreditCard,
  LuCrown,
  LuEllipsis,
  LuExternalLink,
  LuHouse,
  LuLogOut,
  LuPackage,
  LuReceipt,
  LuShield,
  LuStore,
  LuX,
} from "react-icons/lu";
import { Avatar, Logo, ThemeToggle } from "../../components/bits";
import { Progress, Spinner } from "../../components/ui";
import { api } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import { cn } from "../../lib/cn";
import { useLoad } from "../../lib/hooks";
import { Link, navigate, useLocation } from "../../lib/router";
import { useToast } from "../../lib/toast";
import type { Order } from "../../lib/types";

const Overview = lazy(() => import("./Overview"));
const Products = lazy(() => import("./Products"));
const Orders = lazy(() => import("./Orders"));
const Assistant = lazy(() => import("./Assistant"));
const ShopSettings = lazy(() => import("./ShopSettings"));
const Billing = lazy(() => import("./Billing"));
const BillingCallback = lazy(() => import("./BillingCallback"));
const Admin = lazy(() => import("./Admin"));

interface NavItem {
  to: string;
  label: string;
  short: string;
  icon: ReactNode;
  badge?: number;
}

export default function AppShell() {
  const { me, loading, logout } = useAuth();
  const { path } = useLocation();
  const toast = useToast();
  const [more, setMore] = useState(false);
  const newOrders = useLoad(() => (me ? api.get<Order[]>("/api/orders?status=NEW") : Promise.resolve([] as Order[])), [me?.id, path]);

  useEffect(() => {
    if (!loading && !me) navigate(`/login?next=${encodeURIComponent(path)}`, { replace: true });
  }, [loading, me, path]);

  useEffect(() => setMore(false), [path]);

  if (loading || !me) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <Spinner className="size-8" />
      </div>
    );
  }

  const store = me.store;
  const plan = me.plan;
  const nav: NavItem[] = [
    { to: "/app", label: "Home", short: "Home", icon: <LuHouse /> },
    { to: "/app/products", label: "Products", short: "Products", icon: <LuPackage /> },
    { to: "/app/orders", label: "Orders", short: "Orders", icon: <LuReceipt />, badge: newOrders.data?.length || undefined },
    { to: "/app/assistant", label: "AI assistant", short: "AI", icon: <LuBot /> },
    { to: "/app/shop", label: "My shop", short: "Shop", icon: <LuStore /> },
    { to: "/app/billing", label: "Plan & billing", short: "Plan", icon: <LuCreditCard /> },
  ];
  if (me.role === "ADMIN") nav.push({ to: "/app/admin", label: "Admin", short: "Admin", icon: <LuShield /> });

  const isActive = (to: string) => (to === "/app" ? path === "/app" : path.startsWith(to));

  let page: ReactNode;
  if (path === "/app") page = <Overview />;
  else if (path === "/app/products") page = <Products />;
  else if (path === "/app/orders") page = <Orders />;
  else if (path === "/app/assistant") page = <Assistant />;
  else if (path === "/app/shop") page = <ShopSettings />;
  else if (path === "/app/billing") page = <Billing />;
  else if (path === "/app/billing/callback") page = <BillingCallback />;
  else if (path === "/app/admin" && me.role === "ADMIN") page = <Admin />;
  else page = <p className="py-20 text-center text-zinc-500">This page doesn't exist.</p>;

  async function doLogout() {
    await logout();
    toast("You're logged out. See you soon!", "info");
    navigate("/", { replace: true });
  }

  return (
    <div className="min-h-dvh bg-zinc-50/80 dark:bg-ink-950">
      {/* Sidebar (desktop) */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-zinc-200/80 bg-white lg:flex dark:border-white/10 dark:bg-zinc-950">
        <div className="px-5 pt-5 pb-4">
          <Link to="/">
            <Logo />
          </Link>
        </div>
        {store && (
          <div className="mx-3 mb-3 flex items-center gap-3 rounded-2xl bg-zinc-50 p-3 dark:bg-white/5">
            <Avatar name={store.name} src={store.logoUrl} color={store.accentColor} className="size-10 text-sm" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold">{store.name}</p>
              <a href={`/s/${store.slug}`} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs text-brand-600 hover:underline dark:text-brand-400">
                View shop <LuExternalLink className="size-3" />
              </a>
            </div>
          </div>
        )}
        <nav className="flex-1 space-y-1 px-3">
          {nav.map((n, i) => (
            <Link
              key={n.to}
              to={n.to}
              className={cn(
                "group relative flex animate-fade-up items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all duration-200",
                isActive(n.to)
                  ? "bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300"
                  : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-white/5 dark:hover:text-white",
              )}
              style={{ animationDelay: `${i * 40}ms` }}
            >
              <span className={cn("absolute top-2 bottom-2 left-0 w-1 rounded-r-full bg-brand-500 transition-all duration-300", isActive(n.to) ? "opacity-100" : "scale-y-0 opacity-0")} />
              <span className="text-lg transition-transform duration-300 group-hover:scale-110">{n.icon}</span>
              {n.label}
              {n.badge ? <span className="ml-auto rounded-full bg-sky-500 px-2 py-0.5 text-[11px] font-bold text-white">{n.badge}</span> : null}
            </Link>
          ))}
        </nav>
        {plan && !plan.premium && (
          <div className="m-3 overflow-hidden rounded-2xl bg-gradient-to-br from-brand-600 to-brand-800 p-4 text-white">
            <LuCrown className="size-6 text-sun-300" />
            <p className="mt-2 text-sm font-bold">Free plan</p>
            <p className="text-xs text-brand-100">
              {plan.productLimit !== null ? `Up to ${plan.productLimit} products` : "Unlimited products"} · {plan.aiCreditsLimit - plan.aiCreditsUsed} AI credits left
            </p>
            <Link to="/app/billing" className="mt-3 block rounded-xl bg-white py-2 text-center text-xs font-bold text-brand-700 transition hover:bg-brand-50">
              Upgrade
            </Link>
          </div>
        )}
        {plan?.premium && (
          <div className="m-3 rounded-2xl border border-sun-300/60 bg-sun-300/10 p-4">
            <p className="flex items-center gap-1.5 text-sm font-bold">
              <LuCrown className="text-sun-500" /> {plan.name} plan
            </p>
            <p className="mt-1 text-xs text-zinc-500">{plan.daysLeft} days left</p>
            <Progress value={Math.min(100, (plan.daysLeft / 30) * 100)} className="mt-2" tone="amber" />
          </div>
        )}
        <div className="flex items-center gap-2 border-t border-zinc-100 p-3 dark:border-white/10">
          <div className="min-w-0 flex-1 px-2">
            <p className="truncate text-xs font-semibold">{me.email}</p>
            <p className="text-[11px] text-zinc-400">{me.role === "ADMIN" ? "Admin" : "Seller"}</p>
          </div>
          <ThemeToggle />
          <button onClick={doLogout} className="rounded-xl p-2.5 text-zinc-500 hover:bg-zinc-100 hover:text-rose-600 dark:hover:bg-white/10" aria-label="Log out" title="Log out">
            <LuLogOut className="size-5" />
          </button>
        </div>
      </aside>

      {/* Top bar (mobile) */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-zinc-200/70 bg-white/80 px-4 backdrop-blur-xl lg:hidden dark:border-white/10 dark:bg-ink-950/80">
        <Link to="/app">
          <Logo compact />
        </Link>
        <p className="truncate px-3 text-sm font-bold">{store?.name}</p>
        <div className="flex items-center">
          <ThemeToggle />
          {store && (
            <a href={`/s/${store.slug}`} target="_blank" rel="noreferrer" className="rounded-xl p-2.5 text-zinc-500" aria-label="View shop">
              <LuExternalLink className="size-5" />
            </a>
          )}
        </div>
      </header>

      <main className="px-4 pt-6 pb-28 sm:px-6 lg:pb-12 lg:pl-[calc(16rem+2rem)] lg:pr-8">
        <div key={path} className="page-enter mx-auto max-w-6xl">
          <Suspense
            fallback={
              <div className="flex justify-center py-24">
                <Spinner className="size-7" />
              </div>
            }
          >
            {page}
          </Suspense>
        </div>
      </main>

      {/* Bottom tabs (mobile) */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-zinc-200/70 bg-white/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden dark:border-white/10 dark:bg-ink-950/90">
        <div className="grid grid-cols-5">
          {nav.slice(0, 4).map((n) => (
            <Link key={n.to} to={n.to} className={cn("relative flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-semibold transition", isActive(n.to) ? "text-brand-600 dark:text-brand-400" : "text-zinc-500")}>
              <span className={cn("text-xl transition-transform duration-300", isActive(n.to) && "-translate-y-0.5 scale-110")}>{n.icon}</span>
              {n.short}
              {n.badge ? <span className="absolute top-1.5 right-[calc(50%-18px)] size-4 rounded-full bg-sky-500 text-[10px] leading-4 text-white">{n.badge}</span> : null}
            </Link>
          ))}
          <button onClick={() => setMore(true)} className={cn("flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-semibold", more ? "text-brand-600" : "text-zinc-500")}>
            <LuEllipsis className="text-xl" />
            More
          </button>
        </div>
      </nav>

      {more && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 animate-fade-in bg-zinc-950/40" onClick={() => setMore(false)} />
          <div className="absolute inset-x-0 bottom-0 animate-slide-in-up rounded-t-3xl bg-white p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] dark:bg-zinc-900">
            <div className="mb-2 flex items-center justify-between px-2">
              <p className="font-bold">More</p>
              <button onClick={() => setMore(false)} className="p-2" aria-label="Close">
                <LuX />
              </button>
            </div>
            {nav.slice(4).map((n) => (
              <Link key={n.to} to={n.to} className="flex items-center gap-3 rounded-xl px-3 py-3.5 font-semibold hover:bg-zinc-50 dark:hover:bg-white/5">
                <span className="text-xl text-brand-600">{n.icon}</span>
                {n.label}
              </Link>
            ))}
            <button onClick={doLogout} className="flex w-full items-center gap-3 rounded-xl px-3 py-3.5 font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10">
              <LuLogOut className="text-xl" /> Log out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
