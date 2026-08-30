import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Spinner } from "@/components/LoadingStates";
import { useI18n } from "@/i18n/useI18n";
import {
  authService,
  residentialService,
  residentialUserService,
  profileService,
  locationTypeService,
} from "@/services";
import { useSession } from "@/state/useSession";

export function ResidentialSignupPage({
  onBackToLogin,
  onComplete,
}: {
  onBackToLogin: () => void;
  onComplete: () => void;
}) {
  const { t } = useI18n();
  const { session, isLoading: sessionLoading } = useSession();
  const userId = session?.user?.id ?? null;

  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);

  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isReady = useMemo(() => Boolean(userId) && !sessionLoading, [sessionLoading, userId]);

  const sendOtp = async () => {
    if (!email.trim()) return;
    setIsSubmitting(true);
    setError(null);
    const result = await authService.signInWithOtp({
      email: email.trim(),
      shouldCreateUser: true,
      data: {
        first_name: firstName.trim() || undefined,
        last_name: lastName.trim() || undefined,
        phone: phone.trim() || undefined,
      },
    });
    setIsSubmitting(false);
    if (!result.success) {
      setError(result.error.message);
      return;
    }
    setOtpSent(true);
  };

  const verifyOtp = async () => {
    if (!email.trim() || !otp.trim()) return;
    setIsSubmitting(true);
    setError(null);
    const result = await authService.verifyOtp({ email: email.trim(), token: otp.trim() });
    setIsSubmitting(false);
    if (!result.success) {
      setError(result.error.message);
      return;
    }
  };

  const handleCreate = async () => {
    if (!userId) return;
    if (!name.trim()) return;

    setIsSubmitting(true);
    setError(null);

    if (firstName.trim() || lastName.trim() || phone.trim()) {
      await profileService.updateProfile(userId, {
        first_name: firstName.trim() || null,
        last_name: lastName.trim() || null,
        phone: phone.trim() || null,
      });
    }

    const createResult = await residentialService.create({
      name: name.trim(),
      owner_user_id: userId,
      address: address.trim() || null,
      is_active: true,
    });

    if (!createResult.success) {
      setIsSubmitting(false);
      setError(createResult.error.message);
      return;
    }

    const membershipResult = await residentialUserService.add(createResult.data.id, userId, "owner");
    setIsSubmitting(false);
    if (!membershipResult.success) {
      setError(membershipResult.error.message);
      return;
    }

    // Best-effort starter types so the owner has "Edificio"/"Bloque"/"Piso"
    // ready to use instead of creating the location hierarchy vocabulary
    // from scratch on their first visit to Manage Locations.
    const residentialId = createResult.data.id;
    await Promise.all([
      locationTypeService.create({ residential_id: residentialId, name: "Edificio", code: "EDIFICIO", level: 1 }),
      locationTypeService.create({ residential_id: residentialId, name: "Bloque", code: "BLOQUE", level: 1 }),
      locationTypeService.create({ residential_id: residentialId, name: "Piso", code: "PISO", level: 2 }),
    ]);

    onComplete();
  };

  return (
    <div className="mx-auto max-w-xl px-6 py-12">
      <Card>
        <CardHeader>
          <CardTitle>{t("signup.title")}</CardTitle>
          <CardDescription>
            {userId ? t("signup.description.residential") : t("signup.description.user")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error ? (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          {!userId ? (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                <Input
                  label={t("signup.firstName.label")}
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  disabled={isSubmitting}
                />
                <Input
                  label={t("signup.lastName.label")}
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  disabled={isSubmitting}
                />
              </div>

              <Input
                label={t("signup.email.label")}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                disabled={isSubmitting || otpSent}
              />

              <Input
                label={t("signup.phone.label")}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder={t("signup.phone.placeholder")}
                disabled={isSubmitting}
              />

              {otpSent ? (
                <Input
                  label={t("login.otp.label")}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  placeholder={t("login.otp.placeholder")}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  disabled={isSubmitting}
                />
              ) : null}

              <div className="flex gap-2">
                <Button variant="outline" onClick={onBackToLogin} disabled={isSubmitting}>
                  {t("signup.signIn")}
                </Button>
                {otpSent ? (
                  <Button className="flex-1" onClick={verifyOtp} disabled={isSubmitting || !otp.trim()}>
                    {isSubmitting ? <Spinner size="sm" /> : null}
                    <span className="ml-2">{t("login.verify")}</span>
                  </Button>
                ) : (
                  <Button className="flex-1" onClick={sendOtp} disabled={isSubmitting || !email.trim()}>
                    {isSubmitting ? <Spinner size="sm" /> : null}
                    <span className="ml-2">{t("signup.sendOtp")}</span>
                  </Button>
                )}
              </div>
            </>
          ) : (
            <>
              {!isReady ? (
                <Alert>
                  <AlertDescription>{t("app.loading.description")}</AlertDescription>
                </Alert>
              ) : null}

              <Input
                label={t("signup.residentialName.label")}
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isSubmitting}
              />

              <Input
                label={t("signup.residentialAddress.label")}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder={t("signup.residentialAddress.placeholder")}
                disabled={isSubmitting}
              />

              <div className="flex gap-2">
                <Button variant="outline" onClick={onBackToLogin} disabled={isSubmitting}>
                  {t("signup.back")}
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleCreate}
                  disabled={isSubmitting || !isReady || !name.trim()}
                >
                  {isSubmitting ? <Spinner size="sm" /> : null}
                  <span className="ml-2">{t("signup.create")}</span>
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
