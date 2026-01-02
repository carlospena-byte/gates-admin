import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Spinner } from "@/components/LoadingStates";
import { useI18n } from "@/i18n/useI18n";
import { authService } from "@/services";

export function LoginPage({ onCreateResidential }: { onCreateResidential: () => void }) {
  const { t } = useI18n();
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [phase, setPhase] = useState<"enter_email" | "enter_token">("enter_email");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendOtp = async () => {
    if (!email.trim()) return;
    setIsSubmitting(true);
    setError(null);
    const result = await authService.signInWithOtp({ email: email.trim(), shouldCreateUser: true });
    setIsSubmitting(false);
    if (!result.success) {
      setError(result.error.message);
      return;
    }
    setPhase("enter_token");
  };

  const verifyOtp = async () => {
    if (!email.trim() || !token.trim()) return;
    setIsSubmitting(true);
    setError(null);
    const result = await authService.verifyOtp({ email: email.trim(), token: token.trim() });
    setIsSubmitting(false);
    if (!result.success) {
      setError(result.error.message);
      return;
    }
  };

  return (
    <div className="mx-auto max-w-md px-6 py-12">
      <Card>
        <CardHeader>
          <CardTitle>{t("login.title")}</CardTitle>
          <CardDescription>{t("login.description")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error ? (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          <div className="space-y-2">
            <label className="text-sm font-medium">{t("login.email.label")}</label>
            <Input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t("login.email.placeholder")}
              autoComplete="email"
              disabled={isSubmitting || phase === "enter_token"}
            />
          </div>

          {phase === "enter_token" ? (
            <div className="space-y-2">
              <label className="text-sm font-medium">{t("login.otp.label")}</label>
              <Input
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder={t("login.otp.placeholder")}
                inputMode="numeric"
                autoComplete="one-time-code"
                disabled={isSubmitting}
              />
            </div>
          ) : null}

          <div className="flex items-center gap-2">
            {phase === "enter_email" ? (
              <Button className="w-full" onClick={sendOtp} disabled={isSubmitting || !email.trim()}>
                {isSubmitting ? <Spinner size="sm" /> : t("login.sendOtp")}
              </Button>
            ) : (
              <Button className="w-full" onClick={verifyOtp} disabled={isSubmitting || !token.trim()}>
                {isSubmitting ? <Spinner size="sm" /> : t("login.verify")}
              </Button>
            )}
          </div>

          <div className="text-center text-sm text-muted-foreground">
            {t("login.needTenant")}{" "}
            <button
              type="button"
              className="underline underline-offset-4"
              onClick={onCreateResidential}
              disabled={isSubmitting}
            >
              {t("login.createResidential")}
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
