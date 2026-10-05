/**
 * Browser-side stand-in for the Python AI service, used only in demo mode.
 * The real service (ai-service/) is smarter and can use Claude or OpenAI.
 */
import type { BroadcastResult, ChatReply, CoachReport, ProductWriterResult, ReplyDrafts } from "../types";

interface P {
  id: number;
  name: string;
  price: number;
  category: string | null;
  description: string | null;
  available: boolean;
  featured: boolean;
}

const money = (v: number, c: string) => `${c} ${v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const COPY: Record<string, { emoji: string; hook: string; line: string; bullets: string[] }> = {
  Food: { emoji: "🍲", hook: "Freshly made and full of flavour", line: "is cooked fresh to order and packed so it reaches you hot", bullets: ["Cooked fresh to order", "Packed for delivery", "Generous portion"] },
  Drinks: { emoji: "🥤", hook: "Chilled, refreshing and made just right", line: "is the perfect cool-down for any time of day", bullets: ["Served chilled", "Great with any meal", "Freshly prepared"] },
  Snacks: { emoji: "🍿", hook: "The snack everyone keeps asking for", line: "is crunchy, tasty and made for sharing", bullets: ["Made fresh", "Perfect for sharing", "Great for parties"] },
  Clothes: { emoji: "👗", hook: "Look good, feel even better", line: "is stylish, comfortable and made to stand out", bullets: ["Comfortable fit", "Quality fabric", "Ask us about sizes"] },
  Shoes: { emoji: "👟", hook: "Step out in style", line: "gives you comfort and style for every day", bullets: ["Comfortable all day", "Durable finish", "Ask about sizes"] },
  Beauty: { emoji: "✨", hook: "Treat yourself to a little glow", line: "keeps you looking and feeling your best", bullets: ["Easy to use", "Great for daily care", "Gentle on skin"] },
  Other: { emoji: "🛍️", hook: "You're going to love this", line: "is a great pick that customers keep coming back for", bullets: ["Great quality", "Fair price", "Fast replies on WhatsApp"] },
};

const KEYWORDS: Record<string, string[]> = {
  Food: ["rice", "jollof", "waakye", "banku", "chicken", "fish", "tilapia", "soup", "stew", "pie", "meal", "pizza", "burger"],
  Drinks: ["juice", "sobolo", "drink", "smoothie", "tea", "coffee", "water"],
  Snacks: ["kelewele", "chips", "chin", "cookie", "doughnut", "snack"],
  Clothes: ["dress", "shirt", "kente", "skirt", "jacket", "top"],
  Shoes: ["shoe", "sneaker", "sandal", "slipper", "heel", "boot"],
  Beauty: ["cream", "lotion", "soap", "shea", "hair", "perfume", "oil"],
};

function guess(text: string): string {
  const t = text.toLowerCase();
  for (const [cat, keys] of Object.entries(KEYWORDS)) if (keys.some((k) => t.includes(k))) return cat;
  return "Other";
}

function title(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .map((w, i) => (/\d/.test(w) || (w[0] === w[0]?.toUpperCase() && w !== w.toUpperCase()) ? w : i > 0 && ["and", "with", "of", "&"].includes(w.toLowerCase()) ? w.toLowerCase() : w[0]!.toUpperCase() + w.slice(1).toLowerCase()))
    .join(" ");
}

const tag = (s: string) => "#" + s.replace(/['’]/g, "").split(/[^A-Za-z0-9]+/).filter(Boolean).map((w) => w[0]!.toUpperCase() + w.slice(1)).join("");

export function writeProduct(input: { name: string; category?: string | null; price?: number | null; notes?: string | null; tone?: string }, store: { name: string; currency: string; shopUrl: string }): ProductWriterResult {
  const category = input.category && COPY[input.category] ? input.category : guess(`${input.name} ${input.category ?? ""} ${input.notes ?? ""}`);
  const c = COPY[category] ?? COPY.Other!;
  const t = title(input.name);
  const notes = (input.notes ?? "").split(/[\n,;]+/).map((s) => s.trim()).filter(Boolean);
  const plain = ["professional", "luxury"].includes(input.tone ?? "");
  const hook = input.tone === "luxury" ? "Thoughtfully made for those who appreciate quality" : c.hook + (input.tone === "exciting" ? "!" : "");
  const lines = [`${plain ? "" : c.emoji + " "}${t}`, hook.replace(/!$/, "") + (plain ? "." : "!")];
  if (input.price) lines.push(`${plain ? "Price" : "💰 Only"}: ${money(input.price, store.currency)}`);
  lines.push(`${plain ? "Order here" : "🛒 Order here"}: ${store.shopUrl}`);
  return {
    title: t,
    description: `${hook.replace(/!$/, "")}. ${t} ${c.line}.${notes.length ? " " + notes.slice(0, 3).join("; ") + "." : ""} Order in a few taps and we'll confirm everything on WhatsApp.`,
    bullets: notes.length ? notes.slice(0, 5).map((n) => n[0]!.toUpperCase() + n.slice(1)) : c.bullets,
    caption: lines.join("\n"),
    hashtags: [tag(store.name), tag(category), "#ShopLocal", "#SmallBusiness", store.currency === "GHS" ? "#Ghana" : "#ShopOnline"],
    category,
    engine: "demo",
  };
}

