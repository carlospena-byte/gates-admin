import { createContext } from "react";

import type { Locale, MessageKey } from "@/i18n/messages";

export type Vars = Record<string, string | number | null | undefined>;

export type I18nContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: MessageKey, vars?: Vars) => string;
};

export const I18nContext = createContext<I18nContextValue | null>(null);

