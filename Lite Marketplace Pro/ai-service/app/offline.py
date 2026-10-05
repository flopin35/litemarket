"""Built-in rule-based engine.

Answers every AI feature without an API key, so the template works out of the box and keeps
working if the AI provider is down. Output is deterministic and only uses facts it was given.
"""
from __future__ import annotations

import re
from typing import Iterable, Optional

from .analytics import Analysis, display_stats, money
from .schemas import (BroadcastIn, BroadcastOut, CoachIn, CoachOut, Draft, Insight, ProductCtx,
                      ProductWriterIn, ProductWriterOut, ReplyDraftsIn, ReplyDraftsOut, ShopChatIn,
                      ShopChatOut)

ENGINE = "offline"

CATEGORIES = ["Food", "Drinks", "Snacks", "Clothes", "Shoes", "Bags", "Beauty", "Phones & gadgets",
              "Home", "Services", "Other"]

CATEGORY_KEYWORDS: dict[str, list[str]] = {
    "Food": ["rice", "jollof", "waakye", "banku", "fufu", "kenkey", "chicken", "fish", "tilapia", "beef", "goat",
             "soup", "stew", "meal", "pizza", "burger", "shawarma", "noodles", "pasta", "bread", "cake", "pie",
             "kebab", "yam", "beans", "egg", "sandwich", "salad", "wings", "fries", "suya", "plate"],
    "Drinks": ["juice", "sobolo", "drink", "water", "smoothie", "tea", "coffee", "soda", "yoghurt", "yogurt", "milk",
               "wine", "beer", "asaana", "brukina", "cocktail", "shake", "zobo", "malt"],
    "Snacks": ["chips", "kelewele", "chin", "biscuit", "cookie", "doughnut", "donut", "popcorn", "nuts",
               "groundnut", "bofrot", "puff", "plantain chips", "crisps", "snack"],
    "Clothes": ["dress", "shirt", "t-shirt", "tshirt", "top", "skirt", "trouser", "jeans", "kaftan", "kente",
                "jacket", "hoodie", "gown", "suit", "blouse", "shorts", "agbada", "smock", "jumpsuit", "ankara"],
    "Shoes": ["shoe", "shoes", "sneaker", "sneakers", "sandal", "sandals", "slipper", "slippers", "heel", "heels",
              "boot", "boots", "loafer", "loafers", "slides", "trainers"],
    "Bags": ["bag", "purse", "backpack", "handbag", "wallet", "tote", "clutch"],
    "Beauty": ["cream", "lotion", "soap", "shea", "oil", "perfume", "wig", "hair", "lipstick", "makeup", "serum",
               "nail", "lashes", "butter", "scrub", "fragrance", "skincare"],
    "Phones & gadgets": ["phone", "iphone", "samsung", "charger", "earbuds", "airpods", "headphone", "headphones",
                         "laptop", "cable", "power bank", "powerbank", "speaker", "smartwatch", "tablet", "case"],
    "Home": ["pillow", "bedsheet", "curtain", "pot", "pan", "plates", "cup", "chair", "table", "lamp", "rug", "mat",
             "blender", "fan", "decor", "candle", "towel"],
    "Services": ["service", "cleaning", "repair", "tutoring", "lesson", "makeover", "braiding", "installation",
                 "design", "photography", "printing", "booking", "consultation"],
}

