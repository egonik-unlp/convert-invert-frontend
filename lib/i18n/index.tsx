import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { data } from "@/lib/data";
import { useAuth } from "@/hooks/useAuth";
import { es, type Dict } from "./es";
import { en } from "./en";

export type Locale = "es" | "en";
export type { Dict };

const DICTS: Record<Locale, Dict> = { es, en };
const STORAGE_KEY = "ci-lang";

function isLocale(value: unknown): value is Locale {
  return value === "es" || value === "en";
}

/** Before a session: the browser's saved choice, else its language (`es-*` → Spanish). */
function browserLocale(): Locale {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (isLocale(saved)) return saved;
  } catch {
    /* storage blocked */
  }
  return navigator.language.toLowerCase().startsWith("es") ? "es" : "en";
}

interface I18nValue {
  locale: Locale;
  t: Dict;
  setLocale: (locale: Locale) => void;
}

const I18nContext = createContext<I18nValue | null>(null);

/**
 * Order: the person's saved locale (`users.locale`), then the browser's saved choice, then
 * `navigator.language`. Changing it saves to the account when there is one.
 */
export function I18nProvider({ children }: { children: ReactNode }) {
  const { me } = useAuth();
  const [locale, setLocaleState] = useState<Locale>(browserLocale);

  useEffect(() => {
    if (isLocale(me?.locale)) setLocaleState(me.locale);
  }, [me?.locale]);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const setLocale = useCallback(
    (next: Locale) => {
      setLocaleState(next);
      try {
        localStorage.setItem(STORAGE_KEY, next);
      } catch {
        /* storage blocked */
      }
      if (me && me.id > 0) void data.updateMe({ locale: next }).catch(() => {});
    },
    [me],
  );

  const value = useMemo(() => ({ locale, t: DICTS[locale], setLocale }), [locale, setLocale]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

function useI18n(): I18nValue {
  const value = useContext(I18nContext);
  if (!value) throw new Error("useT must be used inside <I18nProvider>");
  return value;
}

export const useT = () => useI18n().t;
export const useLocale = () => {
  const { locale, setLocale } = useI18n();
  return { locale, setLocale };
};

export interface Format {
  number: (n: number) => string;
  percent: (fraction: number) => string;
  /** 1.5 GB → "1,5 GB" in Spanish. */
  size: (bytes: number) => string;
  /** Track length: 4:18. */
  trackDuration: (ms: number) => string;
  /** Collection length: 1 h 32 min. */
  totalDuration: (ms: number) => string;
  /** "hace 3 min" / "3 min ago". */
  relative: (unixSeconds: number) => string;
  latency: (ms: number) => string;
}

export function makeFormat(locale: Locale): Format {
  const tag = locale === "es" ? "es-AR" : "en-US";
  const number = new Intl.NumberFormat(tag);
  const decimal = new Intl.NumberFormat(tag, { maximumFractionDigits: 1 });
  const rtf = new Intl.RelativeTimeFormat(tag, { numeric: "auto", style: "short" });
  return {
    number: (n) => number.format(n),
    percent: (fraction) => `${Math.round(fraction * 100)}%`,
    size: (bytes) => {
      if (!bytes || bytes <= 0) return "0 B";
      const units = ["B", "KB", "MB", "GB", "TB"];
      const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
      return `${decimal.format(bytes / 1024 ** i)} ${units[i]}`;
    },
    trackDuration: (ms) => {
      const total = Math.round(ms / 1000);
      return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
    },
    totalDuration: (ms) => {
      const minutes = Math.round(ms / 60000);
      const h = Math.floor(minutes / 60);
      const m = minutes % 60;
      return h ? `${h} h ${m} min` : `${m} min`;
    },
    relative: (unixSeconds) => {
      const seconds = Math.round(unixSeconds - Date.now() / 1000);
      const abs = Math.abs(seconds);
      if (abs < 60) return rtf.format(seconds, "second");
      if (abs < 3600) return rtf.format(Math.round(seconds / 60), "minute");
      if (abs < 86400) return rtf.format(Math.round(seconds / 3600), "hour");
      return rtf.format(Math.round(seconds / 86400), "day");
    },
    latency: (ms) => {
      if (!Number.isFinite(ms) || ms <= 0) return "—";
      return ms >= 1000 ? `${decimal.format(ms / 1000)} s` : `${Math.round(ms)} ms`;
    },
  };
}

export function useFormat(): Format {
  const { locale } = useI18n();
  return useMemo(() => makeFormat(locale), [locale]);
}
