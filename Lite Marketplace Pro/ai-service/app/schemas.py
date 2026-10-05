"""Request and response shapes. The Java API sends these; the website reads the responses."""
from __future__ import annotations

from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, Field


class _In(BaseModel):
    model_config = ConfigDict(extra="ignore")


# ── Shared context ──────────────────────────────────────────────────────────────

class StoreCtx(_In):
    name: str = Field(max_length=120)
    currency: str = "GHS"
    about: Optional[str] = None
    shop_url: Optional[str] = None
    whatsapp_orders: bool = True
    online_payments: bool = True
    premium: Optional[bool] = None
    product_limit: Optional[int] = None
    product_count: Optional[int] = None


class ProductCtx(_In):
    id: Optional[int] = None
    name: str = Field(max_length=200)
    price: Optional[float] = None
    category: Optional[str] = None
    description: Optional[str] = None
    available: bool = True
    stock_qty: Optional[int] = None
    featured: bool = False
    units_30: int = 0
    units_7: int = 0
    revenue_30: float = 0.0
    created_days_ago: Optional[int] = None


class ImageIn(_In):
    media_type: Literal["image/jpeg", "image/png", "image/webp", "image/gif"]
    data: str = Field(max_length=8_000_000)


# ── Product writer ──────────────────────────────────────────────────────────────

class ProductBrief(_In):
    name: str = Field(min_length=1, max_length=200)
    category: Optional[str] = None
    price: Optional[float] = None
    notes: Optional[str] = Field(default=None, max_length=2000)


class ProductWriterIn(_In):
    store: StoreCtx
    product: ProductBrief
    tone: str = "friendly"
    language: str = "English"
    image: Optional[ImageIn] = None


class ProductWriterOut(BaseModel):
    title: str = Field(min_length=1, max_length=120)
    description: str = Field(min_length=1, max_length=2000)
    bullets: list[str] = Field(default_factory=list, max_length=8)
    caption: str = Field(min_length=1, max_length=1200)
    hashtags: list[str] = Field(default_factory=list, max_length=12)
    category: Optional[str] = None
    engine: str = "offline"


# ── Reply drafts ────────────────────────────────────────────────────────────────

class OrderCtx(_In):
    number: Optional[str] = None
    status: Optional[str] = None
    channel: Optional[str] = None
    total: Optional[float] = None
    customer_name: Optional[str] = None
    address: Optional[str] = None
    items: Optional[str] = None


class ReplyDraftsIn(_In):
    store: StoreCtx
    message: str = Field(min_length=1, max_length=4000)
    order: Optional[OrderCtx] = None
    tone: str = "friendly"
    language: str = "English"


class Draft(BaseModel):
    label: str = Field(max_length=40)
    text: str = Field(min_length=1, max_length=1500)


class ReplyDraftsOut(BaseModel):
    intent: str
    drafts: list[Draft] = Field(min_length=1, max_length=4)
    engine: str = "offline"


# ── Shop chat ───────────────────────────────────────────────────────────────────

class ChatMsg(_In):
    role: Literal["user", "assistant"]
    content: str = Field(min_length=1, max_length=2000)


class ShopChatIn(_In):
    store: StoreCtx
    products: list[ProductCtx] = Field(default_factory=list, max_length=200)
    messages: list[ChatMsg] = Field(min_length=1, max_length=40)
    cart: list[int] = Field(default_factory=list)


class ShopChatOut(BaseModel):
    reply: str = Field(min_length=1, max_length=1500)
    suggestions: list[int] = Field(default_factory=list, max_length=6)
    engine: str = "offline"


# ── Sales coach ─────────────────────────────────────────────────────────────────

class DayPoint(_In):
    date: str
    revenue: float = 0.0
    orders: int = 0


class CoachIn(_In):
    store: StoreCtx
    products: list[ProductCtx] = Field(default_factory=list)
    daily: list[DayPoint] = Field(default_factory=list)
    status_counts: dict[str, int] = Field(default_factory=dict)
    channel_counts: dict[str, int] = Field(default_factory=dict)
    stale_new_orders: int = 0


class Insight(BaseModel):
    title: str = Field(max_length=120)
    detail: str = Field(max_length=600)
    impact: Literal["high", "medium", "low"] = "medium"
    kind: str = "growth"


class Stat(BaseModel):
    label: str
    value: str
    trend: Optional[str] = None


class CoachOut(BaseModel):
    headline: str = Field(max_length=160)
    summary: str = Field(max_length=800)
    insights: list[Insight] = Field(min_length=1, max_length=8)
    actions: list[str] = Field(default_factory=list, max_length=5)
    stats: list[Stat] = Field(default_factory=list)
    engine: str = "offline"


# ── Broadcast writer ────────────────────────────────────────────────────────────

class BroadcastIn(_In):
    store: StoreCtx
    products: list[ProductCtx] = Field(default_factory=list, max_length=20)
    goal: str = Field(default="Remind customers what's available", max_length=400)
    tone: str = "exciting"
    language: str = "English"


class BroadcastOut(BaseModel):
    message: str = Field(min_length=1, max_length=1500)
    short: str = Field(min_length=1, max_length=280)
    engine: str = "offline"
