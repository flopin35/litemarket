import { useEffect, useRef, useState, type ReactNode } from "react";
import { FaWhatsapp } from "react-icons/fa6";
import { LuCheck, LuCopy, LuExternalLink, LuImage, LuKeyRound, LuPalette, LuSearch, LuShoppingBag, LuStore } from "react-icons/lu";
import { Avatar } from "../../components/bits";
import { Button, Card, ErrorBox, Input, PageHeader, Select, Skeleton, Switch, Textarea } from "../../components/ui";
import { api, ApiError, errorMessage } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import { cn } from "../../lib/cn";
import { ACCENTS, CURRENCIES } from "../../lib/constants";
import { copyText, useLoad, usePageTitle } from "../../lib/hooks";
import { useToast } from "../../lib/toast";
import type { StoreInput, StoreView } from "../../lib/types";

export default function ShopSettings() {
  usePageTitle("My shop");
  const { reload: reloadMe } = useAuth();
  const toast = useToast();
  const { data, error, loading, reload, setData } = useLoad(() => api.get<StoreView>("/api/store"));
  const [form, setForm] = useState<StoreInput | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (data) {
      setForm({
        name: data.name,
        slug: data.slug,
        whatsapp: data.whatsapp,
        currency: data.currency,
        about: data.about ?? "",
        accentColor: data.accentColor ?? ACCENTS[0]!,
        logoUrl: data.logoUrl,
        onlinePayments: data.onlinePayments,
        whatsappOrders: data.whatsappOrders,
        publicLink: data.publicLink ?? "",
      });
    }
  }, [data]);

  if (error) return <ErrorBox message={error} onRetry={reload} />;
  if (loading || !form || !data) {
    return (
      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <Skeleton className="h-[600px]" />
        <Skeleton className="h-[400px]" />
      </div>
    );
  }

  const dirty = JSON.stringify(form) !== JSON.stringify({ ...form, ...pick(data) });
  const set = <K extends keyof StoreInput>(k: K, v: StoreInput[K]) => setForm({ ...form, [k]: v });
  const origin = data.shopUrl.replace(/\/s\/[^/]+$/, "");

  async function save() {
    if (!form) return;
    setSaving(true);
    setErrors({});
    try {
      const saved = await api.put<StoreView>("/api/store", { ...form, about: form.about || null, publicLink: form.publicLink || null });
      setData(saved);
      toast("Shop saved");
      reloadMe().catch(() => {});
    } catch (e) {
      if (e instanceof ApiError && Object.keys(e.fields).length) setErrors(e.fields);
      toast(errorMessage(e), "error");
    } finally {
      setSaving(false);
    }
  }

  async function uploadLogo(file?: File) {
    if (!file) return;
    setUploading(true);
    try {
      const { url } = await api.upload(file);
      set("logoUrl", url);
    } catch (e) {
      toast(errorMessage(e), "error");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="My shop"
        subtitle="How your shop looks and how customers order."
        actions={
          <Button onClick={save} loading={saving} disabled={!dirty} icon={<LuCheck />}>
            Save changes
          </Button>
        }
      />
      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          <Section icon={<LuStore />} title="Shop details">
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="Shop name" value={form.name} onChange={(e) => set("name", e.target.value)} error={errors.name} maxLength={80} />
              <Input label="WhatsApp number" value={form.whatsapp} onChange={(e) => set("whatsapp", e.target.value)} error={errors.whatsapp} leading={<FaWhatsapp />} inputMode="tel" />
            </div>
            <Input
              label="Shop address"
              value={form.slug}
              onChange={(e) => set("slug", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))}
              error={errors.slug}
              leading={`${origin.replace(/^https?:\/\//, "")}/s/`}
              hint="Changing it breaks links you already shared."
            />
            <Textarea label="About your shop" value={form.about ?? ""} onChange={(e) => set("about", e.target.value)} rows={3} maxLength={1000} placeholder="What you sell, where you deliver, opening hours..." />
            <div className="grid gap-4 sm:grid-cols-2">
              <Select label="Currency" value={form.currency} onChange={(e) => set("currency", e.target.value)} options={CURRENCIES} />
              <Input label="Other link (optional)" value={form.publicLink ?? ""} onChange={(e) => set("publicLink", e.target.value)} placeholder="Your domain or Instagram" />
            </div>
          </Section>

          <Section icon={<LuPalette />} title="Look & feel">
            <div className="flex items-center gap-4">
              <Avatar name={form.name || "Shop"} src={form.logoUrl} color={form.accentColor} className="size-16 text-xl" />
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" icon={<LuImage />} loading={uploading} onClick={() => fileRef.current?.click()}>
                  {form.logoUrl ? "Change logo" : "Upload logo"}
                </Button>
                {form.logoUrl && (
                  <Button variant="ghost" size="sm" onClick={() => set("logoUrl", null)}>
                    Remove
                  </Button>
                )}
              </div>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => uploadLogo(e.target.files?.[0])} />
            </div>
            <div>
              <p className="mb-2 text-sm font-semibold">Brand colour</p>
              <div className="flex flex-wrap items-center gap-2.5">
                {ACCENTS.map((c) => (
                  <button
                    key={c}
                    onClick={() => set("accentColor", c)}
                    className={cn("size-9 rounded-full transition-all duration-300 hover:scale-110", form.accentColor?.toLowerCase() === c.toLowerCase() && "scale-110 ring-4 ring-offset-2 ring-offset-white dark:ring-offset-zinc-900")}
                    style={{ background: c, ["--tw-ring-color" as string]: `${c}55` }}
                    aria-label={`Colour ${c}`}
                  />
                ))}
                <label className="relative flex size-9 cursor-pointer items-center justify-center overflow-hidden rounded-full border-2 border-dashed border-zinc-300 text-xs text-zinc-400 dark:border-zinc-600" title="Custom colour">
                  +
                  <input type="color" value={form.accentColor ?? "#0F9D7A"} onChange={(e) => set("accentColor", e.target.value.toUpperCase())} className="absolute inset-0 cursor-pointer opacity-0" />
                </label>
              </div>
            </div>
          </Section>

          <Section icon={<LuShoppingBag />} title="How customers order">
            <Switch checked={form.whatsappOrders} onChange={(v) => set("whatsappOrders", v)} label="Order on WhatsApp" hint="The cart is sent to your WhatsApp as a neat message. The order is saved here too." />
            <div className="h-px bg-zinc-100 dark:bg-white/10" />
            <Switch checked={form.onlinePayments} onChange={(v) => set("onlinePayments", v)} label="Pay online" hint="Mobile Money and card through the payment providers your platform has switched on." />
          </Section>

          <PasswordSection />
        </div>

        <div className="space-y-4 lg:sticky lg:top-6 lg:self-start">
          <p className="text-xs font-bold tracking-wider text-zinc-400 uppercase">Live preview</p>
          <Preview form={form} />
          <ShareBox url={data.shopUrl} name={form.name} />
        </div>
      </div>
    </div>
  );
}

