import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { useI18n } from "@/i18n/useI18n";

/**
 * Default fallback UI, split into a function component so it can use the
 * i18n hook (ErrorBoundary itself must stay a class component).
 */
export function DefaultErrorFallback({ error, onReset }: { error: Error | null; onReset: () => void }) {
  const { t } = useI18n();
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-gray-50 to-gray-100">
      <Card className="max-w-md w-full">
        <CardHeader>
          <CardTitle className="text-red-600">{t("errorBoundary.title")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-600">{t("errorBoundary.description")}</p>

          {import.meta.env.DEV && error && (
            <details className="text-xs bg-gray-100 p-3 rounded">
              <summary className="cursor-pointer font-semibold mb-2">{t("errorBoundary.devDetails")}</summary>
              <pre className="whitespace-pre-wrap overflow-auto max-h-40">
                {error.message}
                {"\n\n"}
                {error.stack}
              </pre>
            </details>
          )}

          <div className="flex gap-2">
            <Button onClick={onReset} className="flex-1">
              {t("errorBoundary.tryAgain")}
            </Button>
            <Button onClick={() => window.location.reload()} variant="outline" className="flex-1">
              {t("errorBoundary.reloadPage")}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
