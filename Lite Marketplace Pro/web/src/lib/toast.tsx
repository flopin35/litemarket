import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { LuCircleAlert, LuCircleCheck, LuInfo, LuX } from "react-icons/lu";
import { cn } from "./cn";

type Kind = "success" | "error" | "info";
interface Toast {
  id: number;
  kind: Kind;
  text: string;
  leaving?: boolean;
}

const ToastContext = createContext<(text: string, kind?: Kind) => void>(() => {});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts((t) => t.map((x) => (x.id === id ? { ...x, leaving: true } : x)));
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 250);
  }, []);

  const show = useCallback(
    (text: string, kind: Kind = "success") => {
      const id = Date.now() + Math.random();
      setToasts((t) => (t.some((x) => x.text === text && !x.leaving) ? t : [...t.slice(-2), { id, kind, text }]));
      setTimeout(() => dismiss(id), kind === "error" ? 6000 : 3500);
    },
    [dismiss],
  );

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 top-3 z-[90] flex flex-col items-center gap-2 px-4 sm:top-5 sm:right-5 sm:left-auto sm:items-end">
        {toasts.map((t) => {
          const Icon = t.kind === "success" ? LuCircleCheck : t.kind === "error" ? LuCircleAlert : LuInfo;
          return (
            <div
              key={t.id}
              role="status"
              className={cn(
                "pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-2xl border px-4 py-3 text-sm shadow-xl backdrop-blur-xl transition-all duration-300",
                "border-zinc-200 bg-white/95 text-zinc-800 dark:border-white/10 dark:bg-zinc-900/95 dark:text-zinc-100",
                t.leaving ? "translate-y-2 opacity-0" : "animate-pop",
              )}
            >
              <Icon
                className={cn(
                  "mt-0.5 size-5 shrink-0",
                  t.kind === "success" && "text-brand-500",
                  t.kind === "error" && "text-rose-500",
                  t.kind === "info" && "text-sky-500",
                )}
              />
              <p className="flex-1 leading-snug">{t.text}</p>
              <button onClick={() => dismiss(t.id)} className="text-zinc-400 hover:text-zinc-600" aria-label="Close">
                <LuX className="size-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
