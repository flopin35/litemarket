import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { FaWhatsapp } from "react-icons/fa6";
import { LuArrowLeft, LuArrowRight, LuEye, LuEyeOff, LuLock, LuMail, LuMailCheck, LuStore } from "react-icons/lu";
import { Logo, ThemeToggle } from "../../components/bits";
import { Button, Input } from "../../components/ui";
import { BRAND, DEMO_MODE } from "../../config";
import { api, ApiError, errorMessage } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import { cn } from "../../lib/cn";
import { usePageTitle } from "../../lib/hooks";
import { Link, navigate, useLocation } from "../../lib/router";
import { useToast } from "../../lib/toast";

export default function AuthPages() {
  const { path } = useLocation();
  const { me, loading } = useAuth();

  useEffect(() => {
    if (!loading && me && (path === "/login" || path === "/signup")) navigate("/app", { replace: true });
  }, [me, loading, path]);

  if (path === "/signup") return <Signup />;
  if (path === "/forgot-password") return <Forgot />;
  if (path === "/reset-password") return <Reset />;
  return <Login />;
}

function Shell({ title, subtitle, children, footer }: { title: string; subtitle: string; children: ReactNode; footer?: ReactNode }) {
  usePageTitle(`${title} · ${BRAND.name}`);
  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <div className="relative flex flex-col px-5 py-6 sm:px-10">
        <div className="flex items-center justify-between">
          <Link to="/">
            <Logo />
          </Link>
          <ThemeToggle />
        </div>
        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-12">
          <h1 className="animate-fade-up text-3xl font-extrabold tracking-tight">{title}</h1>
          <p className="mt-2 animate-fade-up text-zinc-500 [animation-delay:60ms] dark:text-zinc-400">{subtitle}</p>
          <div className="mt-8 animate-fade-up [animation-delay:120ms]">{children}</div>
          {footer && <div className="mt-8 animate-fade-up text-center text-sm text-zinc-500 [animation-delay:180ms]">{footer}</div>}
        </div>
      </div>
      <AuthArt />
    </div>
  );
}

