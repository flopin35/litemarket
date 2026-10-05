/**
 * Demo mode: a tiny copy of the Java API that runs in the browser and saves to localStorage.
 * It answers the same URLs with the same JSON, so every page works without a server.
 * Turned on with VITE_DEMO_MODE=true (see .env.example). Not used in production builds.
 */
import type {
  AdminOverview,
  AdminPayment,
  Dashboard,
  MeView,
  Order,
  OrderStatus,
  PaymentStatus,
  PayoutRow,
  PlanView,
  Product,
  PublicConfig,
  SellerRow,
  Shop,
  StoreView,
} from "../types";
import * as ai from "./demoAi";

// ── Data ──────────────────────────────────────────────────────────────────────

interface DUser { id: number; email: string; password: string; fullName: string | null; role: "SELLER" | "ADMIN"; status: "ACTIVE" | "SUSPENDED"; createdAt: string }
interface DStore {
  id: number; ownerId: number; name: string; slug: string; whatsapp: string; currency: string; about: string | null; accentColor: string | null; logoUrl: string | null;
  onlinePayments: boolean; whatsappOrders: boolean; publicLink: string | null; planCode: string; planExpiresAt: string | null; aiUsed: number; aiPeriod: string | null;
  paystackSubaccount: string | null; flutterwaveSubaccount: string | null; stripeAccount: string | null; createdAt: string;
}
interface DProduct extends Omit<Product, "available"> { storeId: number }
interface DOrder extends Order { storeId: number; stockDeducted: boolean }
interface DPayment {
  reference: string; purpose: "SUBSCRIPTION" | "ORDER"; provider: string; status: "PENDING" | "SUCCESS" | "FAILED"; amount: number; currency: string; storeId: number;
  orderId: number | null; planCode: string | null; paid: boolean; payerEmail: string | null; note: string | null; settlement: string; platformFee: number | null; sellerAmount: number | null; createdAt: string; paidAt: string | null;
}
interface DB { seq: number; users: DUser[]; stores: DStore[]; products: DProduct[]; orders: DOrder[]; payments: DPayment[] }

const KEY = "lm-demo-db";
const SESSION = "lm-demo-session";
const PLANS = [
  { code: "WEEKLY", name: "Weekly", price: 30, days: 7, popular: false },
  { code: "MONTHLY", name: "Monthly", price: 100, days: 30, popular: true },
  { code: "QUARTER", name: "3 Months", price: 230, days: 91, popular: false },
  { code: "FIVE_MONTHS", name: "5 Months", price: 400, days: 152, popular: false },
];
const FREE_LIMIT = 5;
const FREE_AI = 50;
const PAID_AI = 2000;
const DAY = 86_400_000;

class HttpError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message);
  }
}

// Loaded on every request (see mockFetch) so several tabs stay in sync.
let db: DB = { seq: 0, users: [], stores: [], products: [], orders: [], payments: [] };

function load(): DB {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as DB;
  } catch {
    /* fall through */
  }
  const fresh = seed();
  persist(fresh);
  return fresh;
}

function persist(d: DB = db) {
  try {
    localStorage.setItem(KEY, JSON.stringify(d));
  } catch {
    /* storage full: keep working in memory */
  }
}

