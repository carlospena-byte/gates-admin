/**
 * FastLane self-registration — no login, no AppSidebar. The visitor arrives
 * from an SMS/WhatsApp link ("#fastlane/<code>") on their own phone and has
 * no Supabase session at all, so this posts straight to the fastlane-submit
 * Edge Function (verify_jwt = false) with a plain fetch/FormData, not the
 * authenticated supabase-js client.
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/LoadingStates";
import { useI18n } from "@/i18n/useI18n";
import { getFastlaneCodeFromHash } from "@/config/routes";

type SubmitState = "form" | "submitting" | "success" | "error";

function functionsUrl(path: string): string {
  const base = (import.meta.env.VITE_SUPABASE_URL as string | undefined) ?? "";
  return `${base.replace(/\/$/, "")}/functions/v1/${path}`;
}

export function FastlanePublicPage() {
  const { t } = useI18n();
  const code = getFastlaneCodeFromHash();
  const [name, setName] = useState("");
  const [plate, setPlate] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [state, setState] = useState<SubmitState>("form");
  const [error, setError] = useState<string | null>(null);

  const isValid = name.trim().length > 0 && photo !== null;

  const handleSubmit = async () => {
    if (!code || !isValid || !photo) return;
    setState("submitting");
    setError(null);

    const form = new FormData();
    form.set("code", code);
    form.set("name", name.trim());
    form.set("plate", plate.trim());
    form.set("photo", photo);

    try {
      const res = await fetch(functionsUrl("fastlane-submit"), { method: "POST", body: form });
      const body = (await res.json()) as { success?: boolean; error?: string };
      if (!res.ok || !body.success) {
        setError(body.error ?? t("fastlane.public.genericError"));
        setState("error");
        return;
      }
      setState("success");
    } catch {
      setError(t("fastlane.public.genericError"));
      setState("error");
    }
  };

  if (!code) {
    return (
      <div className="mx-auto flex min-h-screen max-w-md items-center px-6">
        <Card className="w-full">
          <CardHeader>
            <CardTitle>{t("fastlane.public.invalidTitle")}</CardTitle>
            <CardDescription>{t("fastlane.public.invalidDescription")}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (state === "success") {
    return (
      <div className="mx-auto flex min-h-screen max-w-md items-center px-6">
        <Card className="w-full">
          <CardHeader>
            <CardTitle>{t("fastlane.public.successTitle")}</CardTitle>
            <CardDescription>{t("fastlane.public.successDescription")}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md items-center px-6 py-12">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>{t("fastlane.public.title")}</CardTitle>
          <CardDescription>{t("fastlane.public.description")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            label={t("fastlane.public.nameLabel")}
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={state === "submitting"}
          />
          <Input
            label={t("fastlane.public.plateLabel")}
            value={plate}
            onChange={(e) => setPlate(e.target.value)}
            disabled={state === "submitting"}
          />
          <div className="space-y-1.5">
            <label className="text-sm font-medium">{t("fastlane.public.photoLabel")}</label>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={(e) => setPhoto(e.target.files?.[0] ?? null)}
              disabled={state === "submitting"}
              className="block w-full text-sm"
            />
          </div>

          {state === "error" && error && <p className="text-sm text-red-600">{error}</p>}

          <Button className="w-full" onClick={handleSubmit} disabled={!isValid || state === "submitting"}>
            {state === "submitting" ? <Spinner size="sm" /> : t("fastlane.public.submit")}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