function AuthArt() {
  const bubbles = [
    { who: "customer", text: "Hello, is the jollof still available? 😋" },
    { who: "bot", text: "Yes! Jollof Rice & Grilled Chicken is GHS 45. Want to add a chilled Sobolo for GHS 12?" },
    { who: "customer", text: "Yes please, 2 jollof + 1 sobolo" },
    { who: "order", text: "Order LM-7KQ2XA · GHS 102.00 · Paid with MoMo ✓" },
  ];
  return (
    <div className="relative hidden overflow-hidden bg-gradient-to-br from-brand-600 via-brand-700 to-brand-950 lg:block">
      <div className="absolute -top-24 -left-24 size-96 animate-blob bg-sun-400/30 blur-3xl" />
      <div className="absolute -right-24 bottom-0 size-96 animate-blob bg-emerald-300/20 blur-3xl [animation-delay:-7s]" />
      <div className="grid-bg absolute inset-0 opacity-40" />
      <div className="relative flex h-full flex-col justify-center px-16">
        <p className="max-w-md text-4xl leading-tight font-extrabold text-white">Every chat can be a sale.</p>
        <p className="mt-3 max-w-md text-brand-100">Your shop, your WhatsApp, your AI assistant: all working together while you cook, sew or sleep.</p>
        <div className="mt-10 max-w-md space-y-3">
          {bubbles.map((b, i) => (
            <div
              key={i}
              className={cn(
                "w-fit max-w-[85%] animate-pop rounded-2xl px-4 py-3 text-sm shadow-xl",
                b.who === "customer" && "ml-auto rounded-br-md bg-white text-zinc-800",
                b.who === "bot" && "rounded-bl-md bg-white/15 text-white backdrop-blur",
                b.who === "order" && "flex items-center gap-2 rounded-xl bg-sun-400 font-bold text-zinc-900",
              )}
              style={{ animationDelay: `${400 + i * 650}ms` }}
            >
              {b.who === "order" && <FaWhatsapp />}
              {b.text}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function PasswordInput(props: { value: string; onChange: (v: string) => void; label: string; error?: string; autoComplete: string; hint?: string }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Input
        label={props.label}
        type={show ? "text" : "password"}
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        error={props.error}
        hint={props.hint}
        autoComplete={props.autoComplete}
        leading={<LuLock />}
        required
      />
      <button type="button" onClick={() => setShow(!show)} className="absolute top-[34px] right-3 p-1 text-zinc-400 hover:text-zinc-700" aria-label={show ? "Hide password" : "Show password"}>
        {show ? <LuEyeOff /> : <LuEye />}
      </button>
    </div>
  );
}

function Login() {
  const { login } = useAuth();
  const { query } = useLocation();
  const toast = useToast();
  const [email, setEmail] = useState(DEMO_MODE ? "demo@litemarket.dev" : "");
  const [password, setPassword] = useState(DEMO_MODE ? "demo12345" : "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const me = await login(email, password);
      toast(`Welcome back${me.store ? `, ${me.store.name}` : ""}!`);
      const next = query.get("next");
      navigate(next && next.startsWith("/app") ? next : "/app", { replace: true });
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Shell
      title="Welcome back"
      subtitle="Log in to manage your shop."
      footer={
        <>
          New here?{" "}
          <Link to="/signup" className="font-semibold text-brand-600 hover:underline dark:text-brand-400">
            Create your shop
          </Link>
        </>
      }
    >
      {DEMO_MODE && (
        <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-400/30 dark:bg-amber-500/10 dark:text-amber-200">
          Demo login filled in. Use <b>admin@litemarket.dev / admin12345</b> to see the admin panel.
        </div>
      )}
      <form onSubmit={submit} className="space-y-4">
        <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} leading={<LuMail />} autoComplete="email" required />
        <PasswordInput label="Password" value={password} onChange={setPassword} autoComplete="current-password" />
        <div className="flex justify-end">
          <Link to="/forgot-password" className="text-sm font-semibold text-brand-600 hover:underline dark:text-brand-400">
            Forgot password?
          </Link>
        </div>
        {error && <p className="animate-fade-in rounded-xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">{error}</p>}
        <Button type="submit" loading={busy} className="w-full" size="lg">
          Log in <LuArrowRight />
        </Button>
      </form>
    </Shell>
  );
}

function Signup() {
  const { signup } = useAuth();
  const toast = useToast();
  const [form, setForm] = useState({ storeName: "", whatsapp: "", email: "", password: "" });
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm({ ...form, [k]: e.target.value });

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErrors({});
    setError(null);
    try {
      const me = await signup(form);
      toast(me.role === "ADMIN" ? "Welcome! You're the first account, so you're the admin too." : `Welcome, ${me.store?.name}! Your shop is live.`);
      navigate("/app?welcome=1", { replace: true });
    } catch (e) {
      if (e instanceof ApiError && Object.keys(e.fields).length) setErrors(e.fields);
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  const slug = form.storeName.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/['’]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

  return (
    <Shell
      title="Create your shop"
      subtitle="Free forever for up to 5 products. No card needed."
      footer={
        <>
          Already have a shop?{" "}
          <Link to="/login" className="font-semibold text-brand-600 hover:underline dark:text-brand-400">
            Log in
          </Link>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-4">
        <Input label="Shop name" value={form.storeName} onChange={set("storeName")} placeholder="Ama's Kitchen" leading={<LuStore />} error={errors.storeName} required maxLength={80} />
        <div className={cn("-mt-2 overflow-hidden text-xs text-zinc-500 transition-all duration-300", slug ? "max-h-6 opacity-100" : "max-h-0 opacity-0")}>
          Your link: <span className="font-mono font-semibold text-brand-600 dark:text-brand-400">/s/{slug}</span>
        </div>
        <Input label="WhatsApp number" value={form.whatsapp} onChange={set("whatsapp")} placeholder="024 123 4567" leading={<FaWhatsapp />} error={errors.whatsapp} inputMode="tel" required hint="Orders will be sent here." />
        <Input label="Email" type="email" value={form.email} onChange={set("email")} leading={<LuMail />} error={errors.email} autoComplete="email" required />
        <PasswordInput label="Password" value={form.password} onChange={(v) => setForm({ ...form, password: v })} error={errors.password} autoComplete="new-password" hint="At least 8 characters." />
        {error && !Object.keys(errors).length && <p className="animate-fade-in rounded-xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">{error}</p>}
        <Button type="submit" loading={busy} className="w-full" size="lg">
          Create my shop <LuArrowRight />
        </Button>
        <p className="text-center text-xs text-zinc-400">By signing up you agree to the terms of service and privacy policy.</p>
      </form>
    </Shell>
  );
}

function Forgot() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api.post("/api/auth/forgot-password", { email });
      setSent(true);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Shell
      title="Forgot your password?"
      subtitle="We'll email you a link to choose a new one."
      footer={
        <Link to="/login" className="inline-flex items-center gap-1.5 font-semibold text-brand-600 dark:text-brand-400">
          <LuArrowLeft /> Back to log in
        </Link>
      }
    >
      {sent ? (
        <div className="animate-pop rounded-2xl border border-brand-200 bg-brand-50 p-6 text-center dark:border-brand-500/30 dark:bg-brand-500/10">
          <LuMailCheck className="mx-auto size-10 text-brand-600" />
          <p className="mt-3 font-bold">Check your inbox</p>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">If {email} has an account, a reset link is on its way. It works for 30 minutes.</p>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} leading={<LuMail />} required />
          {error && <p className="text-sm text-rose-600">{error}</p>}
          <Button type="submit" loading={busy} className="w-full" size="lg">
            Send reset link
          </Button>
        </form>
      )}
    </Shell>
  );
}

function Reset() {
  const { query } = useLocation();
  const toast = useToast();
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const token = query.get("token") ?? "";

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api.post("/api/auth/reset-password", { token, password });
      toast("Password changed. You can log in now.");
      navigate("/login", { replace: true });
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Shell title="Choose a new password" subtitle="Make it at least 8 characters.">
      <form onSubmit={submit} className="space-y-4">
        <PasswordInput label="New password" value={password} onChange={setPassword} autoComplete="new-password" />
        {error && <p className="text-sm text-rose-600">{error}</p>}
        <Button type="submit" loading={busy} disabled={!token} className="w-full" size="lg">
          Save new password
        </Button>
        {!token && <p className="text-center text-sm text-rose-600">This link is missing its token. Ask for a new one.</p>}
      </form>
    </Shell>
  );
}
