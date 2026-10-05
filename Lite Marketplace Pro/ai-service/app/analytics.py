"""Sales maths for the coach. Pure functions: the numbers never come from a language model."""
from __future__ import annotations

from collections import defaultdict
from dataclasses import dataclass, field
from datetime import date
from statistics import median
from typing import Optional

from .schemas import CoachIn, ProductCtx, Stat

WEEKDAYS = ["Mondays", "Tuesdays", "Wednesdays", "Thursdays", "Fridays", "Saturdays", "Sundays"]


def money(value: float, currency: str) -> str:
    return f"{currency} {value:,.2f}"


@dataclass
class Analysis:
    currency: str
    revenue_7: float = 0.0
    revenue_prev_7: float = 0.0
    orders_7: int = 0
    revenue_30: float = 0.0
    orders_30: int = 0
    aov_30: float = 0.0
    change_pct: Optional[float] = None
    best_sellers: list[ProductCtx] = field(default_factory=list)
    slow_movers: list[ProductCtx] = field(default_factory=list)
    restock: list[ProductCtx] = field(default_factory=list)
    low_stock: list[ProductCtx] = field(default_factory=list)
    underpriced: list[ProductCtx] = field(default_factory=list)
    stale_new: int = 0
    pending_payment: int = 0
    cancelled: int = 0
    total_orders: int = 0
    online_share: Optional[float] = None
    best_weekday: Optional[str] = None
    product_count: int = 0
    product_limit: Optional[int] = None
    premium: bool = False
    online_payments: bool = True

    @property
    def has_sales(self) -> bool:
        return self.orders_30 > 0

    @property
    def near_limit(self) -> bool:
        return (not self.premium and self.product_limit is not None
                and self.product_count >= self.product_limit - 1)

    def as_dict(self) -> dict:
        """A compact summary handed to the language model."""
        return {
            "currency": self.currency,
            "revenue_last_7_days": round(self.revenue_7, 2),
            "revenue_previous_7_days": round(self.revenue_prev_7, 2),
            "orders_last_7_days": self.orders_7,
            "change_percent": self.change_pct,
            "revenue_last_30_days": round(self.revenue_30, 2),
            "orders_last_30_days": self.orders_30,
            "average_order_30_days": round(self.aov_30, 2),
            "best_sellers": [{"name": p.name, "units_30": p.units_30, "revenue_30": p.revenue_30} for p in self.best_sellers],
            "no_sales_30_days": [p.name for p in self.slow_movers],
            "sold_out_but_selling": [p.name for p in self.restock],
            "low_stock": [{"name": p.name, "left": p.stock_qty} for p in self.low_stock],
            "possibly_underpriced": [p.name for p in self.underpriced],
            "orders_waiting_over_2_days": self.stale_new,
            "unfinished_online_payments": self.pending_payment,
            "cancelled_orders_60_days": self.cancelled,
            "online_payment_share": self.online_share,
            "best_weekday": self.best_weekday,
            "product_count": self.product_count,
            "product_limit": self.product_limit,
            "premium_plan": self.premium,
        }


def analyse(inp: CoachIn) -> Analysis:
    s = inp.store
    a = Analysis(currency=s.currency, product_count=s.product_count or len(inp.products),
                 product_limit=s.product_limit, premium=bool(s.premium), online_payments=s.online_payments)

    daily = sorted(inp.daily, key=lambda d: d.date)
    last7, prev7, last30 = daily[-7:], daily[-14:-7], daily[-30:]
    a.revenue_7 = sum(d.revenue for d in last7)
    a.orders_7 = sum(d.orders for d in last7)
    a.revenue_prev_7 = sum(d.revenue for d in prev7)
    a.revenue_30 = sum(d.revenue for d in last30)
    a.orders_30 = sum(d.orders for d in last30)
    a.aov_30 = a.revenue_30 / a.orders_30 if a.orders_30 else 0.0
    if a.revenue_prev_7 > 0:
        a.change_pct = round((a.revenue_7 - a.revenue_prev_7) / a.revenue_prev_7 * 100, 1)
    elif a.revenue_7 > 0:
        a.change_pct = 100.0

    # Best weekday over the whole window (needs a clear winner to be worth saying)
    by_day: dict[int, float] = defaultdict(float)
    for d in daily:
        try:
            by_day[date.fromisoformat(d.date).weekday()] += d.revenue
        except ValueError:
            continue
    total = sum(by_day.values())
    if total > 0 and len(daily) >= 14:
        best = max(by_day, key=by_day.get)
        if by_day[best] >= 1.3 * (total / 7):
            a.best_weekday = WEEKDAYS[best]

    products = inp.products
    sellers = [p for p in products if p.units_30 > 0]
    a.best_sellers = sorted(sellers, key=lambda p: (p.revenue_30, p.units_30), reverse=True)[:3]
    a.slow_movers = [p for p in products
                     if p.units_30 == 0 and p.available and (p.created_days_ago is None or p.created_days_ago >= 7)][:5]
    a.restock = [p for p in products if not p.available and p.units_30 > 0]
    a.low_stock = [p for p in products
                   if p.available and p.stock_qty is not None and 0 < p.stock_qty <= 3 and p.units_7 > 0]

    # A best seller priced well below its category's median may be leaving money on the table.
    by_cat: dict[str, list[float]] = defaultdict(list)
    for p in products:
        if p.price is not None and p.category:
            by_cat[p.category].append(p.price)
    for p in a.best_sellers:
        prices = by_cat.get(p.category or "", [])
        if p.price is not None and len(prices) >= 3 and p.price < 0.75 * median(prices):
            a.underpriced.append(p)

    sc = inp.status_counts
    a.stale_new = inp.stale_new_orders
    a.pending_payment = sc.get("PENDING_PAYMENT", 0)
    a.cancelled = sc.get("CANCELLED", 0)
    a.total_orders = sum(sc.values())
    cc = inp.channel_counts
    channel_total = sum(cc.values())
    if channel_total >= 5:
        a.online_share = round(cc.get("ONLINE", 0) / channel_total * 100, 1)
    return a


def display_stats(a: Analysis) -> list[Stat]:
    trend = None
    if a.change_pct is not None:
        trend = f"{'+' if a.change_pct >= 0 else ''}{a.change_pct:.0f}%"
    stats = [
        Stat(label="Sales, last 7 days", value=money(a.revenue_7, a.currency), trend=trend),
        Stat(label="Sales, last 30 days", value=money(a.revenue_30, a.currency)),
        Stat(label="Orders, last 30 days", value=str(a.orders_30)),
        Stat(label="Average order", value=money(a.aov_30, a.currency)),
    ]
    if a.online_share is not None:
        stats.append(Stat(label="Paid online", value=f"{a.online_share:.0f}%"))
    return stats
