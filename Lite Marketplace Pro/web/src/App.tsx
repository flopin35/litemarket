import { lazy, Suspense, useState, type ReactNode } from "react";
import { LuRotateCcw, LuX } from "react-icons/lu";
import { Logo } from "./components/bits";
import { DEMO_MODE } from "./config";
import { matchPath, useLocation } from "./lib/router";

const Landing = lazy(() => import("./pages/landing/Landing"));
const AuthPages = lazy(() => import("./pages/auth/AuthPages"));
const AppArea = lazy(() => import("./pages/app/AppShell"));
const Storefront = lazy(() => import("./pages/shop/Storefront"));
const ThankYou = lazy(() => import("./pages/shop/ThankYou"));
const DemoPay = lazy(() => import("./pages/pay/DemoPay"));
const NotFound = lazy(() => import("./pages/NotFound"));

function FullPageLoader() {
  return (
    <div className="flex min-h-dvh items-center justify-center">
      <div className="flex animate-pulse flex-col items-center gap-4">
        <Logo compact />
        <div className="h-1 w-24 overflow-hidden rounded-full bg-zinc-200 dark:bg-white/10">
          <div className="h-full w-1/2 animate-[marquee_1s_linear_infinite] rounded-full bg-brand-500" />
        </div>
      </div>
    </div>
  );
}

function DemoBanner() {
  const [hidden, setHidden] = useState(() => sessionStorage.getItem("lm-demo-banner") === "off");
  if (hidden) return null;
  return (
    <div className="fixed right-4 bottom-4 z-[60] hidden animate-slide-in-up items-center gap-3 rounded-full border border-amber-300/60 bg-amber-50/95 py-1.5 pr-1.5 pl-4 text-xs font-semibold text-amber-900 shadow-lg backdrop-blur sm:flex dark:border-amber-400/30 dark:bg-amber-950/90 dark:text-amber-200">
      Live demo: data is saved in your browser, payments are simulated
      <button
        onClick={() => {
          Object.keys(localStorage).filter((k) => k.startsWith("lm-")).forEach((k) => localStorage.removeItem(k));
          window.location.href = "/";
        }}
        className="inline-flex items-center gap-1 rounded-full bg-amber-200/70 px-3 py-1 hover:bg-amber-200 dark:bg-amber-400/20"
      >
        <LuRotateCcw className="size-3" /> Reset
      </button>
      <button
        onClick={() => {
          sessionStorage.setItem("lm-demo-banner", "off");
          setHidden(true);
        }}
        className="rounded-full p-1 hover:bg-amber-200/70 dark:hover:bg-amber-400/20"
        aria-label="Hide demo notice"
      >
        <LuX className="size-3.5" />
      </button>
    </div>
  );
}

export default function App() {
  const { path } = useLocation();
  let page: ReactNode;
  let key = path;
  let m: Record<string, string> | null;

  if (path === "/") page = <Landing />;
  else if (["/login", "/signup", "/forgot-password", "/reset-password"].includes(path)) page = <AuthPages />;
  else if (path === "/app" || path.startsWith("/app/")) {
    page = <AppArea />;
    key = "/app";
  } else if ((m = matchPath("/s/:slug/thanks", path))) page = <ThankYou slug={m.slug!} />;
  else if ((m = matchPath("/s/:slug", path))) page = <Storefront slug={m.slug!} />;
  else if (path === "/pay/demo") page = <DemoPay />;
  else page = <NotFound />;

  return (
    <>
      <Suspense fallback={<FullPageLoader />}>
        <div key={key} className="page-enter">
          {page}
        </div>
      </Suspense>
      {DEMO_MODE && !path.startsWith("/s/") && !path.startsWith("/pay/") && <DemoBanner />}
    </>
  );
}