const iso = (msAgo = 0) => new Date(Date.now() - msAgo).toISOString();
const code = (n: number) => Array.from({ length: n }, () => "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[Math.floor(Math.random() * 32)]).join("");
const round = (v: number) => Math.round(v * 100) / 100;

function seed(): DB {
  const d: DB = { seq: 100, users: [], stores: [], products: [], orders: [], payments: [] };
  const id = () => ++d.seq;
  const mkUser = (email: string, password: string, fullName: string, role: DUser["role"]) => {
    const u: DUser = { id: id(), email, password, fullName, role, status: "ACTIVE", createdAt: iso(40 * DAY) };
    d.users.push(u);
    return u;
  };
  const mkStore = (owner: DUser, name: string, slug: string, whatsapp: string, about: string, accent: string, plan?: string) => {
    const s: DStore = {
      id: id(), ownerId: owner.id, name, slug, whatsapp, currency: "GHS", about, accentColor: accent, logoUrl: null, onlinePayments: true, whatsappOrders: true, publicLink: null,
      planCode: plan ?? "FREE", planExpiresAt: plan ? iso(-21 * DAY) : null, aiUsed: 3, aiPeriod: new Date().toISOString().slice(0, 7), paystackSubaccount: null, flutterwaveSubaccount: null, stripeAccount: null, createdAt: iso(38 * DAY),
    };
    d.stores.push(s);
    return s;
  };
  const mkProduct = (s: DStore, name: string, price: number, category: string, description: string, featured = false, stockQty: number | null = null) => {
    const p: DProduct = { id: id(), storeId: s.id, name, price, category, description, imageUrl: null, inStock: true, stockQty, featured, createdAt: iso(30 * DAY) };
    d.products.push(p);
    return p;
  };

  const admin = mkUser("admin@litemarket.dev", "admin12345", "Platform Admin", "ADMIN");
  mkStore(admin, "Lite Marketplace HQ", "hq", "233200000000", "The admin's own shop.", "#0F9D7A");
  const ama = mkUser("demo@litemarket.dev", "demo12345", "Ama Mensah", "SELLER");
  const shop = mkStore(ama, "Ama's Kitchen", "amas-kitchen", "233241234567", "Home-cooked Ghanaian meals and drinks, delivered hot around Accra. Order on WhatsApp or pay with MoMo.", "#E8590C", "MONTHLY");
  const menu = [
    mkProduct(shop, "Jollof Rice & Grilled Chicken", 45, "Food", "Smoky party jollof with a quarter grilled chicken, fried plantain and fresh salad.", true),
    mkProduct(shop, "Waakye Special", 35, "Food", "Waakye with gari, spaghetti, egg, wele, fish and our house shito.", true),
    mkProduct(shop, "Banku & Grilled Tilapia", 60, "Food", "Two balls of banku with a whole grilled tilapia, pepper and onions.", false, 8),
    mkProduct(shop, "Fried Rice & Shito", 40, "Food", "Vegetable fried rice with chicken and a side of hot black shito."),
    mkProduct(shop, "Kelewele (Spicy Plantain)", 15, "Snacks", "Ripe plantain cubes fried with ginger and pepper."),
    mkProduct(shop, "Meat Pie (2 pieces)", 10, "Snacks", "Buttery, flaky pastry filled with minced beef. Baked fresh every morning.", false, 3),
    mkProduct(shop, "Sobolo (500ml)", 12, "Drinks", "Chilled hibiscus drink with ginger, pineapple and cloves."),
    mkProduct(shop, "Fresh Pineapple Juice (500ml)", 15, "Drinks", "100% pressed pineapple, no added sugar.", false, 0),
  ];
  const kofi = mkUser("kofi@kicks.example", "demo12345", "Kofi Asante", "SELLER");
  const kicks = mkStore(kofi, "Kofi Kicks", "kofi-kicks", "233201112233", "Clean sneakers, fair prices. Delivery in Kumasi and Accra.", "#2563EB", "MONTHLY");
  mkProduct(kicks, "Classic White Sneakers", 350, "Shoes", "Leather upper, cushioned sole. Sizes 39-45.", true);
  mkProduct(kicks, "Street Runner Trainers", 420, "Shoes", "Breathable mesh, made for long days.");
  const efua = mkUser("efua@glow.example", "demo12345", "Efua Owusu", "SELLER");
  const glow = mkStore(efua, "Glow by Efua", "glow-by-efua", "233559998877", "Handmade shea butter and natural skincare.", "#DB2777");
  mkProduct(glow, "Whipped Shea Body Butter", 80, "Beauty", "Raw shea, coconut oil and vanilla. 250ml jar.", true);

  const customers = ["Kofi Boateng", "Efua Owusu", "Yaw Asante", "Akosua Darko", "Kwame Mensah", "Abena Osei", "Kojo Mensah", "Adwoa Sarpong"];
  const places = ["East Legon, near A&C Mall", "Osu, Oxford Street", "Madina Zongo Junction", "Spintex, Coca-Cola roundabout", "Achimota Mall", "Dansoman Last Stop"];
  let r = 7;
  const rand = (n: number) => ((r = (r * 9301 + 49297) % 233280), Math.floor((r / 233280) * n));
  for (let i = 0; i < 26; i++) {
    const created = iso((6 + i * 11 + rand(5)) * 3_600_000);
    const lines = 1 + rand(3);
    const items = Array.from({ length: lines }, () => {
      const p = menu[rand(6)]!;
      const q = 1 + rand(3);
      return { productId: p.id, name: p.name, unitPrice: p.price, quantity: q, lineTotal: p.price * q };
    });
    const status: OrderStatus = i < 3 ? "NEW" : i === 7 ? "CANCELLED" : i % 4 === 0 ? "PAID" : "DELIVERED";
    const channel = i % 3 === 0 ? "ONLINE" : "WHATSAPP";
    d.orders.push({
      id: id(), storeId: shop.id, number: `LM-DEMO${10 + i}`, customerName: customers[rand(customers.length)]!, customerPhone: `23324${1000000 + rand(8999999)}`, customerEmail: null,
      address: places[rand(places.length)]!, note: null, channel, status, total: items.reduce((n, x) => n + x.lineTotal, 0), currency: "GHS",
      paymentProvider: channel === "ONLINE" && (status === "PAID" || status === "DELIVERED") ? "paystack" : null, itemsSummary: items.map((x) => `${x.quantity} x ${x.name}`).join(", "), items,
      createdAt: created, paidAt: status === "PAID" || status === "DELIVERED" ? new Date(new Date(created).getTime() + 20 * 60_000).toISOString() : null, stockDeducted: true,
    });
  }
  d.payments.push({ reference: "SUB-DEMO1", purpose: "SUBSCRIPTION", provider: "paystack", status: "SUCCESS", amount: 100, currency: "GHS", storeId: kicks.id, orderId: null, planCode: "MONTHLY", paid: true, payerEmail: kofi.email, note: null, settlement: "NONE", platformFee: null, sellerAmount: null, createdAt: iso(9 * DAY), paidAt: iso(9 * DAY) });
  return d;
}

// ── Views (same shapes as the Java DTOs) ──────────────────────────────────────

const premium = (s: DStore) => s.planCode !== "FREE" && !!s.planExpiresAt && new Date(s.planExpiresAt).getTime() > Date.now();
const aiUsed = (s: DStore) => (s.aiPeriod === new Date().toISOString().slice(0, 7) ? s.aiUsed : 0);
const planName = (c: string) => (c === "FREE" ? "Free" : PLANS.find((p) => p.code === c)?.name ?? c);
const shopUrl = (s: DStore) => `${window.location.origin}/s/${s.slug}`;
const available = (p: DProduct) => p.inStock && (p.stockQty === null || p.stockQty > 0);

function storeView(s: DStore): StoreView {
  return { id: s.id, name: s.name, slug: s.slug, whatsapp: s.whatsapp, currency: s.currency, about: s.about, accentColor: s.accentColor, logoUrl: s.logoUrl, onlinePayments: s.onlinePayments, whatsappOrders: s.whatsappOrders, publicLink: s.publicLink, shopUrl: shopUrl(s) };
}

function planView(s: DStore): PlanView {
  const p = premium(s);
  return {
    code: p ? s.planCode : "FREE", name: planName(p ? s.planCode : "FREE"), premium: p, expiresAt: p ? s.planExpiresAt : null,
    daysLeft: p ? Math.ceil((new Date(s.planExpiresAt!).getTime() - Date.now()) / DAY) : 0, productLimit: p ? null : FREE_LIMIT, aiCreditsUsed: aiUsed(s), aiCreditsLimit: p ? PAID_AI : FREE_AI,
  };
}

function meView(u: DUser): MeView {
  const s = db.stores.find((x) => x.ownerId === u.id);
  return { id: u.id, email: u.email, fullName: u.fullName, role: u.role, store: s ? storeView(s) : null, plan: s ? planView(s) : null };
}

const productView = (p: DProduct): Product => {
  const { storeId: _s, ...rest } = p;
  void _s;
  return { ...rest, available: available(p) };
};
const orderView = (o: DOrder): Order => {
  const { storeId: _s, stockDeducted: _d, ...rest } = o;
  void _s;
  void _d;
  return rest;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function json(status: number, body: unknown): Response {
  if (status === 204) return new Response(null, { status });
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

function auth(token: string | null): DUser {
  const id = Number(token?.startsWith("demo.") ? token.slice(5) : NaN);
  const u = db.users.find((x) => x.id === id);
  if (!u) throw new HttpError(401, "UNAUTHORIZED", "Please log in.");
  return u;
}
const storeOf = (u: DUser) => {
  const s = db.stores.find((x) => x.ownerId === u.id);
  if (!s) throw new HttpError(404, "NOT_FOUND", "You don't have a store yet.");
  return s;
};
const session = (u: DUser) => {
  localStorage.setItem(SESSION, String(u.id));
  return { accessToken: `demo.${u.id}`, expiresIn: 900, me: meView(u) };
};
const cleanPhone = (raw: string) => {
  const d = raw.replace(/\D/g, "");
  return d.startsWith("0") ? "233" + d.slice(1) : d.startsWith("00") ? d.slice(2) : d;
};
const slugify = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/['’]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "my-shop";
const wa = (phone: string, text: string) => `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
const fmt = (v: number, c: string) => `${c} ${v.toFixed(2)}`;

function takeCredit(s: DStore) {
  const month = new Date().toISOString().slice(0, 7);
  if (s.aiPeriod !== month) (s.aiPeriod = month), (s.aiUsed = 0);
  const limit = premium(s) ? PAID_AI : FREE_AI;
  if (s.aiUsed >= limit) throw new HttpError(402, "AI_CREDITS", `You've used all ${limit} AI credits this month. Upgrade your plan for more.`);
  s.aiUsed++;
}

function changeStatus(o: DOrder, next: OrderStatus) {
  if (next === o.status) return;
  const sale = next === "PAID" || next === "DELIVERED";
  if (sale) {
    o.paidAt ??= iso();
    if (!o.stockDeducted) adjustStock(o, -1), (o.stockDeducted = true);
  } else if (next === "CANCELLED" && o.stockDeducted) adjustStock(o, 1), (o.stockDeducted = false);
  o.status = next;
}
function adjustStock(o: DOrder, dir: number) {
  o.items.forEach((i) => {
    const p = db.products.find((x) => x.id === i.productId);
    if (p && p.stockQty !== null) p.stockQty = Math.max(0, p.stockQty + dir * i.quantity);
  });
}

function cartOrder(s: DStore, body: any, channel: "WHATSAPP" | "ONLINE", status: OrderStatus): DOrder {
  const items = (body.items ?? []).map((l: { productId: number; quantity: number }) => {
    const p = db.products.find((x) => x.id === l.productId && x.storeId === s.id);
    if (!p) throw new HttpError(400, "BAD_REQUEST", "One of the products is no longer in this shop. Refresh the page.");
    if (!available(p)) throw new HttpError(400, "BAD_REQUEST", `${p.name} is sold out.`);
    return { productId: p.id, name: p.name, unitPrice: p.price, quantity: l.quantity, lineTotal: p.price * l.quantity };
  });
  if (!items.length) throw new HttpError(400, "VALIDATION", "Your cart is empty.");
  const c = body.customer ?? {};
  if (!c.name || !c.phone || !c.address) throw new HttpError(400, "VALIDATION", "Please fill in your name, phone and address.");
  const o: DOrder = {
    id: ++db.seq, storeId: s.id, number: `LM-${code(6)}`, customerName: c.name, customerPhone: cleanPhone(c.phone), customerEmail: c.email ?? null, address: c.address, note: c.note ?? null,
    channel, status, total: round(items.reduce((n: number, i: { lineTotal: number }) => n + i.lineTotal, 0)), currency: s.currency, paymentProvider: null,
    itemsSummary: items.map((i: { quantity: number; name: string }) => `${i.quantity} x ${i.name}`).join(", "), items, createdAt: iso(), paidAt: null, stockDeducted: false,
  };
  db.orders.push(o);
  return o;
}

function paymentStatus(p: DPayment): PaymentStatus {
  const s = db.stores.find((x) => x.id === p.storeId)!;
  const o = p.orderId ? db.orders.find((x) => x.id === p.orderId) : undefined;
  return {
    reference: p.reference, status: p.status, purpose: p.purpose, provider: p.provider, amount: p.amount, currency: p.currency, planCode: p.planCode, planName: p.planCode ? planName(p.planCode) : null,
    planExpiresAt: p.purpose === "SUBSCRIPTION" && p.status === "SUCCESS" ? s.planExpiresAt : null, orderNumber: o?.number ?? null, storeName: s.name, storeSlug: s.slug,
    whatsappUrl: o && p.status === "SUCCESS" ? wa(s.whatsapp, `Hello ${s.name}! I just paid ${fmt(p.amount, p.currency)} for order ${o.number}. Payment reference: ${p.reference}.`) : null,
    message: p.status === "SUCCESS" ? "Payment received. Thank you!" : p.status === "PENDING" ? "We're waiting for the payment to be confirmed." : p.note ?? "The payment didn't go through.",
  };
}

function fulfill(p: DPayment) {
  if (p.status === "SUCCESS") return;
  p.status = "SUCCESS";
  p.paidAt = iso();
  const s = db.stores.find((x) => x.id === p.storeId)!;
  if (p.purpose === "SUBSCRIPTION" && p.planCode) {
    const plan = PLANS.find((x) => x.code === p.planCode)!;
    const base = premium(s) ? new Date(s.planExpiresAt!).getTime() : Date.now();
    s.planExpiresAt = new Date(base + plan.days * DAY).toISOString();
    s.planCode = plan.code;
  } else if (p.orderId) {
    const o = db.orders.find((x) => x.id === p.orderId);
    if (o) (o.paymentProvider = p.provider), changeStatus(o, "PAID");
  }
}

async function shrinkImage(file: File): Promise<string> {
  const dataUrl = await new Promise<string>((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result));
    r.onerror = rej;
    r.readAsDataURL(file);
  });
  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = rej;
      i.src = dataUrl;
    });
    const scale = Math.min(1, 900 / Math.max(img.width, img.height));
    const c = document.createElement("canvas");
    c.width = Math.round(img.width * scale);
    c.height = Math.round(img.height * scale);
    c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL("image/jpeg", 0.82);
  } catch {
    return dataUrl;
  }
}