COPY: dict[str, dict] = {
    "Food": {"emoji": "🍲", "hook": "Freshly made and full of flavour",
             "line": "is cooked fresh to order and packed so it reaches you hot",
             "bullets": ["Cooked fresh to order", "Packed for delivery", "Generous portion"],
             "cta": "Order now and we'll bring it to you hot!"},
    "Drinks": {"emoji": "🥤", "hook": "Chilled, refreshing and made just right",
               "line": "is the perfect cool-down for any time of day",
               "bullets": ["Served chilled", "Great with any meal", "Freshly prepared"],
               "cta": "Grab yours before it's finished!"},
    "Snacks": {"emoji": "🍿", "hook": "The snack everyone keeps asking for",
               "line": "is crunchy, tasty and made for sharing (or not!)",
               "bullets": ["Made fresh", "Perfect for sharing", "Great for parties and offices"],
               "cta": "Order a pack for yourself and one for a friend."},
    "Clothes": {"emoji": "👗", "hook": "Look good, feel even better",
                "line": "is stylish, comfortable and made to stand out",
                "bullets": ["Comfortable fit", "Quality fabric", "Ask us about sizes and colours"],
                "cta": "Send us your size and we'll set one aside for you."},
    "Shoes": {"emoji": "👟", "hook": "Step out in style",
              "line": "gives you comfort and style for every day",
              "bullets": ["Comfortable all day", "Durable finish", "Ask us about available sizes"],
              "cta": "Tell us your size and we'll confirm it's available."},
    "Bags": {"emoji": "👜", "hook": "The bag that goes with everything",
             "line": "is roomy, sturdy and easy to style",
             "bullets": ["Spacious inside", "Strong straps and stitching", "Goes with any outfit"],
             "cta": "Order now while stock lasts."},
    "Beauty": {"emoji": "✨", "hook": "Treat yourself to a little glow",
               "line": "is part of an easy routine that keeps you looking and feeling your best",
               "bullets": ["Easy to use", "Great for daily care", "Ask us how to get the best results"],
               "cta": "Order today and start glowing."},
    "Phones & gadgets": {"emoji": "📱", "hook": "Tech that just works",
                         "line": "is reliable, practical and ready for everyday use",
                         "bullets": ["Tested before delivery", "Ask us about warranty", "Fast delivery"],
                         "cta": "Message us to confirm stock and delivery."},
    "Home": {"emoji": "🏠", "hook": "Make your space feel like home",
             "line": "adds comfort and style to your home",
             "bullets": ["Practical and stylish", "Built to last", "Great as a gift"],
             "cta": "Order now and upgrade your space."},
    "Services": {"emoji": "🛠️", "hook": "Done right, the first time",
                 "line": "is handled by people who care about the details",
                 "bullets": ["Reliable and on time", "Fair, clear pricing", "Book in minutes"],
                 "cta": "Message us to book your slot."},
    "Other": {"emoji": "🛍️", "hook": "You're going to love this",
              "line": "is a great pick, and customers keep coming back for it",
              "bullets": ["Great quality", "Fair price", "Fast replies on WhatsApp"],
              "cta": "Order now and we'll take care of the rest."},
}

COUNTRY_TAG = {"GHS": "#Ghana", "NGN": "#Nigeria", "KES": "#Kenya", "ZAR": "#SouthAfrica", "UGX": "#Uganda",
               "TZS": "#Tanzania", "RWF": "#Rwanda", "XOF": "#Senegal", "USD": None, "GBP": "#UK"}

SMALL_WORDS = {"and", "or", "of", "with", "in", "on", "the", "a", "an", "for", "to", "&"}
STOPWORDS = {"i", "a", "an", "the", "do", "you", "have", "is", "are", "it", "me", "my", "for", "of", "to", "and",
             "please", "pls", "can", "what", "which", "any", "some", "want", "need", "would", "like", "get",
             "show", "your", "there", "this", "that", "with", "in", "on", "how", "much", "does", "u"}


# ── Helpers ─────────────────────────────────────────────────────────────────────

def words(text: str) -> list[str]:
    return re.findall(r"[a-z0-9']+", (text or "").lower())


def smart_title(name: str) -> str:
    out = []
    for i, w in enumerate(name.strip().split()):
        if any(c.isdigit() for c in w) or (w[:1].isupper() and not w.isupper()) or (w.isupper() and len(w) <= 4):
            out.append(w)  # keep "500ml", "iPhone", "XL", "Ama's"
        elif i > 0 and w.lower() in SMALL_WORDS:
            out.append(w.lower())
        else:
            out.append(w[:1].upper() + w[1:].lower())
    return " ".join(out)


def guess_category(*texts: Optional[str]) -> str:
    blob = " " + " ".join(t or "" for t in texts).lower() + " "
    best, score = "Other", 0
    for cat, keys in CATEGORY_KEYWORDS.items():
        s = sum(1 for k in keys if re.search(r"(?<![a-z])" + re.escape(k) + r"(?![a-z])", blob))
        if s > score:
            best, score = cat, s
    return best


def normalise_category(category: Optional[str], *texts: Optional[str]) -> str:
    if category:
        for c in CATEGORIES:
            if c.lower() == category.strip().lower():
                return c
    return guess_category(category, *texts)


