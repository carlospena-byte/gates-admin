import { useState } from "react";
import { IconPhoto } from "@tabler/icons-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Spinner } from "@/components/LoadingStates";
import { useI18n } from "@/i18n/useI18n";
import { authService, guardService } from "@/services";
import { isGuardEmail } from "@/lib/guardAccount";

export function LoginPage({ onCreateResidential }: { onCreateResidential: () => void }) {
  const { t } = useI18n();
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [mode, setMode] = useState<"email" | "guard">("email");
  const [username, setUsername] = useState("");
  const [pin, setPin] = useState("");
  const [phase, setPhase] = useState<"enter_email" | "enter_token">("enter_email");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendOtp = async () => {
    if (!email.trim()) return;
    // Guard accounts have a placeholder address, never a mailbox: they sign in with a PIN.
    if (isGuardEmail(email.trim())) {
      setError(t("login.guard.useGuardLogin"));
      return;
    }
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

  const signInGuard = async () => {
    if (!username.trim() || pin.length < 4) return;
    setIsSubmitting(true);
    setError(null);
    const result = await guardService.signIn(username.trim(), pin);
    setIsSubmitting(false);
    if (result.ok) return;
    setPin("");
    const { error: err } = result;
    if (err.kind === "locked") setError(t("login.guard.locked", { minutes: err.retryInMinutes }));
    else if (err.kind === "inactive") setError(t("login.guard.inactive"));
    else if (err.kind === "invalid") setError(t("login.guard.invalid"));
    else setError(err.message);
  };

  const switchMode = (next: "email" | "guard") => {
    setMode(next);
    setError(null);
    setPin("");
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
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="grid w-full max-w-5xl md:grid-cols-2">
        {/* Left panel — brand visual. Placeholder until real photography is ready. */}
        <div className="relative hidden flex-col justify-between overflow-hidden rounded-gates-lg bg-gates-brand p-8 text-gates-text-inverse md:flex">
          <div className="flex items-center justify-center rounded-gates-lg border border-dashed border-white/25 bg-white/5 py-24">
            <div className="flex flex-col items-center gap-2 text-white/60">
              <IconPhoto size={40} stroke={1.5} />
              <span className="text-xs font-medium">Imagen próximamente</span>
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold tracking-[0.2em]">G A T E S</p>
            <p className="mt-4 text-3xl font-medium leading-tight tracking-tight">
              Tu hogar.
              <br />
              Todo más cerca.
            </p>
          </div>
        </div>

        {/* Right panel — sign in form */}
        <div className="flex flex-col justify-center p-8 md:p-12">
          <div className="mb-8 flex items-center justify-between">
            <p className="text-sm font-semibold tracking-[0.2em] text-gates-text-brand">VECINOO</p>
          </div>

          <h1 className="text-3xl font-semibold tracking-tight text-foreground">{t("login.title")}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{t("login.description")}</p>

          <div className="mt-8 space-y-4">
            {error ? (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}

            {mode === "guard" ? (
              <>
            <Input
              label={t("login.guard.usernameLabel")}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="off"
              autoCapitalize="none"
              disabled={isSubmitting}
            />
            <Input
              label={t("login.guard.pinLabel")}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
              onKeyDown={(e) => {
                if (e.key === "Enter") void signInGuard();
              }}
              type="password"
              inputMode="numeric"
              autoComplete="off"
              placeholder="••••••"
              disabled={isSubmitting}
            />
            <p className="text-xs text-muted-foreground">{t("login.guard.forgotPin")}</p>
            <Button
              size="lg"
              className="w-full"
              onClick={signInGuard}
              disabled={isSubmitting || !username.trim() || pin.length < 4}
            >
              {isSubmitting ? <Spinner size="sm" /> : t("login.guard.submit")}
            </Button>
              </>
            ) : (
              <>
            <Input
              label={t("login.email.label")}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t("login.email.placeholder")}
              autoComplete="email"
              disabled={isSubmitting || phase === "enter_token"}
            />

            {phase === "enter_token" ? (
              <Input
                label={t("login.otp.label")}
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder={t("login.otp.placeholder")}
                inputMode="numeric"
                autoComplete="one-time-code"
                disabled={isSubmitting}
              />
            ) : null}

            {phase === "enter_email" ? (
              <Button size="lg" className="w-full" onClick={sendOtp} disabled={isSubmitting || !email.trim()}>
                {isSubmitting ? <Spinner size="sm" /> : t("login.sendOtp")}
              </Button>
            ) : (
              <Button size="lg" className="w-full" onClick={verifyOtp} disabled={isSubmitting || !token.trim()}>
                {isSubmitting ? <Spinner size="sm" /> : t("login.verify")}
              </Button>
            )}

              </>
            )}

            <p className="text-center text-sm text-muted-foreground">
              <button
                type="button"
                className="font-semibold text-gates-text-brand underline underline-offset-4"
                onClick={() => switchMode(mode === "guard" ? "email" : "guard")}
                disabled={isSubmitting}
              >
                {mode === "guard" ? t("login.guard.backToEmail") : t("login.guard.switch")}
              </button>
            </p>

            <p className="text-center text-sm text-muted-foreground">
              {t("login.needTenant")}{" "}
              <button
                type="button"
                className="font-semibold text-gates-text-brand underline underline-offset-4"
                onClick={onCreateResidential}
                disabled={isSubmitting}
              >
                {t("login.createResidential")}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
