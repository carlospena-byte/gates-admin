import { useCallback, useMemo, useState } from "react";

import type { ReactNode } from "react";

import { I18nContext, type I18nContextValue, type Vars } from "@/i18n/context";
import { messages, type Locale, type MessageKey } from "@/i18n/messages";

function format(template: string, vars?: Vars) {
  if (!vars) return template;
  return template.replaceAll(/\{(\w+)\}/g, (_match, key: string) => {
    const value = vars[key];
    return value === null || value === undefined ? "" : String(value);
  });
}

function detectLocale(): Locale {
  const saved = localStorage.getItem("gates-admin.locale");
  if (saved === "en" || saved === "es") return saved;

  const preferred = navigator.languages?.[0] ?? navigator.language ?? "";
  if (preferred.toLowerCase().startsWith("es")) return "es";
  return "en";
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => {
    const initial = detectLocale();
    document.documentElement.lang = initial;
    return initial;
  });

  const setLocale = useCallback((nextLocale: Locale) => {
    setLocaleState(nextLocale);
    localStorage.setItem("gates-admin.locale", nextLocale);
    document.documentElement.lang = nextLocale;
  }, []);

  const t = useCallback(
    (key: MessageKey, vars?: Vars) => {
      const msg = messages[locale][key] ?? messages.en[key] ?? key;
      return format(msg, vars);
    },
    [locale],
  );

  const value = useMemo<I18nContextValue>(() => ({ locale, setLocale, t }), [locale, setLocale, t]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