def tag(text: str) -> str:
    cleaned = re.sub(r"['’]", "", text)
    return "#" + "".join(w[:1].upper() + w[1:] for w in re.findall(r"[A-Za-z0-9]+", cleaned))


def fmt_price(price: Optional[float], currency: str) -> Optional[str]:
    return None if price is None else money(price, currency)


def no_emoji(tone: str) -> bool:
    return tone.lower() in ("professional", "formal", "luxury")


def product_line(p: ProductCtx, currency: str) -> str:
    price = fmt_price(p.price, currency)
    return f"• {p.name}" + (f": {price}" if price else "")


# ── Product writer ──────────────────────────────────────────────────────────────

def write_product(inp: ProductWriterIn) -> ProductWriterOut:
    p, s = inp.product, inp.store
    category = normalise_category(p.category, p.name, p.notes)
    copy = COPY.get(category, COPY["Other"])
    title = smart_title(p.name)[:120]
    tone = inp.tone.lower()

    notes = [n.strip(" .-•") for n in re.split(r"[\n;,]+", p.notes or "") if n.strip(" .-•")]
    bullets = [n[:1].upper() + n[1:] for n in notes][:5] or list(copy["bullets"])

    hook = copy["hook"]
    if tone in ("exciting", "fun", "playful"):
        hook = hook + "!"
    elif tone == "luxury":
        hook = "Thoughtfully made for those who appreciate quality"
    description = f"{hook}. {title} {copy['line']}."
    if notes:
        description += " " + "; ".join(notes[:3]).rstrip(".") + "."
    if s.whatsapp_orders:
        description += " Order in a few taps, and we'll confirm everything with you on WhatsApp."
    else:
        description += " Order in a few taps and pay securely online."

    price = fmt_price(p.price, s.currency)
    plain = no_emoji(tone)
    lines = [f"{'' if plain else copy['emoji'] + ' '}{title}", hook.rstrip("!") + ("." if plain else "!")]
    if price:
        lines.append(f"{'Price' if plain else '💰 Only'}: {price}")
    lines.append(copy["cta"])
    if s.shop_url:
        lines.append(f"{'Order here' if plain else '🛒 Order here'}: {s.shop_url}")
    caption = "\n".join(lines)

    hashtags = [tag(s.name), tag(category.replace("&", "and")), "#ShopLocal", "#SmallBusiness"]
    country = COUNTRY_TAG.get(s.currency.upper())
    if country:
        hashtags.append(country)
    main_word = next((w for w in words(p.name) if len(w) > 3 and w not in STOPWORDS), None)
    if main_word:
        hashtags.append(tag(main_word))
    hashtags = list(dict.fromkeys(h for h in hashtags if len(h) > 1))[:8]

    return ProductWriterOut(title=title, description=description[:2000], bullets=bullets, caption=caption[:1200],
                            hashtags=hashtags, category=category, engine=ENGINE)


# ── Reply drafts ────────────────────────────────────────────────────────────────

INTENTS: list[tuple[str, list[str]]] = [
    ("complaint", ["late", "not received", "never came", "bad", "cold", "wrong", "refund", "angry", "disappoint",
                   "complain", "spoil", "spoilt", "rotten", "broken", "damaged", "not happy", "terrible", "waiting too"]),
    ("thanks", ["thank", "thanks", "received it", "enjoyed", "delicious", "love it", "loved it", "great job"]),
    ("payment", ["momo", "mobile money", "pay ", "payment", "account number", "card", "transfer", "paid"]),
    ("delivery", ["deliver", "delivery", "location", "where are you", "where is", "track", "on the way", "arrive",
                  "shipping", "how long", "when will", "pickup", "pick up", "come to", "dispatch", "rider"]),
    ("price", ["how much", "price", "cost", "last price", "discount", "reduce", "cheaper", "bulk"]),
    ("availability", ["available", "in stock", "do you have", "still have", "size", "colour", "color", "left"]),
    ("order", ["i want", "i'd like", "id like", "order", "buy", "send me", "i need", "reserve"]),
    ("greeting", ["hello", "hi", "hey", "good morning", "good afternoon", "good evening"]),
]

