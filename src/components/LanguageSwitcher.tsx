import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n/useI18n";

export function LanguageSwitcher() {
  const { locale, setLocale, t } = useI18n();

  return (
    <div className="fixed right-4 top-4 z-20 h-10 w-[108px]">
      <div className="h-full w-full rounded-full border border-black/10 bg-white/80 px-2 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/10">
        <div className="flex w-full items-center justify-center gap-1">
          <Button
            size="sm"
            variant="ghost"
            className={
              locale === "en"
                ? "h-7 px-2 font-semibold text-foreground hover:bg-transparent"
                : "h-7 px-2 text-muted-foreground hover:bg-transparent"
            }
            aria-label={t("language.en")}
            onClick={() => setLocale("en")}
          >
            EN
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className={
              locale === "es"
                ? "h-7 px-2 font-semibold text-foreground hover:bg-transparent"
                : "h-7 px-2 text-muted-foreground hover:bg-transparent"
            }
            aria-label={t("language.es")}
            onClick={() => setLocale("es")}
          >
            ES
          </Button>
        </div>
      </div>
    </div>
  );
}