// ── Router ────────────────────────────────────────────────────────────────────

type Handler = (ctx: { body: any; token: string | null; params: string[]; query: URLSearchParams; form?: FormData }) => unknown | Promise<unknown>;
const routes: [string, RegExp, Handler][] = [];
const on = (method: string, pattern: string, h: Handler) => routes.push([method, new RegExp("^" + pattern.replace(/:[a-zA-Z]+/g, "([^/]+)") + "$"), h]);

on("GET", "/api/config", (): PublicConfig => ({
  brandName: "Lite Marketplace", supportEmail: "support@example.com", currency: "GHS", freeProductLimit: FREE_LIMIT, freeAiCredits: FREE_AI, paidAiCredits: PAID_AI, plans: PLANS,
  providers: [{ id: "demo", label: "Demo payment (test mode)" }], demoPayments: true,
}));
on("GET", "/api/health", () => ({ status: "ok" }));

on("POST", "/api/auth/signup", ({ body }) => {
  const email = String(body.email ?? "").trim().toLowerCase();
  if (!/^\S+@\S+\.\S+$/.test(email)) throw new HttpError(400, "VALIDATION", "email must be a well-formed email address");
  if (String(body.password ?? "").length < 8) throw new HttpError(400, "VALIDATION", "password must be at least 8 characters");
  if (!String(body.storeName ?? "").trim()) throw new HttpError(400, "VALIDATION", "storeName must not be blank");
  if (db.users.some((u) => u.email === email)) throw new HttpError(409, "CONFLICT", "There is already an account with that email. Log in instead.");
  const u: DUser = { id: ++db.seq, email, password: body.password, fullName: body.fullName ?? null, role: "SELLER", status: "ACTIVE", createdAt: iso() };
  db.users.push(u);
  let slug = slugify(body.storeName);
  for (let n = 2; db.stores.some((s) => s.slug === slug); n++) slug = `${slugify(body.storeName)}-${n}`;
  db.stores.push({
    id: ++db.seq, ownerId: u.id, name: body.storeName.trim(), slug, whatsapp: cleanPhone(body.whatsapp ?? ""), currency: "GHS", about: "Order on WhatsApp or pay online. We reply fast!", accentColor: "#0F9D7A",
    logoUrl: null, onlinePayments: true, whatsappOrders: true, publicLink: null, planCode: "FREE", planExpiresAt: null, aiUsed: 0, aiPeriod: null, paystackSubaccount: null, flutterwaveSubaccount: null, stripeAccount: null, createdAt: iso(),
  });
  return session(u);
});
on("POST", "/api/auth/login", ({ body }) => {
  const u = db.users.find((x) => x.email === String(body.email ?? "").trim().toLowerCase());
  if (!u || u.password !== body.password) throw new HttpError(401, "UNAUTHORIZED", "That email and password don't match.");
  if (u.status !== "ACTIVE") throw new HttpError(403, "FORBIDDEN", "This account is suspended.");
  return session(u);
});
on("POST", "/api/auth/refresh", () => {
  const u = db.users.find((x) => x.id === Number(localStorage.getItem(SESSION)));
  if (!u) throw new HttpError(401, "UNAUTHORIZED", "Please log in.");
  return session(u);
});
on("POST", "/api/auth/logout", () => (localStorage.removeItem(SESSION), { message: "Logged out" }));
on("POST", "/api/auth/forgot-password", () => ({ message: "If that email has an account, a reset link is on its way." }));
on("POST", "/api/auth/reset-password", () => {
  throw new HttpError(400, "BAD_REQUEST", "Password reset emails are not sent in the demo.");
});
on("GET", "/api/me", ({ token }) => meView(auth(token)));
on("PUT", "/api/me/password", ({ token, body }) => {
  const u = auth(token);
  if (u.password !== body.currentPassword) throw new HttpError(400, "BAD_REQUEST", "Your current password isn't right.");
  u.password = body.newPassword;
  return { message: "Password changed." };
});