function pick(s: StoreView): StoreInput {
  return {
    name: s.name,
    slug: s.slug,
    whatsapp: s.whatsapp,
    currency: s.currency,
    about: s.about ?? "",
    accentColor: s.accentColor ?? ACCENTS[0]!,
    logoUrl: s.logoUrl,
    onlinePayments: s.onlinePayments,
    whatsappOrders: s.whatsappOrders,
    publicLink: s.publicLink ?? "",
  };
}

function Section({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <Card className="animate-fade-up space-y-4 p-5 sm:p-6">
      <h2 className="flex items-center gap-2 font-bold">
        <span className="text-brand-600">{icon}</span> {title}
      </h2>
      {children}
    </Card>
  );
}

function Preview({ form }: { form: StoreInput }) {
  const color = form.accentColor ?? "#0F9D7A";
  return (
    <div className="overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-xl transition-all duration-500 dark:border-white/10 dark:bg-zinc-900">
      <div className="px-5 pt-6 pb-5 text-white transition-colors duration-500" style={{ background: `linear-gradient(135deg, ${color}, ${color}cc)` }}>
        <div className="flex items-center gap-3">
          <Avatar name={form.name || "Shop"} src={form.logoUrl} color="rgba(255,255,255,.25)" className="size-12 text-base ring-2 ring-white/40" />
          <div className="min-w-0">
            <p className="truncate font-extrabold">{form.name || "Your shop"}</p>
            <p className="line-clamp-2 text-xs opacity-90">{form.about || "Tell customers what you sell."}</p>
          </div>
        </div>
        <div className="mt-4 flex items-center gap-2 rounded-xl bg-white/95 px-3 py-2 text-xs text-zinc-400">
          <LuSearch /> Search products
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 p-4">
        {[0, 1].map((i) => (
          <div key={i} className="overflow-hidden rounded-2xl bg-zinc-50 dark:bg-white/5">
            <div className="h-16 bg-gradient-to-br from-zinc-100 to-zinc-200 dark:from-white/5 dark:to-white/10" />
            <div className="space-y-1.5 p-2.5">
              <div className="h-2 w-3/4 rounded bg-zinc-200 dark:bg-white/10" />
              <div className="flex items-center justify-between">
                <div className="h-2 w-1/3 rounded" style={{ background: color }} />
                <span className="size-5 rounded-full" style={{ background: color }} />
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="flex gap-2 px-4 pb-4">
        {form.whatsappOrders && (
          <span className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#1fae53] py-2 text-xs font-bold text-white">
            <FaWhatsapp /> Order on WhatsApp
          </span>
        )}
        {form.onlinePayments && (
          <span className="flex flex-1 items-center justify-center rounded-xl py-2 text-xs font-bold text-white" style={{ background: color }}>
            Pay now
          </span>
        )}
      </div>
    </div>
  );
}

function ShareBox({ url, name }: { url: string; name: string }) {
  const toast = useToast();
  const [copied, setCopied] = useState(false);
  return (
    <Card className="p-4">
      <p className="text-sm font-bold">Your shop link</p>
      <p className="mt-1 truncate font-mono text-xs text-zinc-500">{url}</p>
      <div className="mt-3 grid grid-cols-3 gap-2">
        <button
          onClick={async () => {
            if (await copyText(url)) {
              setCopied(true);
              toast("Link copied");
              setTimeout(() => setCopied(false), 1500);
            }
          }}
          className="flex h-10 items-center justify-center gap-1.5 rounded-xl border border-zinc-200 text-sm font-semibold hover:bg-zinc-50 dark:border-white/10 dark:hover:bg-white/5"
        >
          {copied ? <LuCheck className="text-brand-600" /> : <LuCopy />} Copy
        </button>
        <a
          href={`https://wa.me/?text=${encodeURIComponent(`Shop with ${name} online 🛍️ ${url}`)}`}
          target="_blank"
          rel="noreferrer"
          className="flex h-10 items-center justify-center gap-1.5 rounded-xl bg-[#1fae53] text-sm font-semibold text-white"
        >
          <FaWhatsapp /> Share
        </a>
        <a href={url} target="_blank" rel="noreferrer" className="flex h-10 items-center justify-center gap-1.5 rounded-xl border border-zinc-200 text-sm font-semibold hover:bg-zinc-50 dark:border-white/10 dark:hover:bg-white/5">
          <LuExternalLink /> Open
        </a>
      </div>
    </Card>
  );
}

function PasswordSection() {
  const toast = useToast();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [busy, setBusy] = useState(false);
  async function change() {
    if (next.length < 8) return toast("The new password needs at least 8 characters.", "error");
    setBusy(true);
    try {
      await api.put("/api/me/password", { currentPassword: current, newPassword: next });
      toast("Password changed");
      setCurrent("");
      setNext("");
    } catch (e) {
      toast(errorMessage(e), "error");
    } finally {
      setBusy(false);
    }
  }
  return (
    <Section icon={<LuKeyRound />} title="Password">
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Current password" type="password" value={current} onChange={(e) => setCurrent(e.target.value)} autoComplete="current-password" />
        <Input label="New password" type="password" value={next} onChange={(e) => setNext(e.target.value)} autoComplete="new-password" hint="At least 8 characters." />
      </div>
      <Button variant="secondary" onClick={change} loading={busy} disabled={!current || !next}>
        Change password
      </Button>
    </Section>
  );
}
