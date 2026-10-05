import { useEffect, useMemo, useRef, useState, type DragEvent } from "react";
import {
  LuCopy,
  LuCrown,
  LuImage,
  LuPackageOpen,
  LuPencil,
  LuPlus,
  LuSearch,
  LuSparkles,
  LuStar,
  LuTrash2,
  LuUpload,
  LuWandSparkles,
  LuX,
} from "react-icons/lu";
import { EngineBadge, ProductImage } from "../../components/bits";
import { Confirm, Drawer } from "../../components/Overlay";
import { Badge, Button, ButtonLink, EmptyState, ErrorBox, Input, PageHeader, Progress, Select, Skeleton, Switch, Textarea } from "../../components/ui";
import { assetUrl } from "../../config";
import { api, ApiError, errorMessage } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import { cn } from "../../lib/cn";
import { CATEGORIES, LANGUAGES, TONES } from "../../lib/constants";
import { money } from "../../lib/format";
import { copyText, useLoad, usePageTitle } from "../../lib/hooks";
import { navigate, useLocation } from "../../lib/router";
import { useToast } from "../../lib/toast";
import type { Product, ProductInput, ProductWriterResult } from "../../lib/types";

export default function Products() {
  usePageTitle("Products");
  const { me, reload: reloadMe } = useAuth();
  const { query } = useLocation();
  const toast = useToast();
  const { data, error, loading, reload, setData } = useLoad(() => api.get<Product[]>("/api/products"));
  const [search, setSearch] = useState("");
  const [cat, setCat] = useState("All");
  const [editing, setEditing] = useState<Product | "new" | null>(null);
  const [deleting, setDeleting] = useState<Product | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (query.get("new") === "1") {
      setEditing("new");
      navigate("/app/products", { replace: true });
    }
  }, [query]);

  const plan = me?.plan;
  const currency = me?.store?.currency ?? "GHS";
  const products = data ?? [];
  const categories = useMemo(() => ["All", ...Array.from(new Set(products.map((p) => p.category).filter(Boolean) as string[]))], [products]);
  const visible = products.filter(
    (p) => (cat === "All" || p.category === cat) && (!search || `${p.name} ${p.description ?? ""}`.toLowerCase().includes(search.toLowerCase())),
  );
  const atLimit = plan?.productLimit != null && products.length >= plan.productLimit;

  async function remove() {
    if (!deleting) return;
    setBusy(true);
    try {
      await api.del(`/api/products/${deleting.id}`);
      setData(products.filter((p) => p.id !== deleting.id));
      toast(`Deleted ${deleting.name}`, "info");
      setDeleting(null);
      setEditing(null);
    } catch (e) {
      toast(errorMessage(e), "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Products"
        subtitle={`${products.length} product${products.length === 1 ? "" : "s"} in your shop`}
        actions={
          <Button icon={<LuPlus />} onClick={() => setEditing("new")} disabled={loading}>
            Add product
          </Button>
        }
      />

      {plan && plan.productLimit !== null && (
        <div className="mb-5 flex animate-fade-up flex-col gap-3 rounded-2xl border border-amber-200/70 bg-gradient-to-r from-amber-50 to-orange-50 p-4 sm:flex-row sm:items-center dark:border-amber-500/20 dark:from-amber-500/10 dark:to-orange-500/5">
          <div className="flex-1">
            <p className="text-sm font-bold">
              {products.length} of {plan.productLimit} products on the Free plan
            </p>
            <Progress value={(products.length / plan.productLimit) * 100} tone={atLimit ? "rose" : "amber"} className="mt-2 max-w-sm" />
          </div>
          <ButtonLink to="/app/billing" size="sm" variant="dark" icon={<LuCrown className="text-sun-400" />}>
            Go unlimited
          </ButtonLink>
        </div>
      )}

      {products.length > 0 && (
        <div className="mb-5 flex animate-fade-up flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1 sm:max-w-xs">
            <LuSearch className="absolute top-1/2 left-3.5 -translate-y-1/2 text-zinc-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search products"
              className="h-10 w-full rounded-xl border border-zinc-200 bg-white pr-3 pl-10 text-sm outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/15 dark:border-white/10 dark:bg-white/5"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto no-scrollbar">
            {categories.map((c) => (
              <button
                key={c}
                onClick={() => setCat(c)}
                className={cn(
                  "shrink-0 rounded-full px-3.5 py-1.5 text-sm font-semibold transition-all",
                  cat === c ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900" : "bg-white text-zinc-600 ring-1 ring-zinc-200 hover:ring-zinc-300 dark:bg-white/5 dark:text-zinc-300 dark:ring-white/10",
                )}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      )}

      {error ? (
        <ErrorBox message={error} onRetry={reload} />
      ) : loading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="aspect-[4/5]" />
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={<LuPackageOpen />}
            title="Add your first product"
            text="Snap a photo, set a price, and let the AI write the description for you."
            action={
              <Button icon={<LuPlus />} onClick={() => setEditing("new")}>
                Add product
              </Button>
            }
          />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
          {visible.map((p, i) => (
            <button
              key={p.id}
              onClick={() => setEditing(p)}
              className="group card animate-fade-up overflow-hidden text-left transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
              style={{ animationDelay: `${Math.min(i, 12) * 40}ms` }}
            >
              <div className="relative aspect-square overflow-hidden">
                <div className="h-full w-full transition-transform duration-700 group-hover:scale-105">
                  <ProductImage src={p.imageUrl} name={p.name} category={p.category} />
                </div>
                <div className="absolute top-2 left-2 flex flex-col gap-1">
                  {p.featured && (
                    <Badge tone="amber" className="bg-white/90 backdrop-blur">
                      <LuStar className="size-3 fill-current" /> Featured
                    </Badge>
                  )}
                  {!p.available ? (
                    <Badge tone="rose" className="bg-white/90 backdrop-blur">
                      Sold out
                    </Badge>
                  ) : p.stockQty !== null && p.stockQty <= 5 ? (
                    <Badge tone="amber" className="bg-white/90 backdrop-blur">
                      {p.stockQty} left
                    </Badge>
                  ) : null}
                </div>
                <span className="absolute right-2 bottom-2 flex size-9 translate-y-2 items-center justify-center rounded-xl bg-white/95 text-zinc-700 opacity-0 shadow-lg transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
                  <LuPencil />
                </span>
              </div>
              <div className="p-3.5">
                <p className="truncate font-semibold">{p.name}</p>
                <div className="mt-1 flex items-center justify-between gap-2">
                  <span className="font-extrabold text-brand-700 dark:text-brand-400">{money(p.price, currency)}</span>
                  {p.category && <span className="truncate text-xs text-zinc-400">{p.category}</span>}
                </div>
              </div>
            </button>
          ))}
          {visible.length === 0 && <p className="col-span-full py-12 text-center text-sm text-zinc-500">No products match your search.</p>}
        </div>
      )}

      <ProductEditor
        open={editing !== null}
        product={editing === "new" ? null : editing}
        currency={currency}
        atLimit={atLimit && editing === "new"}
        onClose={() => setEditing(null)}
        onDelete={(p) => setDeleting(p)}
        onSaved={(saved, created) => {
          setData(created ? [saved, ...products] : products.map((p) => (p.id === saved.id ? saved : p)));
          setEditing(null);
          toast(created ? `${saved.name} is now in your shop 🎉` : `Saved ${saved.name}`);
          reloadMe().catch(() => {});
        }}
      />
      <Confirm
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        onConfirm={remove}
        busy={busy}
        title={`Delete ${deleting?.name ?? "product"}?`}
        text="It will disappear from your shop. Past orders keep their details."
      />
    </div>
  );
}

const EMPTY: ProductInput = { name: "", price: 0, category: "Food", description: "", imageUrl: null, inStock: true, stockQty: null, featured: false };

function ProductEditor({
  open,
  product,
  currency,
  atLimit,
  onClose,
  onSaved,
  onDelete,
}: {
  open: boolean;
  product: Product | null;
  currency: string;
  atLimit: boolean;
  onClose: () => void;
  onSaved: (p: Product, created: boolean) => void;
  onDelete: (p: Product) => void;
}) {
  const toast = useToast();
  const [form, setForm] = useState<ProductInput>(EMPTY);
  const [priceText, setPriceText] = useState("");
  const [stockText, setStockText] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [drag, setDrag] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const start = product ? { ...product } : EMPTY;
    setForm({
      name: start.name,
      price: start.price,
      category: start.category,
      description: start.description ?? "",
      imageUrl: start.imageUrl,
      inStock: start.inStock,
      stockQty: start.stockQty,
      featured: start.featured,
    });
    setPriceText(product ? String(product.price) : "");
    setStockText(product?.stockQty != null ? String(product.stockQty) : "");
    setErrors({});
  }, [open, product]);

  async function upload(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) return toast("Please choose an image file.", "error");
    if (file.size > 5 * 1024 * 1024) return toast("That photo is over 5 MB. Try a smaller one.", "error");
    setUploading(true);
    try {
      const { url } = await api.upload(file);
      setForm((f) => ({ ...f, imageUrl: url }));
    } catch (e) {
      toast(errorMessage(e), "error");
    } finally {
      setUploading(false);
    }
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    setDrag(false);
    upload(e.dataTransfer.files?.[0]);
  }

  async function save() {
    const price = Number(priceText.replace(",", "."));
    const stock = stockText.trim() === "" ? null : Number(stockText);
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = "Give the product a name.";
    if (!priceText.trim() || Number.isNaN(price) || price < 0) errs.price = "Enter a price like 25 or 12.50.";
    if (stock !== null && (Number.isNaN(stock) || stock < 0 || !Number.isInteger(stock))) errs.stockQty = "Use a whole number, or leave empty.";
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setSaving(true);
    const body: ProductInput = { ...form, name: form.name.trim(), price, stockQty: stock, description: form.description?.trim() || null };
    try {
      const saved = product ? await api.put<Product>(`/api/products/${product.id}`, body) : await api.post<Product>("/api/products", body);
      onSaved(saved, !product);
    } catch (e) {
      if (e instanceof ApiError && e.code === "PLAN_LIMIT") {
        toast(e.message, "error");
        navigate("/app/billing");
      } else if (e instanceof ApiError && Object.keys(e.fields).length) setErrors(e.fields);
      else toast(errorMessage(e), "error");
    } finally {
      setSaving(false);
    }
  }

  const imageUrl = assetUrl(form.imageUrl);

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={product ? "Edit product" : "New product"}
      subtitle={product ? product.name : "It appears in your shop as soon as you save."}
      footer={
        <div className="flex items-center gap-3">
          {product && (
            <Button variant="ghost" className="text-rose-600! hover:bg-rose-50! dark:hover:bg-rose-500/10!" icon={<LuTrash2 />} onClick={() => onDelete(product)}>
              Delete
            </Button>
          )}
          <div className="flex-1" />
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save} loading={saving} disabled={atLimit}>
            {product ? "Save changes" : "Add to shop"}
          </Button>
        </div>
      }
    >
      {atLimit && (
        <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm dark:border-amber-500/30 dark:bg-amber-500/10">
          <p className="font-bold">You've reached the Free plan limit.</p>
          <p className="mt-1 text-zinc-600 dark:text-zinc-300">Upgrade to add as many products as you like.</p>
          <ButtonLink to="/app/billing" size="sm" className="mt-3">
            See plans
          </ButtonLink>
        </div>
      )}
      <div className="space-y-5">
        {/* Photo */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDrag(true);
          }}
          onDragLeave={() => setDrag(false)}
          onDrop={onDrop}
          className={cn(
            "relative flex aspect-[16/10] items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed transition-all duration-300",
            drag ? "scale-[1.01] border-brand-500 bg-brand-50 dark:bg-brand-500/10" : "border-zinc-200 bg-zinc-50 dark:border-white/10 dark:bg-white/5",
          )}
        >
          {imageUrl ? (
            <>
              <img src={imageUrl} alt="" className="h-full w-full animate-fade-in object-cover" />
              <div className="absolute top-3 right-3 flex gap-2">
                <button onClick={() => fileRef.current?.click()} className="rounded-xl bg-white/95 px-3 py-2 text-xs font-semibold shadow-lg hover:bg-white dark:bg-zinc-900/90">
                  Change
                </button>
                <button onClick={() => setForm({ ...form, imageUrl: null })} className="rounded-xl bg-white/95 p-2 shadow-lg hover:bg-white dark:bg-zinc-900/90" aria-label="Remove photo">
                  <LuX />
                </button>
              </div>
            </>
          ) : (
            <button type="button" onClick={() => fileRef.current?.click()} className="flex flex-col items-center gap-2 p-6 text-center">
              <span className={cn("flex size-14 items-center justify-center rounded-2xl bg-white text-2xl text-brand-600 shadow-sm transition-transform dark:bg-zinc-800", drag && "scale-110 animate-bounce")}>
                {uploading ? <LuUpload className="animate-pulse" /> : <LuImage />}
              </span>
              <span className="text-sm font-semibold">{uploading ? "Uploading..." : "Add a photo"}</span>
              <span className="text-xs text-zinc-500">Drag & drop or tap · JPG, PNG, WebP up to 5 MB</span>
            </button>
          )}
          {uploading && imageUrl && <div className="absolute inset-0 animate-pulse bg-white/50" />}
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => upload(e.target.files?.[0])} />
        </div>

        <Input label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} error={errors.name} placeholder="Jollof Rice & Grilled Chicken" maxLength={120} />
        <div className="grid grid-cols-2 gap-4">
          <Input label="Price" value={priceText} onChange={(e) => setPriceText(e.target.value)} error={errors.price} leading={currency} inputMode="decimal" placeholder="45.00" />
          <Select label="Category" value={form.category ?? "Other"} onChange={(e) => setForm({ ...form, category: e.target.value })} options={CATEGORIES} />
        </div>

        <AiWriter
          product={{ name: form.name, category: form.category, price: Number(priceText) || null, imageUrl: form.imageUrl }}
          onApply={(patch) => setForm((f) => ({ ...f, ...patch }))}
        />

        <Textarea label="Description" value={form.description ?? ""} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={5} maxLength={2000} placeholder="Size, colour, what's included..." />

        <div className="grid grid-cols-2 gap-4">
          <Input label="Stock (optional)" value={stockText} onChange={(e) => setStockText(e.target.value)} error={errors.stockQty} inputMode="numeric" placeholder="Unlimited" hint="Goes down as orders are paid." />
        </div>
        <div className="space-y-3 rounded-2xl border border-zinc-200 p-4 dark:border-white/10">
          <Switch checked={form.inStock} onChange={(v) => setForm({ ...form, inStock: v })} label="In stock" hint="Turn off to show it as sold out." />
          <div className="h-px bg-zinc-100 dark:bg-white/10" />
          <Switch checked={form.featured} onChange={(v) => setForm({ ...form, featured: v })} label="Featured" hint="Shown first in your shop." />
        </div>
      </div>
    </Drawer>
  );
}

