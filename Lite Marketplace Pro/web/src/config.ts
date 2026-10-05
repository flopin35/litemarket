/**
 * Brand and environment settings. Rebranding? Change BRAND here, the colours in index.css
 * and the server's BRAND_NAME. See docs/CUSTOMIZE.md.
 */
export const BRAND = {
  name: "Lite Marketplace",
  tagline: "Create your online store in minutes. Sell on WhatsApp.",
  supportEmail: "support@example.com",
  defaultCurrency: "GHS",
};

const env = import.meta.env;

/** Where the API lives. Empty = same domain as the website (recommended). */
export const API_URL: string = (env.VITE_API_URL ?? "").replace(/\/+$/, "");

/**
 * Demo mode runs the whole app in the browser with sample data. No backend required.
 * Turned on by `--mode demo` (npm run dev -- --mode demo, npm run build:demo) or VITE_DEMO_MODE=true.
 */
export const DEMO_MODE: boolean =
  env.MODE === "demo" || String(env.VITE_DEMO_MODE ?? "").toLowerCase() === "true";

/** Turns "/uploads/..." from the API into a full URL when the API is on another domain. */
export function assetUrl(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  if (url.startsWith("/uploads/")) return API_URL + url;
  return url;
}