const INTENTS: [string, string[]][] = [
  ["complaint", ["late", "cold", "wrong", "refund", "bad", "angry", "disappoint", "spoil", "broken"]],
  ["thanks", ["thank", "delicious", "enjoyed", "love it"]],
  ["payment", ["momo", "pay", "card", "transfer"]],
  ["delivery", ["deliver", "where is", "location", "how long", "when will", "track", "rider"]],
  ["price", ["how much", "price", "cost", "discount"]],
  ["availability", ["available", "in stock", "do you have", "size", "colour", "color"]],
  ["order", ["i want", "order", "buy", "send me"]],
  ["greeting", ["hello", "hi ", "hey", "good morning"]],
];

export function replyDrafts(message: string, store: { name: string; shopUrl: string }, order?: { number: string; status: string; customerName: string; address: string | null } | null): ReplyDrafts {
  const m = ` ${message.toLowerCase()} `;
  const intent = INTENTS.find(([, keys]) => keys.some((k) => m.includes(k)))?.[0] ?? "other";
  const name = order?.customerName?.split(" ")[0];
  const hi = name ? `Hi ${name}` : "Hi";
  const ref = order ? ` (order ${order.number})` : "";
  const status = order ? { NEW: "received and being prepared", PAID: "paid and being prepared", DELIVERED: "delivered", PENDING_PAYMENT: "waiting for payment", CANCELLED: "cancelled" }[order.status] : null;
  const T: Record<string, [string, string, string]> = {
    complaint: [`${hi}, I'm so sorry about this${ref}. Let me fix it right away.`, `${hi}, I'm really sorry${ref}. That's not the experience we want for you. Could you tell me what happened (a photo helps)? I'll sort it out immediately.`, `${hi}, thank you for telling us, and I'm truly sorry${ref}. Please share a photo or a few details and I'll arrange a replacement or another fix that works for you today. 🙏`],
    thanks: [`Thank you so much${name ? `, ${name}` : ""}! 🙏`, `Thank you so much! 🙏 We're really happy you enjoyed it. See you again soon at ${store.name}!`, `Thank you for choosing ${store.name}! 🙏 If you have a minute, tell a friend about us: ${store.shopUrl}`],
    payment: [`${hi}! You can pay with MoMo or card on our shop page. 😊`, `${hi}! You can pay with MoMo or card using the secure link in our shop. Send me a message once it's done and I'll confirm${ref}. 😊`, `${hi}! Paying is easy: MoMo or card on ${store.shopUrl}. As soon as the payment comes through we start on your order.`],
    delivery: status ? [`${hi}! Your order${ref} is ${status}.`, `${hi}! Your order${ref} is ${status}.${order?.address ? ` We'll bring it to ${order.address}.` : ""} I'll update you as soon as it's on the way. 😊`, `${hi}! Your order${ref} is ${status}. Delivery time depends on traffic, so I'll message you the moment the rider leaves.`] : [`${hi}! Yes, we deliver. Please send your location.`, `${hi}! Yes, we deliver. 😊 Send me your location or a landmark and I'll confirm the fee and time.`, `${hi}! We deliver across town. Share your location and I'll give you the exact fee and time. You can also order here: ${store.shopUrl}`],
    price: [`${hi}! All our prices are here: ${store.shopUrl}`, `${hi}! Thanks for asking. 😊 Which item would you like? I'll send the price and what's available today.`, `${hi}! Tell me the item and quantity and I'll give you the best price. For bigger orders, ask me about a bulk deal.`],
    availability: [`${hi}! Let me check for you right now.`, `${hi}! Let me confirm what we have right now. 😊 Tell me the size, colour or quantity and I'll set it aside.`, `${hi}! Stock moves fast, so tell me exactly what you'd like and I'll reserve it. You can also see everything here: ${store.shopUrl}`],
    order: [`Great choice! 😊 Please send your name and delivery location.`, `Great choice! 😊 To complete your order, please send: 1) your name, 2) your location, 3) the quantity.`, `Great choice! Send your name, location and quantity, or order and pay in a few taps here: ${store.shopUrl}`],
    greeting: [`Hello! Welcome to ${store.name}. 😊 How can I help?`, `Hello! 👋 Welcome to ${store.name}. What can I get for you today? ${store.shopUrl}`, `Hello and welcome to ${store.name}! Tell me what you're looking for, or browse everything here: ${store.shopUrl}`],
    other: [`Thanks for your message! 😊 Let me check and get back to you shortly.`, `${hi}! Thanks for reaching out to ${store.name}. 😊 Let me check this for you and I'll reply in a few minutes.`, `${hi}! Thank you for your message. I want to give you the right answer, so let me confirm and reply shortly.`],
  };
  const [a, b, c] = T[intent]!;
  return { intent, drafts: [{ label: "Quick", text: a }, { label: "Friendly", text: b }, { label: "Detailed", text: c }], engine: "demo" };
}

export function chat(message: string, products: P[], store: { name: string; currency: string; whatsappOrders: boolean; onlinePayments: boolean }): ChatReply {
  const m = message.toLowerCase();
  const avail = products.filter((p) => p.available);
  const featured = [...avail].sort((a, b) => Number(b.featured) - Number(a.featured));
  const line = (p: P) => `• ${p.name}: ${money(p.price, store.currency)}`;
  const reply = (text: string, picks: P[]): ChatReply => ({ reply: [text, ...picks.map(line)].join("\n"), suggestions: picks.map((p) => p.id), engine: "demo" });

  if (/deliver|location|how long|pickup/.test(m)) return reply(`Yes! ${store.name} can arrange delivery. Add items to your cart and type your location at checkout. The seller will confirm the fee and time.`, []);
  if (/pay|momo|card|cash/.test(m)) return reply(store.onlinePayments ? "You can pay securely online with Mobile Money or card at checkout, or send your order on WhatsApp." : "Send your order on WhatsApp and the seller will share how to pay.", []);
  const budget = m.match(/(under|below|less than|max|budget|i have|i've got|i got|only have)\s*(?:ghs|cedis?|₦|\$)?\s*(\d+)/);
  if (/go(es)? (well |nice |good )?with|pair|combo|to go with|along with/.test(m)) {
    const terms = m.split(/[^a-z0-9]+/).filter((w) => w.length > 3);
    const main = avail.find((p) => terms.some((w) => p.name.toLowerCase().includes(w)));
    if (main) {
      const room = budget ? Number(budget[2]) - main.price : null;
      const sides = avail.filter((p) => p.id !== main.id && p.category !== main.category && (room === null || p.price <= room)).sort((a, b) => Number(b.featured) - Number(a.featured) || a.price - b.price);
      if (sides.length) return reply(room !== null ? `${main.name} (${money(main.price, store.currency)}) plus one of these stays within ${money(Number(budget![2]), store.currency)}:` : `${main.name} goes great with:`, [main, ...sides.slice(0, 2)]);
    }
  }
  if (budget) {
    const limit = Number(budget[2]);
    const picks = avail.filter((p) => p.price <= limit).sort((a, b) => b.price - a.price).slice(0, 3);
    return picks.length ? reply(`Here's what you can get for ${money(limit, store.currency)} or less:`, picks) : reply(`Nothing is under ${money(limit, store.currency)} right now. These are the most affordable:`, [...avail].sort((a, b) => a.price - b.price).slice(0, 2));
  }
  if (/cheap|affordable|lowest/.test(m)) {
    const drink = /drink|juice/.test(m);
    const pool = drink ? avail.filter((p) => p.category === "Drinks") : avail;
    return reply("Here are our most affordable options:", [...(pool.length ? pool : avail)].sort((a, b) => a.price - b.price).slice(0, 3));
  }
  if (/recommend|best|popular|suggest|special/.test(m)) return reply(`Customers love these at ${store.name}:`, featured.slice(0, 3));
  const words = m.split(/[^a-z0-9]+/).filter((w) => w.length > 2);
  const scored = products
    .map((p) => ({ p, s: words.reduce((n, w) => n + (p.name.toLowerCase().includes(w) ? 3 : 0) + ((p.category ?? "").toLowerCase().startsWith(w.slice(0, 4)) ? 2 : 0) + ((p.description ?? "").toLowerCase().includes(w) ? 1 : 0), 0) }))
    .filter((x) => x.s >= 2)
    .sort((a, b) => b.s - a.s);
  if (scored.length) {
    const inStock = scored.filter((x) => x.p.available).map((x) => x.p);
    if (inStock.length) {
      if (/how much|price|cost/.test(m)) return reply(`${inStock[0]!.name} is ${money(inStock[0]!.price, store.currency)}.`, inStock.slice(0, 1));
      return reply("Good choice! Here's what I found:", inStock.slice(0, 3));
    }
    return reply(`Sorry, ${scored[0]!.p.name} is sold out right now. You could try:`, featured.slice(0, 2));
  }
  if (/^\s*(hi|hello|hey)/.test(m)) return reply(`Hello! Welcome to ${store.name}. Here are some favourites:`, featured.slice(0, 3));
  return reply("I couldn't find that exactly, but here are some popular picks. Tell me your budget and I'll help!", featured.slice(0, 3));
}

export function coach(
  store: { currency: string; premium: boolean; productLimit: number | null },
  products: (P & { stockQty: number | null })[],
  orders: { status: string; total: number; createdAt: string; paidAt: string | null; channel: string; items: { productId: number | null; name: string; quantity: number; lineTotal: number }[] }[],
): CoachReport {
  const cur = store.currency;
  const now = Date.now();
  const day = 86_400_000;
  const sale = (o: (typeof orders)[number]) => o.status === "PAID" || o.status === "DELIVERED";
  const when = (o: (typeof orders)[number]) => new Date(o.paidAt ?? o.createdAt).getTime();
  const sum = (from: number, to: number) => orders.filter((o) => sale(o) && now - when(o) >= from * day && now - when(o) < to * day);
  const w1 = sum(0, 7), w0 = sum(7, 14), m1 = sum(0, 30);
  const r7 = w1.reduce((n, o) => n + o.total, 0), rPrev = w0.reduce((n, o) => n + o.total, 0), r30 = m1.reduce((n, o) => n + o.total, 0);
  const change = rPrev > 0 ? Math.round(((r7 - rPrev) / rPrev) * 100) : null;
  const units = new Map<number, number>();
  const revenue = new Map<number, number>();
  m1.forEach((o) => o.items.forEach((i) => i.productId && (units.set(i.productId, (units.get(i.productId) ?? 0) + i.quantity), revenue.set(i.productId, (revenue.get(i.productId) ?? 0) + i.lineTotal))));
  const best = products.filter((p) => units.get(p.id)).sort((a, b) => (revenue.get(b.id) ?? 0) - (revenue.get(a.id) ?? 0));
  const restock = products.filter((p) => !p.available && units.get(p.id));
  const slow = products.filter((p) => p.available && !units.get(p.id));
  const stale = orders.filter((o) => o.status === "NEW" && now - new Date(o.createdAt).getTime() > 2 * day).length;
  const insights: CoachReport["insights"] = [];
  const actions: string[] = [];
  if (!products.length) (insights.push({ title: "Add your first products", detail: "Shops with at least 5 products with photos get far more orders.", impact: "high", kind: "growth" }), actions.push("Add 5 products with photos"));
  if (stale) (insights.push({ title: `${stale} order${stale > 1 ? "s" : ""} waiting over 2 days`, detail: "Orders that sit in 'New' for long often become lost customers. Confirm or update them today.", impact: "high", kind: "ops" }), actions.push("Reply to waiting orders"));
  restock.slice(0, 1).forEach((p) => (insights.push({ title: `Restock ${p.name}`, detail: `It sold ${units.get(p.id)} in 30 days but is sold out. You're missing sales every day it's out.`, impact: "high", kind: "stock" }), actions.push(`Restock ${p.name}`)));
  if (change !== null && change >= 10) insights.push({ title: `Sales up ${change}% this week`, detail: `You made ${money(r7, cur)} in the last 7 days, up from ${money(rPrev, cur)}. Keep doing what worked.`, impact: "medium", kind: "trend" });
  if (change !== null && change <= -10) (insights.push({ title: `Sales down ${Math.abs(change)}% this week`, detail: "A quick broadcast to past customers usually brings orders back.", impact: "high", kind: "trend" }), actions.push("Send a broadcast"));
  if (best[0]) (insights.push({ title: `${best[0].name} is your star`, detail: `It brought in ${money(revenue.get(best[0].id) ?? 0, cur)} from ${units.get(best[0].id)} sold in 30 days. Keep it at the top of your shop.`, impact: "medium", kind: "growth" }), actions.push(`Post ${best[0].name} on your Status`));
  if (slow.length) insights.push({ title: "Some products aren't selling", detail: `No sales in 30 days for: ${slow.slice(0, 3).map((p) => p.name).join(", ")}. Try better photos or bundle them with a best seller.`, impact: "low", kind: "pricing" });
  if (m1.length) insights.push({ title: `Average order: ${money(r30 / m1.length, cur)}`, detail: "Offer a combo (a main plus a drink) to raise the value of each order.", impact: "low", kind: "growth" });
  if (!insights.length) insights.push({ title: "All looks good", detail: "Keep sharing your link and replying fast.", impact: "low", kind: "growth" });
  const headline = !m1.length ? "Let's get your first sales coming in" : change !== null && change >= 10 ? `Nice! Sales are up ${change}% this week` : change !== null && change <= -10 ? `Sales dipped ${Math.abs(change)}% this week: here's how to bounce back` : "A steady week. Here's how to grow";
  return {
    headline,
    summary: m1.length ? `You made ${money(r7, cur)} in the last 7 days from ${w1.length} orders, compared with ${money(rPrev, cur)} the week before. Over 30 days you sold ${money(r30, cur)} across ${m1.length} orders.` : "There are no paid orders in the last 30 days yet. These steps get most new shops their first orders.",
    insights: insights.slice(0, 6),
    actions: Array.from(new Set(actions.length ? actions : ["Share your shop link today"])).slice(0, 3),
    stats: [
      { label: "Sales, last 7 days", value: money(r7, cur), trend: change !== null ? `${change >= 0 ? "+" : ""}${change}%` : null },
      { label: "Sales, last 30 days", value: money(r30, cur), trend: null },
      { label: "Orders, last 30 days", value: String(m1.length), trend: null },
      { label: "Average order", value: money(m1.length ? r30 / m1.length : 0, cur), trend: null },
    ],
    engine: "demo",
  };
}

export function broadcast(store: { name: string; currency: string; shopUrl: string }, products: P[], goal: string, tone: string): BroadcastResult {
  const plain = ["professional", "luxury"].includes(tone);
  const g = goal.toLowerCase();
  const [emoji, head] = /sale|off|deal|promo/.test(g) ? ["🎉", "Special offer this week!"] : /new|arrival/.test(g) ? ["✨", "New in the shop!"] : /weekend|friday|saturday/.test(g) ? ["🔥", "Your weekend treat is here!"] : ["🛍️", `Fresh from ${store.name}!`];
  const lines = [`${plain ? "" : emoji + " "}${head}`, "", `*${goal.replace(/\.$/, "")}*`, "", ...products.slice(0, 6).map((p) => `• ${p.name}: ${money(p.price, store.currency)}`), "", `${plain ? "Order here" : "🛒 Order here"}: ${store.shopUrl}`, "Or just reply to this message to order.", `Thank you for supporting ${store.name}!${plain ? "" : " 🙏"}`];
  const top = products[0];
  return {
    message: lines.join("\n"),
    short: `${plain ? "" : emoji + " "}${top ? `${top.name} now ${money(top.price, store.currency)}!` : head} Order: ${store.shopUrl}`,
    engine: "demo",
  };
}
