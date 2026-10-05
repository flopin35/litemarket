/**
 * A tiny client-side router (history API). Enough for this app, no dependency needed.
 *   <Link to="/app/products">        navigate("/login", { replace: true })
 *   const { path, query } = useLocation();   const params = matchPath("/s/:slug", path)
 */
import { useSyncExternalStore, type AnchorHTMLAttributes, type MouseEvent, type ReactNode } from "react";

const EVENT = "lm:navigate";

function subscribe(callback: () => void) {
  window.addEventListener("popstate", callback);
  window.addEventListener(EVENT, callback);
  return () => {
    window.removeEventListener("popstate", callback);
    window.removeEventListener(EVENT, callback);
  };
}

const snapshot = () => window.location.pathname + window.location.search;

export function navigate(to: string, opts: { replace?: boolean } = {}) {
  if (/^https?:\/\//.test(to)) {
    window.location.href = to;
    return;
  }
  if (opts.replace) window.history.replaceState(null, "", to);
  else window.history.pushState(null, "", to);
  window.dispatchEvent(new Event(EVENT));
  if (!to.includes("#")) window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
}

export function useLocation() {
  const full = useSyncExternalStore(subscribe, snapshot, snapshot);
  const [path, search = ""] = full.split("?");
  return { path: path || "/", query: new URLSearchParams(search) };
}

/** "/s/:slug/thanks" matched against "/s/amas-kitchen/thanks" gives { slug: "amas-kitchen" }. */
export function matchPath(pattern: string, path: string): Record<string, string> | null {
  const p = pattern.split("/").filter(Boolean);
  const a = path.split("/").filter(Boolean);
  const wildcard = p[p.length - 1] === "*";
  if (wildcard ? a.length < p.length - 1 : a.length !== p.length) return null;
  const params: Record<string, string> = {};
  for (let i = 0; i < p.length; i++) {
    const seg = p[i]!;
    if (seg === "*") break;
    if (seg.startsWith(":")) params[seg.slice(1)] = decodeURIComponent(a[i]!);
    else if (seg !== a[i]) return null;
  }
  return params;
}

type LinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & { to: string; replace?: boolean; children: ReactNode };

export function Link({ to, replace, onClick, children, ...rest }: LinkProps) {
  function handle(e: MouseEvent<HTMLAnchorElement>) {
    onClick?.(e);
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if (rest.target === "_blank" || /^https?:\/\//.test(to) || to.startsWith("mailto:")) return;
    e.preventDefault();
    navigate(to, { replace });
  }
  return (
    <a href={to} onClick={handle} {...rest}>
      {children}
    </a>
  );
}