STATUS_TEXT = {
    "NEW": "received and being prepared",
    "PENDING_PAYMENT": "waiting for payment",
    "PAID": "paid and being prepared",
    "DELIVERED": "marked as delivered",
    "CANCELLED": "cancelled",
}


def detect_intent(message: str) -> str:
    m = " " + message.lower() + " "
    for intent, keys in INTENTS:
        for k in keys:
            if (k.strip() in ("hi", "hey") and re.search(r"\b" + k.strip() + r"\b", m)) or \
                    (k.strip() not in ("hi", "hey") and k in m):
                return intent
    return "other"


def draft_replies(inp: ReplyDraftsIn) -> ReplyDraftsOut:
    s, o = inp.store, inp.order
    intent = detect_intent(inp.message)
    plain = no_emoji(inp.tone)
    smile = "" if plain else " 😊"
    pray = "" if plain else " 🙏"
    name = (o.customer_name.split()[0] if o and o.customer_name else "").strip()
    hi = f"Hi {name}" if name else "Hi"
    link = f" You can also see everything here: {s.shop_url}" if s.shop_url else ""
    order_ref = f" (order {o.number})" if o and o.number else ""
    status = STATUS_TEXT.get((o.status or "").upper(), "being processed") if o else None
    total = fmt_price(o.total, s.currency) if o and o.total is not None else None

    if intent == "complaint":
        quick = f"{hi}, I'm so sorry about this{order_ref}. Let me fix it right away."
        friendly = (f"{hi}, I'm really sorry{order_ref}. That's not the experience we want for you. "
                    f"Could you tell me what happened (a photo helps)? I'll sort it out immediately.")
        detailed = (f"{hi}, thank you for telling us, and I'm truly sorry{order_ref}. "
                    f"We take this seriously. Please share a few details or a photo, and I'll arrange a "
                    f"replacement or another fix that works for you today. We really appreciate your patience.{pray}")
    elif intent == "thanks":
        quick = f"Thank you so much, {name or 'dear'}!{pray}"
        friendly = f"Thank you so much!{pray} We're really happy you enjoyed it. See you again soon at {s.name}!"
        detailed = (f"Thank you for choosing {s.name}!{pray} Messages like yours make our day. "
                    f"If you have a minute, tell a friend about us.{link}")
    elif intent == "payment":
        how = "MoMo or card using the secure link in our shop" if s.online_payments else "Mobile Money"
        quick = f"{hi}! You can pay with {how}.{smile}"
        friendly = (f"{hi}! You can pay with {how}. Once it's done, send me a quick message and I'll confirm"
                    f"{order_ref}.{smile}")
        detailed = (f"{hi}! Paying is easy: {how}."
                    + (f" Your total is {total}{order_ref}." if total else "")
                    + " As soon as the payment comes through, we'll start on your order and keep you updated."
                    + link)
    elif intent == "delivery":
        if o and status:
            quick = f"{hi}! Your order{order_ref} is {status}."
            friendly = (f"{hi}! Your order{order_ref} is {status}."
                        + (f" We'll bring it to {o.address}." if o.address else "")
                        + f" I'll update you as soon as it's on the way.{smile}")
        else:
            quick = f"{hi}! Yes, we deliver. Please send your location."
            friendly = (f"{hi}! Yes, we deliver.{smile} Send me your location or a nearby landmark and I'll "
                        f"confirm the delivery fee and time.")
        detailed = (friendly + " Delivery times depend on your area and traffic, so I'll give you an exact "
                    "time once I know where you are." + link)
    elif intent == "price":
        quick = f"{hi}! All our prices are on our shop page.{link}".strip()
        friendly = (f"{hi}! Thanks for asking.{smile} Which item are you interested in? I'll send you the price "
                    f"and what's available today.{link}")
        detailed = (f"{hi}! Thanks for your interest in {s.name}. Tell me the item and quantity you need and "
                    f"I'll give you the best price"
                    + (f". For your order{order_ref}, the total is {total}." if total else ".")
                    + " For bigger orders, ask me about a bulk deal.")
    elif intent == "availability":
        quick = f"{hi}! Let me check for you right now."
        friendly = (f"{hi}! Let me confirm what we have right now.{smile} Tell me the size, colour or quantity "
                    f"you want and I'll set it aside for you.")
        detailed = (f"{hi}! Thanks for asking. Stock moves fast, so tell me exactly what you'd like (size, colour, "
                    f"quantity) and I'll confirm and reserve it for you." + link)
    elif intent == "order":
        quick = f"Great choice!{smile} Please send your name and delivery location."
        friendly = (f"Great choice!{smile} To complete your order, please send: 1) your name, 2) your delivery "
                    f"location, 3) the quantity.")
        detailed = (f"Great choice! To get it to you quickly, please send your name, delivery location and the "
                    f"quantity you'd like. You can also order and pay in a few taps on our shop page." + link)
    elif intent == "greeting":
        quick = f"Hello! Welcome to {s.name}.{smile} How can I help?"
        friendly = f"Hello!{'' if plain else ' 👋'} Welcome to {s.name}. What can I get for you today?{link}"
        detailed = (f"Hello and welcome to {s.name}! We're happy to help. Tell me what you're looking for, or "
                    f"browse everything we have and order in a few taps." + link)
    else:
        quick = f"Thanks for your message!{smile} Let me check and get back to you shortly."
        friendly = (f"{hi}! Thanks for reaching out to {s.name}.{smile} Let me check this for you and I'll get "
                    f"back to you in a few minutes.")
        detailed = (f"{hi}! Thank you for your message. I want to give you the right answer, so let me confirm "
                    f"and reply shortly." + link)

    drafts = [Draft(label="Quick", text=quick.strip()), Draft(label="Friendly", text=friendly.strip()),
              Draft(label="Detailed", text=detailed.strip())]
    return ReplyDraftsOut(intent=intent, drafts=drafts, engine=ENGINE)


