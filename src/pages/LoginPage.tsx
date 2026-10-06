import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Spinner } from "@/components/LoadingStates";
import { useI18n } from "@/i18n/useI18n";
import { authService, guardService } from "@/services";
import { isGuardEmail } from "@/lib/guardAccount";

const GUARD_CODE_KEY = "guard_residential_code";

// The code rarely changes for a guardhouse device: remember it so guards only type user + PIN.
function readSavedCode(): string {
  try {
    return localStorage.getItem(GUARD_CODE_KEY) ?? "";
  } catch {
    return "";
  }
}

export function LoginPage() {
  const { t } = useI18n();
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [mode, setMode] = useState<"email" | "guard">("email");
  const [code, setCode] = useState(readSavedCode);
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
    const result = await authService.signInWithOtp({ email: email.trim(), shouldCreateUser: false });
    setIsSubmitting(false);
    if (!result.success) {
      setError(result.error.message);
      return;
    }
    setPhase("enter_token");
  };

  const signInGuard = async () => {
    if (!code.trim() || !username.trim() || pin.length < 4) return;
    setIsSubmitting(true);
    setError(null);
    const result = await guardService.signIn(code.trim(), username.trim(), pin);
    setIsSubmitting(false);
    if (result.ok) {
      try {
        localStorage.setItem(GUARD_CODE_KEY, code.trim().toLowerCase());
      } catch {
        /* storage unavailable: the guard just retypes the code next time */
      }
      return;
    }
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
      <div className="grid h-[640px] w-full max-w-5xl md:grid-cols-2">
        {/* Left panel — brand visual */}
        <div className="relative hidden overflow-hidden rounded-gates-lg bg-gates-brand md:block">
          <img
            src="/login-neighborhood.webp"
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
          />
        </div>

        {/* Right panel — sign in form */}
        <div className="flex flex-col justify-center overflow-y-auto p-8 md:p-12">
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
              label={t("login.guard.codeLabel")}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              autoComplete="off"
              autoCapitalize="none"
              disabled={isSubmitting}
            />
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
              disabled={isSubmitting || !code.trim() || !username.trim() || pin.length < 4}
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
          </div>
        </div>
      </div>
    </div>
  );
}
