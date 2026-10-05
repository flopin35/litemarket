import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { LuX } from "react-icons/lu";
import { cn } from "../lib/cn";

/** Keeps children mounted while the exit animation plays. */
function usePresence(open: boolean, ms = 260) {
  const [mounted, setMounted] = useState(open);
  const [visible, setVisible] = useState(open);
  useEffect(() => {
    if (open) {
      setMounted(true);
      const raf = requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)));
      return () => cancelAnimationFrame(raf);
    }
    setVisible(false);
    const t = setTimeout(() => setMounted(false), ms);
    return () => clearTimeout(t);
  }, [open, ms]);
  return { mounted, visible };
}

function useEscape(open: boolean, onClose: () => void) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);
}

export function Modal({
  open,
  onClose,
  title,
  children,
  size = "md",
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  children: ReactNode;
  size?: "sm" | "md" | "lg";
  footer?: ReactNode;
}) {
  const { mounted, visible } = usePresence(open);
  useEscape(open, onClose);
  if (!mounted) return null;
  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center sm:p-6">
      <div
        onClick={onClose}
        className={cn("absolute inset-0 bg-zinc-950/50 backdrop-blur-sm transition-opacity duration-300", visible ? "opacity-100" : "opacity-0")}
      />
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          "relative flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl transition-all duration-300 ease-[var(--ease-out-expo)] sm:rounded-3xl dark:bg-zinc-900",
          size === "sm" && "sm:max-w-md",
          size === "md" && "sm:max-w-lg",
          size === "lg" && "sm:max-w-2xl",
          visible ? "translate-y-0 opacity-100 sm:scale-100" : "translate-y-8 opacity-0 sm:translate-y-3 sm:scale-95",
        )}
      >
        {title !== undefined && (
          <div className="flex items-center justify-between gap-4 border-b border-zinc-100 px-6 py-4 dark:border-white/10">
            <h2 className="text-lg font-bold">{title}</h2>
            <button onClick={onClose} className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-white/10" aria-label="Close">
              <LuX className="size-5" />
            </button>
          </div>
        )}
        <div className="overflow-y-auto px-6 py-5">{children}</div>
        {footer && <div className="border-t border-zinc-100 bg-zinc-50/60 px-6 py-4 dark:border-white/10 dark:bg-white/[0.02]">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}

export function Drawer({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  width = "max-w-xl",
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  subtitle?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  width?: string;
}) {
  const { mounted, visible } = usePresence(open, 350);
  useEscape(open, onClose);
  if (!mounted) return null;
  return createPortal(
    <div className="fixed inset-0 z-[70]">
      <div onClick={onClose} className={cn("absolute inset-0 bg-zinc-950/40 backdrop-blur-[2px] transition-opacity duration-300", visible ? "opacity-100" : "opacity-0")} />
      <aside
        role="dialog"
        aria-modal="true"
        className={cn(
          "absolute inset-y-0 right-0 flex w-full flex-col bg-white shadow-2xl transition-transform duration-[400ms] ease-[var(--ease-out-expo)] dark:bg-zinc-900",
          width,
          visible ? "translate-x-0" : "translate-x-full",
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b border-zinc-100 px-6 py-5 dark:border-white/10">
          <div>
            <h2 className="text-lg font-bold">{title}</h2>
            {subtitle && <div className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">{subtitle}</div>}
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-white/10" aria-label="Close">
            <LuX className="size-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
        {footer && <div className="border-t border-zinc-100 px-6 py-4 dark:border-white/10">{footer}</div>}
      </aside>
    </div>,
    document.body,
  );
}

export function Confirm({
  open,
  onClose,
  onConfirm,
  title,
  text,
  confirmLabel = "Delete",
  busy,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  text: string;
  confirmLabel?: string;
  busy?: boolean;
}) {
  return (
    <Modal open={open} onClose={onClose} size="sm">
      <div className="py-2 text-center">
        <div className="mx-auto mb-4 flex size-14 animate-wiggle items-center justify-center rounded-2xl bg-rose-50 text-2xl text-rose-600 dark:bg-rose-500/15">!</div>
        <h3 className="text-lg font-bold">{title}</h3>
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">{text}</p>
        <div className="mt-6 grid grid-cols-2 gap-3">
          <button onClick={onClose} className="h-11 rounded-xl border border-zinc-200 font-semibold hover:bg-zinc-50 dark:border-white/10 dark:hover:bg-white/5">
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={busy}
            className="h-11 rounded-xl bg-rose-600 font-semibold text-white hover:bg-rose-500 disabled:opacity-60"
          >
            {busy ? "Working..." : confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  );
}