# ── Shop chat ───────────────────────────────────────────────────────────────────

CATEGORY_SYNONYMS = {
    "drink": "Drinks", "drinks": "Drinks", "juice": "Drinks", "beverage": "Drinks",
    "food": "Food", "meal": "Food", "eat": "Food", "lunch": "Food", "dinner": "Food", "breakfast": "Food",
    "snack": "Snacks", "snacks": "Snacks", "dress": "Clothes", "clothes": "Clothes", "shirt": "Clothes",
    "shoe": "Shoes", "shoes": "Shoes", "sneakers": "Shoes", "bag": "Bags", "bags": "Bags",
    "cream": "Beauty", "beauty": "Beauty", "hair": "Beauty", "phone": "Phones & gadgets",
}


def _score(p: ProductCtx, tokens: list[str]) -> float:
    name, cat, desc = set(words(p.name)), set(words(p.category or "")), set(words(p.description or ""))
    score = 0.0
    for t in tokens:
        stem = t[:-1] if t.endswith("s") and len(t) > 3 else t
        if t in name or stem in name or any(n.startswith(stem) for n in name if len(stem) >= 4):
            score += 3
        if t in cat or stem in cat or CATEGORY_SYNONYMS.get(t, "").lower() == (p.category or "").lower():
            score += 2
        if t in desc or stem in desc:
            score += 1
    if p.featured:
        score += 0.2
    return score


def _pick(products: Iterable[ProductCtx], limit: int = 3) -> list[ProductCtx]:
    return list(products)[:limit]