function AiWriter({
  product,
  onApply,
}: {
  product: { name: string; category: string | null; price: number | null; imageUrl: string | null };
  onApply: (patch: Partial<ProductInput>) => void;
}) {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [tone, setTone] = useState("friendly");
  const [language, setLanguage] = useState("English");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ProductWriterResult | null>(null);

  async function write() {
    if (!product.name.trim()) return toast("Type the product name first.", "info");
    setBusy(true);
    try {
      const r = await api.post<ProductWriterResult>("/api/ai/product-writer", {
        name: product.name,
        category: product.category,
        price: product.price,
        notes: notes || null,
        tone,
        language,
        imageUrl: product.imageUrl,
      });
      setResult(r);
    } catch (e) {
      toast(errorMessage(e), "error");
      if (e instanceof ApiError && e.code === "AI_CREDITS") navigate("/app/billing");
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group flex w-full items-center gap-3 rounded-2xl border border-violet-200 bg-gradient-to-r from-violet-50 to-fuchsia-50 p-4 text-left transition hover:shadow-md dark:border-violet-500/30 dark:from-violet-500/10 dark:to-fuchsia-500/5"
      >
        <span className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white shadow-lg shadow-violet-500/30 transition-transform group-hover:scale-110 group-hover:rotate-6">
          <LuWandSparkles />
        </span>
        <span>
          <span className="block text-sm font-bold">Write it with AI</span>
          <span className="block text-xs text-zinc-500 dark:text-zinc-400">Title, description, caption and hashtags{product.imageUrl ? ", from your photo" : ""}.</span>
        </span>
      </button>
    );
  }

  return (
    <div className="animate-scale-in space-y-4 rounded-2xl border border-violet-200 bg-violet-50/50 p-4 dark:border-violet-500/30 dark:bg-violet-500/5">
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-2 text-sm font-bold">
          <LuSparkles className="text-violet-500" /> AI product writer
        </p>
        <button type="button" onClick={() => setOpen(false)} className="text-zinc-400 hover:text-zinc-700" aria-label="Close AI writer">
          <LuX />
        </button>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Select label="Tone" value={tone} onChange={(e) => setTone(e.target.value)} options={TONES} />
        <Select label="Language" value={language} onChange={(e) => setLanguage(e.target.value)} options={LANGUAGES} />
      </div>
      <Input label="Key details (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. spicy, serves 2, comes with salad" />
      <Button type="button" onClick={write} loading={busy} className="w-full bg-gradient-to-b! from-violet-500! to-fuchsia-600! border-violet-600/50! shadow-violet-500/25!" icon={<LuWandSparkles />}>
        {result ? "Write again" : "Write it for me"}
      </Button>
      {busy && (
        <div className="space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
        </div>
      )}
      {result && !busy && (
        <div className="animate-fade-up space-y-3">
          <div className="flex justify-end">
            <EngineBadge engine={result.engine} />
          </div>
          <Suggestion label="Title" text={result.title} onUse={() => onApply({ name: result.title })} />
          <Suggestion
            label="Description"
            text={[result.description, ...result.bullets.map((b) => `• ${b}`)].join("\n")}
            onUse={() => onApply({ description: [result.description, "", ...result.bullets.map((b) => `• ${b}`)].join("\n").trim(), ...(result.category ? { category: result.category } : {}) })}
          />
          <Suggestion label="WhatsApp / Instagram caption" text={`${result.caption}\n\n${result.hashtags.join(" ")}`} copyOnly />
        </div>
      )}
    </div>
  );
}

