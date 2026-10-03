import { messages, type Locale, type MessageKey } from "@/i18n/messages";

/**
 * Translate outside React (toasts fired from hooks and plain helpers). Reads the
 * locale I18nProvider keeps on <html lang>, so it follows the language switcher.
 */
export function translate(key: MessageKey, vars?: Record<string, string | number | null | undefined>): string {
  const locale: Locale = document.documentElement.lang === "es" ? "es" : "en";
  const template: string = messages[locale][key] ?? messages.en[key] ?? key;
  if (!vars) return template;
  return template.replaceAll(/\{(\w+)\}/g, (_m, k: string) => {
    const v = vars[k];
    return v === null || v === undefined ? "" : String(v);
  });
}