def shop_chat(inp: ShopChatIn) -> ShopChatOut:
    s = inp.store
    cur = s.currency
    last = next((m.content for m in reversed(inp.messages) if m.role == "user"), "")
    msg = last.lower()
    tokens = [t for t in words(msg) if t not in STOPWORDS]
    available = [p for p in inp.products if p.available]
    featured = sorted(available, key=lambda p: (not p.featured, p.price or 0))
    order_hint = ('Tap "Order on WhatsApp" and the seller will confirm the details with you.'
                  if s.whatsapp_orders else "You can check out and pay securely in a few taps.")

    def reply(text: str, picks: list[ProductCtx]) -> ShopChatOut:
        lines = [text] + [product_line(p, cur) for p in picks]
        return ShopChatOut(reply="\n".join(lines)[:1500], suggestions=[p.id for p in picks if p.id is not None][:3],
                           engine=ENGINE)

    if not inp.products:
        return reply(f"Welcome to {s.name}! The seller is adding products right now. Please check back soon.", [])

    if re.search(r"\b(deliver|delivery|shipping|location|where are you|how long|pickup|pick up)\b", msg):
        return reply(f"Yes! {s.name} can arrange delivery. Add your items to the cart and type your location at "
                     f"checkout. The seller will confirm the delivery fee and time. {order_hint}", [])

    if re.search(r"\b(pay|payment|momo|mobile money|card|cash)\b", msg):
        if s.online_payments:
            text = ("You can pay securely online with Mobile Money or card at checkout."
                    + (" You can also send your order on WhatsApp and pay the seller directly." if s.whatsapp_orders else ""))
        else:
            text = "Send your order on WhatsApp and the seller will share how to pay (Mobile Money or cash)."
        return reply(text, [])

    budget = re.search(r"(under|below|less than|max|maximum|budget(?: of| is)?|within|i have|i've got|i got|only have)\s*(?:ghs|gh₵|ghc|₦|ngn|kes|\$|usd|cedis?|naira)?\s*(\d+(?:\.\d+)?)", msg)
    limit_value = float(budget.group(2)) if budget else None

    # "What goes well with jollof?": suggest items from other categories that fit the budget.
    if re.search(r"go(es)? (well |nice |good )?with|pair|combo|side dish|to go with|along with", msg):
        scored_pair = sorted(((p, _score(p, tokens)) for p in available), key=lambda x: x[1], reverse=True)
        main = next((p for p, sc in scored_pair if sc >= 3), None)
        if main is not None:
            room = None if limit_value is None or main.price is None else limit_value - main.price
            sides = [p for p in available if p.id != main.id and (p.category or "") != (main.category or "")
                     and (room is None or (p.price is not None and p.price <= room))]
            sides.sort(key=lambda p: (not p.featured, p.price or 0))
            if sides:
                if room is not None:
                    text = (f"{main.name} ({money(main.price, cur)}) plus one of these stays within "
                            f"{money(limit_value, cur)}:")
                else:
                    text = f"{main.name} goes great with:"
                return reply(text, [main] + sides[:2])

    if budget:
        limit = limit_value or 0.0
        matches = [p for p in available if p.price is not None and p.price <= limit]
        cat_tokens = [t for t in tokens if t in CATEGORY_SYNONYMS]
        if cat_tokens:
            wanted = CATEGORY_SYNONYMS[cat_tokens[0]].lower()
            matches = [p for p in matches if (p.category or "").lower() == wanted] or matches
        matches.sort(key=lambda p: p.price or 0, reverse=True)
        if matches:
            return reply(f"Here's what you can get for {money(limit, cur)} or less:", _pick(matches))
        cheapest = sorted(available, key=lambda p: p.price or 0)[:2]
        return reply(f"Nothing is under {money(limit, cur)} right now. These are the most affordable:", cheapest)

    if re.search(r"\b(cheap|cheapest|affordable|lowest|least expensive)\b", msg):
        pool = available
        cat_tokens = [t for t in tokens if t in CATEGORY_SYNONYMS]
        if cat_tokens:
            wanted = CATEGORY_SYNONYMS[cat_tokens[0]].lower()
            pool = [p for p in available if (p.category or "").lower() == wanted] or available
        picks = sorted(pool, key=lambda p: p.price or 0)[:3]
        return reply("Here are our most affordable options:", picks)

    if re.search(r"\b(recommend|suggest|best|popular|special|favourite|favorite|what should|surprise)\b", msg):
        return reply(f"Customers love these at {s.name}:", _pick(featured))

    scored = sorted(((p, _score(p, tokens)) for p in inp.products), key=lambda x: x[1], reverse=True)
    hits = [p for p, sc in scored if sc >= 2]
    if hits:
        in_stock = [p for p in hits if p.available]
        sold_out = [p for p in hits if not p.available]
        asks_price = bool(re.search(r"\b(how much|price|cost)\b", msg))
        if in_stock:
            top = in_stock[0]
            if asks_price and top.price is not None:
                text = f"{top.name} is {money(top.price, cur)}."
                others = in_stock[1:3]
                return reply(text + (" You might also like:" if others else f" {order_hint}"), [top] + others)
            note = f" ({sold_out[0].name} is sold out right now.)" if sold_out else ""
            return reply(f"Good choice! Here's what I found:{note}", _pick(in_stock))
        alt = [p for p in available if (p.category or "") == (sold_out[0].category or "")][:3] or _pick(featured)
        return reply(f"Sorry, {sold_out[0].name} is sold out right now. You could try:", alt)

    if re.fullmatch(r"\s*(hi|hello|hey|good (morning|afternoon|evening)|yo)[!. ]*", msg) or not tokens:
        return reply(f"Hello! Welcome to {s.name}. What are you looking for today? Here are some favourites:",
                     _pick(featured))

    return reply("I couldn't find that exactly, but here are some popular picks. Ask me about any of them, "
                 "or tell me your budget!", _pick(featured))