function Suggestion({ label, text, onUse, copyOnly }: { label: string; text: string; onUse?: () => void; copyOnly?: boolean }) {
  const toast = useToast();
  const [used, setUsed] = useState(false);
  return (
    <div className="rounded-xl bg-white p-3.5 shadow-sm dark:bg-zinc-900">
      <div className="mb-1.5 flex items-center justify-between">
        <p className="text-xs font-bold tracking-wide text-zinc-400 uppercase">{label}</p>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={async () => (await copyText(text)) && toast("Copied")}
            className="rounded-lg px-2 py-1 text-xs font-semibold text-zinc-500 hover:bg-zinc-100 dark:hover:bg-white/10"
          >
            <LuCopy className="inline" /> Copy
          </button>
          {!copyOnly && onUse && (
            <button
              type="button"
              onClick={() => {
                onUse();
                setUsed(true);
              }}
              className={cn("rounded-lg px-2.5 py-1 text-xs font-bold transition", used ? "bg-brand-100 text-brand-700" : "bg-violet-600 text-white hover:bg-violet-500")}
            >
              {used ? "Used ✓" : "Use"}
            </button>
          )}
        </div>
      </div>
      <p className="text-sm whitespace-pre-line text-zinc-700 dark:text-zinc-200">{text}</p>
    </div>
  );
}
