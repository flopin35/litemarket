import { useCallback, useEffect, useMemo, useState } from "react";
import type { PublicProduct } from "./types";

export interface CartEntry {
  productId: number;
  quantity: number;
}

const key = (slug: string) => `lm-cart-${slug}`;

function read(slug: string): CartEntry[] {
  try {
    const raw = localStorage.getItem(key(slug));
    const parsed = raw ? (JSON.parse(raw) as CartEntry[]) : [];
    return Array.isArray(parsed) ? parsed.filter((e) => e && e.quantity > 0) : [];
  } catch {
    return [];
  }
}

/** The shopping cart for one shop, remembered in this browser. */
export function useCart(slug: string, products: PublicProduct[]) {
  const [entries, setEntries] = useState<CartEntry[]>(() => read(slug));

  useEffect(() => setEntries(read(slug)), [slug]);
  useEffect(() => {
    try {
      localStorage.setItem(key(slug), JSON.stringify(entries));
    } catch {
      /* ignore */
    }
  }, [slug, entries]);

  const byId = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);
  const lines = useMemo(
    () =>
      entries
        .map((e) => ({ ...e, product: byId.get(e.productId) }))
        .filter((l): l is CartEntry & { product: PublicProduct } => !!l.product && l.product.available),
    [entries, byId],
  );
  const count = lines.reduce((n, l) => n + l.quantity, 0);
  const total = lines.reduce((n, l) => n + l.quantity * l.product.price, 0);

  const add = useCallback((productId: number, quantity = 1) => {
    setEntries((list) => {
      const found = list.find((e) => e.productId === productId);
      if (found) return list.map((e) => (e.productId === productId ? { ...e, quantity: Math.min(99, e.quantity + quantity) } : e));
      return [...list, { productId, quantity }];
    });
  }, []);

  const setQuantity = useCallback((productId: number, quantity: number) => {
    setEntries((list) =>
      quantity <= 0 ? list.filter((e) => e.productId !== productId) : list.map((e) => (e.productId === productId ? { ...e, quantity: Math.min(99, quantity) } : e)),
    );
  }, []);

  const clear = useCallback(() => setEntries([]), []);

  return { lines, count, total, add, setQuantity, clear };
}