# ── Sales coach ─────────────────────────────────────────────────────────────────

def coach(inp: CoachIn, a: Analysis) -> CoachOut:
    cur = a.currency
    found: list[tuple[Insight, str]] = []  # (insight, action)

    def add(title: str, detail: str, impact: str, kind: str, action: str) -> None:
        found.append((Insight(title=title[:120], detail=detail[:600], impact=impact, kind=kind), action))

    if a.product_count == 0:
        add("Add your first products",
            "Your shop is live but empty. Shops with at least 5 products with photos get far more orders.",
            "high", "growth", "Add 5 products with clear photos (the AI writer can do the descriptions)")
    elif not a.has_sales:
        add("Share your shop link",
            "No sales in the last 30 days yet. Most first orders come from people who already know you.",
            "high", "growth", "Post your shop link on your WhatsApp Status today and send it to 10 regular customers")

    if a.stale_new:
        add(f"{a.stale_new} order{'s' if a.stale_new != 1 else ''} waiting over 2 days",
            "Orders that sit in 'New' for long often turn into lost customers. Confirm or update them.",
            "high", "ops", "Reply to waiting orders and update their status")

    for p in a.restock[:2]:
        add(f"Restock {p.name}",
            f"{p.name} sold {p.units_30} in the last 30 days but is sold out. You're missing sales every day it's out.",
            "high", "stock", f"Restock {p.name} and mark it in stock")

    if a.change_pct is not None and a.revenue_prev_7 > 0:
        if a.change_pct >= 10:
            add(f"Sales up {a.change_pct:.0f}% this week",
                f"You made {money(a.revenue_7, cur)} in the last 7 days, up from {money(a.revenue_prev_7, cur)}. "
                "Whatever you did last week, do more of it.", "medium", "trend",
                "Repeat last week's best post or offer")
        elif a.change_pct <= -10:
            add(f"Sales down {abs(a.change_pct):.0f}% this week",
                f"You made {money(a.revenue_7, cur)} in the last 7 days, down from {money(a.revenue_prev_7, cur)}. "
                "A quick broadcast to past customers usually brings orders back.", "high", "trend",
                "Send a broadcast to past customers (use the Broadcast writer)")

    if a.best_sellers:
        star = a.best_sellers[0]
        add(f"{star.name} is your star",
            f"It brought in {money(star.revenue_30, cur)} from {star.units_30} sold in 30 days. "
            "Keep it at the top of your shop and in your Status posts.", "medium", "growth",
            f"Feature {star.name} and post it on your Status")

    for p in a.low_stock[:2]:
        add(f"{p.name} is running low",
            f"Only {p.stock_qty} left and it sold {p.units_7} this week.", "medium", "stock",
            f"Top up {p.name} before it sells out")

    for p in a.underpriced[:1]:
        add(f"Test a higher price for {p.name}",
            f"It sells well and is priced well below similar items in {p.category}. "
            "Try a small increase (5-10%) and watch sales for a week.", "medium", "pricing",
            f"Try raising {p.name} by 5-10% for one week")

    if a.pending_payment:
        add(f"{a.pending_payment} unfinished online payment{'s' if a.pending_payment != 1 else ''}",
            "Some customers started paying but didn't finish. A friendly WhatsApp message often saves the sale.",
            "medium", "ops", "Message customers with unfinished payments")

    if a.online_share is not None and a.online_payments and a.online_share < 20:
        add("Few customers pay online",
            f"Only {a.online_share:.0f}% of orders are paid online. Paid orders are confirmed instantly and "
            "rarely get cancelled.", "low", "ops", "Mention 'pay with MoMo at checkout' in your posts")

    if a.slow_movers:
        names = ", ".join(p.name for p in a.slow_movers[:3])
        add("Some products aren't selling",
            f"No sales in 30 days for: {names}. Better photos and descriptions, or a bundle with a best seller, can help.",
            "low", "pricing", "Refresh slow products with the AI writer or bundle them")

    if a.best_weekday:
        add(f"{a.best_weekday} are your best days",
            f"You sell the most on {a.best_weekday}. Post your offers the evening before.", "low", "growth",
            f"Schedule a Status post the evening before {a.best_weekday.lower()}")

    if a.has_sales and a.aov_30 > 0 and len(found) < 6:
        add(f"Average order: {money(a.aov_30, cur)}",
            "Offer a simple combo (for example a main item plus a drink) to raise the value of each order.",
            "low", "growth", "Create one combo deal")

    if a.near_limit:
        add("You're at your product limit",
            f"You have {a.product_count} of {a.product_limit} products on the Free plan. "
            "Upgrade to list everything you sell.", "medium", "growth", "Upgrade to list unlimited products")

    rank = {"high": 0, "medium": 1, "low": 2}
    found.sort(key=lambda x: rank[x[0].impact])
    found = found[:6] or [(Insight(title="All looks good", detail="Keep sharing your shop link and replying fast.",
                                   impact="low", kind="growth"), "Share your shop link today")]

    if a.product_count == 0:
        headline = "Let's get your shop ready for its first sale"
    elif not a.has_sales:
        headline = "Let's get your first sales coming in"
    elif a.change_pct is not None and a.change_pct >= 10:
        headline = f"Nice! Sales are up {a.change_pct:.0f}% this week"
    elif a.change_pct is not None and a.change_pct <= -10:
        headline = f"Sales dipped {abs(a.change_pct):.0f}% this week: here's how to bounce back"
    else:
        headline = "A steady week. Here's how to grow"

    if a.has_sales:
        summary = (f"You made {money(a.revenue_7, cur)} in the last 7 days from {a.orders_7} order"
                   f"{'s' if a.orders_7 != 1 else ''}, compared with {money(a.revenue_prev_7, cur)} the week before. "
                   f"Over 30 days you sold {money(a.revenue_30, cur)} across {a.orders_30} orders, "
                   f"about {money(a.aov_30, cur)} each.")
    else:
        summary = "There are no paid or delivered orders in the last 30 days yet. These steps get most new shops their first orders."

    actions = list(dict.fromkeys(act for _, act in found))[:3]
    return CoachOut(headline=headline[:160], summary=summary[:800], insights=[i for i, _ in found],
                    actions=actions, stats=display_stats(a), engine=ENGINE)