on("GET", "/api/store", ({ token }) => storeView(storeOf(auth(token))));
on("PUT", "/api/store", ({ token, body }) => {
  const s = storeOf(auth(token));
  if (body.slug !== s.slug && db.stores.some((x) => x.slug === body.slug)) throw new HttpError(409, "CONFLICT", "That shop address is taken. Try another one.");
  if (!body.onlinePayments && !body.whatsappOrders) throw new HttpError(400, "BAD_REQUEST", "Keep at least one way for customers to order.");
  Object.assign(s, { name: body.name, slug: body.slug, whatsapp: cleanPhone(body.whatsapp), currency: body.currency, about: body.about, accentColor: body.accentColor, logoUrl: body.logoUrl, onlinePayments: body.onlinePayments, whatsappOrders: body.whatsappOrders, publicLink: body.publicLink });
  return storeView(s);
});

on("POST", "/api/uploads", async ({ token, form }) => {
  auth(token);
  const file = form?.get("file");
  if (!(file instanceof File)) throw new HttpError(400, "BAD_REQUEST", "Choose a photo first.");
  return { url: await shrinkImage(file) };
});

on("GET", "/api/products", ({ token }) => {
  const s = storeOf(auth(token));
  return db.products.filter((p) => p.storeId === s.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map(productView);
});
on("POST", "/api/products", ({ token, body }) => {
  const s = storeOf(auth(token));
  if (!premium(s) && db.products.filter((p) => p.storeId === s.id).length >= FREE_LIMIT) throw new HttpError(402, "PLAN_LIMIT", `The Free plan has room for ${FREE_LIMIT} products. Upgrade for unlimited products.`);
  const p: DProduct = { id: ++db.seq, storeId: s.id, name: body.name, price: round(body.price), category: body.category, description: body.description, imageUrl: body.imageUrl, inStock: body.inStock, stockQty: body.stockQty, featured: body.featured, createdAt: iso() };
  db.products.push(p);
  return productView(p);
});
on("PUT", "/api/products/:id", ({ token, body, params }) => {
  const s = storeOf(auth(token));
  const p = db.products.find((x) => x.id === Number(params[0]) && x.storeId === s.id);
  if (!p) throw new HttpError(404, "NOT_FOUND", "Product not found.");
  Object.assign(p, { name: body.name, price: round(body.price), category: body.category, description: body.description, imageUrl: body.imageUrl, inStock: body.inStock, stockQty: body.stockQty, featured: body.featured });
  return productView(p);
});
on("DELETE", "/api/products/:id", ({ token, params }) => {
  const s = storeOf(auth(token));
  db.products = db.products.filter((x) => !(x.id === Number(params[0]) && x.storeId === s.id));
  return undefined;
});

on("GET", "/api/orders", ({ token, query }) => {
  const s = storeOf(auth(token));
  const st = query.get("status");
  return db.orders.filter((o) => o.storeId === s.id && (!st || o.status === st)).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map(orderView);
});
on("POST", "/api/orders", ({ token, body }) => {
  const s = storeOf(auth(token));
  const o: DOrder = { id: ++db.seq, storeId: s.id, number: `LM-${code(6)}`, customerName: body.customerName, customerPhone: body.customerPhone, customerEmail: null, address: body.address, note: body.note, channel: "MANUAL", status: "NEW", total: round(body.total), currency: s.currency, paymentProvider: null, itemsSummary: body.itemsSummary, items: [], createdAt: iso(), paidAt: null, stockDeducted: false };
  db.orders.push(o);
  changeStatus(o, body.status);
  return orderView(o);
});
const ownOrder = (token: string | null, id: string) => {
  const s = storeOf(auth(token));
  const o = db.orders.find((x) => x.id === Number(id) && x.storeId === s.id);
  if (!o) throw new HttpError(404, "NOT_FOUND", "Order not found.");
  return o;
};
on("GET", "/api/orders/:id", ({ token, params }) => orderView(ownOrder(token, params[0]!)));
on("PUT", "/api/orders/:id", ({ token, params, body }) => {
  const o = ownOrder(token, params[0]!);
  Object.assign(o, { customerName: body.customerName, customerPhone: body.customerPhone, address: body.address, note: body.note });
  if (o.channel === "MANUAL") Object.assign(o, { itemsSummary: body.itemsSummary, total: round(body.total) });
  changeStatus(o, body.status);
  return orderView(o);
});
on("PATCH", "/api/orders/:id/status", ({ token, params, body }) => {
  const o = ownOrder(token, params[0]!);
  changeStatus(o, body.status);
  return orderView(o);
});

on("GET", "/api/dashboard", ({ token }): Dashboard => {
  const s = storeOf(auth(token));
  const orders = db.orders.filter((o) => o.storeId === s.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const sales = orders.filter((o) => o.status === "PAID" || o.status === "DELIVERED");
  const today = new Date(new Date().toISOString().slice(0, 10)).getTime();
  const last30 = Array.from({ length: 30 }, (_, k) => {
    const d = new Date(today - (29 - k) * DAY).toISOString().slice(0, 10);
    const day = sales.filter((o) => (o.paidAt ?? o.createdAt).slice(0, 10) === d);
    return { date: d, total: round(day.reduce((n, o) => n + o.total, 0)), orders: day.length };
  });
  const top = new Map<string, { productId: number | null; name: string; quantity: number; revenue: number }>();
  sales.filter((o) => Date.now() - new Date(o.paidAt ?? o.createdAt).getTime() < 30 * DAY).forEach((o) =>
    o.items.forEach((i) => {
      const t = top.get(i.name) ?? { productId: i.productId, name: i.name, quantity: 0, revenue: 0 };
      t.quantity += i.quantity;
      t.revenue += i.lineTotal;
      top.set(i.name, t);
    }),
  );
  const revenue = sales.reduce((n, o) => n + o.total, 0);
  return {
    currency: s.currency, revenue: round(revenue), revenue30: round(last30.reduce((n, d) => n + d.total, 0)), paidOrders: sales.length, newOrders: orders.filter((o) => o.status === "NEW").length,
    totalOrders: orders.length, productCount: db.products.filter((p) => p.storeId === s.id).length, averageOrder: sales.length ? round(revenue / sales.length) : 0, plan: planView(s),
    last7: last30.slice(23), last30, topProducts: [...top.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 5), recentOrders: orders.slice(0, 6).map(orderView), shopUrl: shopUrl(s),
  };
});

const openShop = (slug: string) => {
  const s = db.stores.find((x) => x.slug === slug);
  const owner = s && db.users.find((u) => u.id === s.ownerId);
  if (!s || owner?.status !== "ACTIVE") throw new HttpError(404, "NOT_FOUND", "This shop doesn't exist.");
  return s;
};
on("GET", "/api/shops/:slug", ({ params }): Shop => {
  const s = openShop(params[0]!);
  const products = db.products.filter((p) => p.storeId === s.id).sort((a, b) => Number(b.featured) - Number(a.featured) || Number(available(b)) - Number(available(a)) || b.createdAt.localeCompare(a.createdAt));
  return {
    name: s.name, slug: s.slug, about: s.about, whatsapp: s.whatsapp, currency: s.currency, accentColor: s.accentColor, logoUrl: s.logoUrl, whatsappOrders: s.whatsappOrders, onlinePayments: s.onlinePayments,
    providers: s.onlinePayments ? [{ id: "demo", label: "Demo payment (test mode)" }] : [], categories: [...new Set(products.map((p) => p.category).filter(Boolean) as string[])].sort(),
    products: products.map((p) => ({ id: p.id, name: p.name, price: p.price, category: p.category, description: p.description, imageUrl: p.imageUrl, available: available(p), featured: p.featured, stockLeft: p.stockQty !== null && p.stockQty <= 5 ? p.stockQty : null })),
    assistant: true,
  };
});
on("POST", "/api/shops/:slug/orders", ({ params, body }) => {
  const s = openShop(params[0]!);
  const o = cartOrder(s, body, "WHATSAPP", "NEW");
  const text = [`Hello ${s.name}! I'd like to order (${o.number}):`, ...o.items.map((i) => `• ${i.quantity} x ${i.name} (${fmt(i.lineTotal, o.currency)})`), `Total: ${fmt(o.total, o.currency)}`, `Name: ${o.customerName}`, `Phone: ${o.customerPhone}`, `Deliver to: ${o.address}`, ...(o.note ? [`Note: ${o.note}`] : [])].join("\n");
  return { orderNumber: o.number, total: o.total, currency: o.currency, whatsappUrl: wa(s.whatsapp, text) };
});
on("POST", "/api/shops/:slug/checkout", ({ params, body }) => {
  const s = openShop(params[0]!);
  const o = cartOrder(s, body, "ONLINE", "PENDING_PAYMENT");
  const p: DPayment = { reference: `PAY-${code(12)}`, purpose: "ORDER", provider: "demo", status: "PENDING", amount: o.total, currency: o.currency, storeId: s.id, orderId: o.id, planCode: null, paid: false, payerEmail: o.customerEmail, note: null, settlement: "NONE", platformFee: 0, sellerAmount: o.total, createdAt: iso(), paidAt: null };
  db.payments.push(p);
  const q = new URLSearchParams({ reference: p.reference, amount: String(p.amount), currency: p.currency, title: s.name, return: `${location.origin}/s/${s.slug}/thanks`, cancel: `${location.origin}/s/${s.slug}?checkout=cancelled` });
  return { reference: p.reference, checkoutUrl: `/pay/demo?${q}` };
});
on("POST", "/api/shops/:slug/assistant", ({ params, body }) => {
  const s = openShop(params[0]!);
  const last = [...(body.messages ?? [])].reverse().find((m: { role: string }) => m.role === "user")?.content ?? "";
  try {
    takeCredit(s);
  } catch {
    return { reply: 'Our assistant is taking a short break. Add what you like to your cart and tap "Order on WhatsApp". We\'ll help you there!', suggestions: [], engine: "none" };
  }
  const products = db.products.filter((p) => p.storeId === s.id).map((p) => ({ ...p, price: p.price, available: available(p) }));
  return ai.chat(last, products, s);
});

on("POST", "/api/payments/verify", ({ body }) => {
  const p = db.payments.find((x) => x.reference === body.reference);
  if (!p) throw new HttpError(404, "NOT_FOUND", "We can't find that payment.");
  if (p.paid) fulfill(p);
  return paymentStatus(p);
});
on("POST", "/api/payments/demo/:ref/complete", ({ params }) => {
  const p = db.payments.find((x) => x.reference === decodeURIComponent(params[0]!));
  if (!p) throw new HttpError(404, "NOT_FOUND", "We can't find that payment.");
  p.paid = true;
  fulfill(p);
  return paymentStatus(p);
});

on("GET", "/api/billing", ({ token }) => {
  const s = storeOf(auth(token));
  return {
    currency: "GHS", plans: PLANS, current: planView(s), providers: [{ id: "demo", label: "Demo payment (test mode)" }],
    history: db.payments.filter((p) => p.storeId === s.id && p.purpose === "SUBSCRIPTION").sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map((p) => ({ reference: p.reference, purpose: p.purpose, provider: p.provider, status: p.status, amount: p.amount, currency: p.currency, planCode: p.planCode, planName: p.planCode ? planName(p.planCode) : null, note: p.note, createdAt: p.createdAt, paidAt: p.paidAt })),
  };
});
on("POST", "/api/billing/checkout", ({ token, body }) => {
  const u = auth(token);
  const s = storeOf(u);
  const plan = PLANS.find((x) => x.code === body.planCode);
  if (!plan) throw new HttpError(400, "BAD_REQUEST", "Choose a plan.");
  const p: DPayment = { reference: `SUB-${code(12)}`, purpose: "SUBSCRIPTION", provider: "demo", status: "PENDING", amount: plan.price, currency: "GHS", storeId: s.id, orderId: null, planCode: plan.code, paid: false, payerEmail: u.email, note: null, settlement: "NONE", platformFee: null, sellerAmount: null, createdAt: iso(), paidAt: null };
  db.payments.push(p);
  const q = new URLSearchParams({ reference: p.reference, amount: String(p.amount), currency: "GHS", title: `Lite Marketplace: ${plan.name} plan`, return: `${location.origin}/app/billing/callback`, cancel: `${location.origin}/app/billing?cancelled=1` });
  return { reference: p.reference, checkoutUrl: `/pay/demo?${q}` };
});

on("GET", "/api/ai/usage", ({ token }) => {
  const s = storeOf(auth(token));
  return { used: aiUsed(s), limit: premium(s) ? PAID_AI : FREE_AI, premium: premium(s) };
});
on("POST", "/api/ai/product-writer", ({ token, body }) => {
  const s = storeOf(auth(token));
  takeCredit(s);
  return ai.writeProduct(body, { name: s.name, currency: s.currency, shopUrl: shopUrl(s) });
});
on("POST", "/api/ai/reply-drafts", ({ token, body }) => {
  const s = storeOf(auth(token));
  takeCredit(s);
  const o = body.orderId ? db.orders.find((x) => x.id === body.orderId && x.storeId === s.id) : null;
  return ai.replyDrafts(body.message, { name: s.name, shopUrl: shopUrl(s) }, o);
});
on("POST", "/api/ai/broadcast", ({ token, body }) => {
  const s = storeOf(auth(token));
  takeCredit(s);
  const mine = db.products.filter((p) => p.storeId === s.id && available(p));
  const picked = body.productIds?.length ? mine.filter((p) => body.productIds.includes(p.id)) : mine.sort((a, b) => Number(b.featured) - Number(a.featured)).slice(0, 4);
  return ai.broadcast({ name: s.name, currency: s.currency, shopUrl: shopUrl(s) }, picked.map((p) => ({ ...p, available: true })), body.goal ?? "", body.tone ?? "exciting");
});
on("POST", "/api/ai/coach", ({ token }) => {
  const s = storeOf(auth(token));
  takeCredit(s);
  const products = db.products.filter((p) => p.storeId === s.id).map((p) => ({ ...p, available: available(p) }));
  return ai.coach({ currency: s.currency, premium: premium(s), productLimit: premium(s) ? null : FREE_LIMIT }, products, db.orders.filter((o) => o.storeId === s.id));
});

const admin = (token: string | null) => {
  const u = auth(token);
  if (u.role !== "ADMIN") throw new HttpError(403, "FORBIDDEN", "You don't have access to this.");
  return u;
};
const sellerRow = (s: DStore): SellerRow => {
  const u = db.users.find((x) => x.id === s.ownerId)!;
  const p = premium(s);
  return {
    storeId: s.id, userId: u.id, storeName: s.name, slug: s.slug, email: u.email, whatsapp: s.whatsapp, plan: p ? s.planCode : "FREE", planName: planName(p ? s.planCode : "FREE"), planExpiresAt: p ? s.planExpiresAt : null, premium: p,
    products: db.products.filter((x) => x.storeId === s.id).length, status: u.status, role: u.role, createdAt: s.createdAt, flutterwaveSubaccount: s.flutterwaveSubaccount, paystackSubaccount: s.paystackSubaccount, stripeAccount: s.stripeAccount, shopUrl: shopUrl(s),
  };
};
on("GET", "/api/admin/overview", ({ token }): AdminOverview => {
  admin(token);
  const ok = db.payments.filter((p) => p.status === "SUCCESS");
  return {
    users: db.users.length, stores: db.stores.length, products: db.products.length, orders: db.orders.length, payingStores: db.stores.filter(premium).length,
    subscriptionRevenue: ok.filter((p) => p.purpose === "SUBSCRIPTION" && p.provider !== "demo").reduce((n, p) => n + p.amount, 0), orderVolume: ok.filter((p) => p.purpose === "ORDER" && p.provider !== "demo").reduce((n, p) => n + p.amount, 0),
    owedToSellers: 0, currency: "GHS", aiOnline: true, providers: [{ id: "demo", label: "Demo payment (test mode)" }], demoPayments: true, commissionPercent: 0, emailEnabled: false,
  };
});
on("GET", "/api/admin/sellers", ({ token, query }) => {
  admin(token);
  const q = (query.get("q") ?? "").toLowerCase();
  return db.stores.filter((s) => !q || `${s.name} ${s.slug} ${s.whatsapp} ${db.users.find((u) => u.id === s.ownerId)?.email}`.toLowerCase().includes(q)).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map(sellerRow);
});
on("POST", "/api/admin/sellers/:id/plan", ({ token, params, body }) => {
  admin(token);
  const s = db.stores.find((x) => x.id === Number(params[0]));
  if (!s) throw new HttpError(404, "NOT_FOUND", "Store not found.");
  if (body.planCode === "FREE") (s.planCode = "FREE"), (s.planExpiresAt = null);
  else {
    const p: DPayment = { reference: `MAN-${code(12)}`, purpose: "SUBSCRIPTION", provider: "manual", status: "PENDING", amount: PLANS.find((x) => x.code === body.planCode)!.price, currency: "GHS", storeId: s.id, orderId: null, planCode: body.planCode, paid: true, payerEmail: null, note: "Given by admin", settlement: "NONE", platformFee: null, sellerAmount: null, createdAt: iso(), paidAt: null };
    db.payments.push(p);
    fulfill(p);
  }
  return sellerRow(s);
});
on("POST", "/api/admin/sellers/:id/status", ({ token, params, body }) => {
  const me = admin(token);
  const s = db.stores.find((x) => x.id === Number(params[0]))!;
  if (s.ownerId === me.id) throw new HttpError(400, "BAD_REQUEST", "You can't suspend yourself.");
  db.users.find((u) => u.id === s.ownerId)!.status = body.status;
  return sellerRow(s);
});
on("PUT", "/api/admin/sellers/:id/split", ({ token, params, body }) => {
  admin(token);
  const s = db.stores.find((x) => x.id === Number(params[0]))!;
  Object.assign(s, { paystackSubaccount: body.paystackSubaccount || null, flutterwaveSubaccount: body.flutterwaveSubaccount || null, stripeAccount: body.stripeAccount || null });
  return sellerRow(s);
});
on("GET", "/api/admin/payments", ({ token }): AdminPayment[] => {
  admin(token);
  return [...db.payments].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map((p) => {
    const s = db.stores.find((x) => x.id === p.storeId)!;
    return { reference: p.reference, purpose: p.purpose, provider: p.provider, status: p.status, amount: p.amount, currency: p.currency, storeName: s.name, storeSlug: s.slug, planName: p.planCode ? planName(p.planCode) : null, payerEmail: p.payerEmail, settlement: p.settlement, platformFee: p.platformFee, sellerAmount: p.sellerAmount, createdAt: p.createdAt, paidAt: p.paidAt, note: p.note };
  });
});
on("GET", "/api/admin/payouts", ({ token }): PayoutRow[] => (admin(token), []));
on("POST", "/api/admin/payouts/:id/paid", ({ token }) => (admin(token), { updated: 0 }));

export async function mockFetch(method: string, rawPath: string, body: unknown, form: FormData | undefined, token: string | null): Promise<Response> {
  await new Promise((r) => setTimeout(r, 180 + Math.random() * 220)); // feel like a network
  db = load();
  const [path, search = ""] = rawPath.split("?");
  for (const [m, re, handler] of routes) {
    const match = m === method && re.exec(path!);
    if (!match) continue;
    try {
      const result = await handler({ body: body ?? {}, token, params: match.slice(1), query: new URLSearchParams(search), form });
      persist();
      return json(result === undefined ? 204 : 200, result);
    } catch (e) {
      if (e instanceof HttpError) return json(e.status, { error: e.code, message: e.message });
      console.error(e);
      return json(500, { error: "SERVER_ERROR", message: "Something went wrong in the demo." });
    }
  }
  return json(404, { error: "NOT_FOUND", message: "Not found." });
}