# ── Broadcast writer ────────────────────────────────────────────────────────────

def broadcast(inp: BroadcastIn) -> BroadcastOut:
    s, cur = inp.store, inp.store.currency
    plain = no_emoji(inp.tone)
    products = [p for p in inp.products if p.available] or inp.products
    goal = inp.goal.strip().rstrip(".")
    g = goal.lower()
    if any(k in g for k in ("sale", "discount", "promo", "offer", "deal")):
        head = "Special offer this week!"
        emoji = "🎉"
    elif any(k in g for k in ("new", "arrival", "launch", "just in")):
        head = "New in the shop!"
        emoji = "✨"
    elif any(k in g for k in ("weekend", "friday", "saturday", "sunday")):
        head = "Your weekend treat is here!"
        emoji = "🔥"
    else:
        head = f"Fresh from {s.name}!"
        emoji = "🛍️"

    lines = [f"{'' if plain else emoji + ' '}{head}", "", f"*{goal}*"]
    if products:
        lines.append("")
        lines += [product_line(p, cur) for p in products[:6]]
    lines.append("")
    if s.shop_url:
        lines.append(f"{'Order here' if plain else '🛒 Order here'}: {s.shop_url}")
    if s.whatsapp_orders:
        lines.append("Or just reply to this message to order.")
    lines.append(f"Thank you for supporting {s.name}!{'' if plain else ' 🙏'}")
    message = "\n".join(lines)

    top = products[0] if products else None
    if top is not None and top.price is not None:
        short = f"{'' if plain else emoji + ' '}{top.name} now {money(top.price, cur)}!"
    else:
        short = f"{'' if plain else emoji + ' '}{head}"
    if s.shop_url:
        short += f" Order: {s.shop_url}"
    return BroadcastOut(message=message[:1500], short=short[:280], engine=ENGINE)
