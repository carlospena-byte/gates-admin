/**
 * FastLane self-registration — no login, no AppSidebar. The visitor arrives
 * from an SMS/WhatsApp link ("#fastlane/<code>") on their own phone and has
 * no Supabase session at all, so this posts straight to the fastlane-submit
 * Edge Function (verify_jwt = false) with a plain fetch/FormData, not the
 * authenticated supabase-js client.
 */

import { useEffect, useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
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

interface FastlaneInfo {
  registered: boolean;
  expired: boolean;
  visitor_name: string | null;
  plate: string | null;
  valid_from: string;
  valid_until: string;
  resident_name: string | null;
  location_path: string | null;
  residential_name: string | null;
}

function formatWindow(info: FastlaneInfo): string {
  const fmt = new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" });
  return `${fmt.format(new Date(info.valid_from))} – ${fmt.format(new Date(info.valid_until))}`;
}

function DetailRow({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-sm font-medium">{value}</div>
    </div>
  );
}

export function FastlanePublicPage() {
  const { t } = useI18n();
  const code = getFastlaneCodeFromHash();
  const [name, setName] = useState("");
  const [plate, setPlate] = useState("");
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const [photo, setPhoto] = useState<File | null>(null);
  const [state, setState] = useState<SubmitState>("form");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<FastlaneInfo | null>(null);
  const [infoError, setInfoError] = useState<string | null>(null);
  const [loadingInfo, setLoadingInfo] = useState(true);

  useEffect(() => {
    if (!code) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${functionsUrl("fastlane-submit")}?code=${encodeURIComponent(code)}`);
        const body = (await res.json()) as FastlaneInfo & { error?: string };
        if (cancelled) return;
        if (!res.ok) setInfoError(body.error ?? t("fastlane.public.genericError"));
        else setInfo(body);
      } catch {
        if (!cancelled) setInfoError(t("fastlane.public.genericError"));
      } finally {
        if (!cancelled) setLoadingInfo(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  // The resident names the guest when creating the invitation; only ask for
  // a name when that was left blank.
  const needsName = !info?.visitor_name?.trim();
  const isValid = (!needsName || name.trim().length > 0) && photo !== null;

  const handleSubmit = async () => {
    if (!code || !isValid || !photo) return;
    setState("submitting");
    setError(null);

    const form = new FormData();
    form.set("code", code);
    form.set("name", needsName ? name.trim() : "");
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
      setInfo((prev) =>
        prev ? { ...prev, registered: true, visitor_name: prev.visitor_name || name.trim(), plate: plate.trim() || prev.plate } : prev,
      );
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

  if (loadingInfo) {
    return (
      <div className="mx-auto flex min-h-screen max-w-md items-center justify-center px-6">
        <Spinner size="sm" />
      </div>
    );
  }

  if (infoError || !info) {
    return (
      <div className="mx-auto flex min-h-screen max-w-md items-center px-6">
        <Card className="w-full">
          <CardHeader>
            <CardTitle>{t("fastlane.public.invalidTitle")}</CardTitle>
            <CardDescription>{infoError ?? t("fastlane.public.genericError")}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const location = info.location_path;

  if (info.registered || state === "success") {
    // The QR is this same link: security scans it and lands on this detail.
    const qrValue = `${window.location.origin}${window.location.pathname}#fastlane/${encodeURIComponent(code)}`;
    return (
      <div className="mx-auto flex min-h-screen max-w-md items-center px-6 py-12">
        <Card className="w-full">
          <CardHeader>
            <CardTitle>{t("fastlane.public.createdTitle")}</CardTitle>
            <CardDescription>{t("fastlane.public.createdDescription")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-center rounded-lg bg-white p-4">
              <QRCodeSVG value={qrValue} size={220} />
            </div>
            <div className="space-y-3">
              <DetailRow label={t("fastlane.public.visitorLabel")} value={info.visitor_name} />
              <DetailRow label={t("fastlane.public.plateShortLabel")} value={info.plate} />
              <DetailRow label={t("fastlane.public.residentLabel")} value={info.resident_name} />
              <DetailRow label={t("fastlane.public.locationLabel")} value={location || null} />
              <DetailRow label={t("fastlane.public.validLabel")} value={formatWindow(info)} />
            </div>
            {info.expired && <p className="text-sm text-red-600">{t("fastlane.public.expired")}</p>}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (info.expired) {
    return (
      <div className="mx-auto flex min-h-screen max-w-md items-center px-6">
        <Card className="w-full">
          <CardHeader>
            <CardTitle>{t("fastlane.public.invalidTitle")}</CardTitle>
            <CardDescription>{t("fastlane.public.expired")}</CardDescription>
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
          <div className="space-y-3 rounded-lg border p-3">
            <div className="text-xs font-medium uppercase text-muted-foreground">
              {t("fastlane.public.invitedBy")}
            </div>
            <DetailRow label={t("fastlane.public.residentLabel")} value={info.resident_name} />
            <DetailRow label={t("fastlane.public.locationLabel")} value={location || null} />
            <DetailRow label={t("fastlane.public.visitorLabel")} value={info.visitor_name} />
          </div>
          {needsName && (
            <Input
              label={t("fastlane.public.nameLabel")}
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={state === "submitting"}
            />
          )}
          <Input
            label={t("fastlane.public.plateLabel")}
            value={plate}
            onChange={(e) => setPlate(e.target.value)}
            disabled={state === "submitting"}
          />
          <div className="space-y-1.5">
            <label className="text-sm font-medium">{t("fastlane.public.photoLabel")}</label>
            {/* Two hidden inputs: "capture" opens the camera directly, the
                other opens the gallery/file picker. */}
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => setPhoto(e.target.files?.[0] ?? null)}
            />
            <input
              ref={uploadInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => setPhoto(e.target.files?.[0] ?? null)}
            />
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => cameraInputRef.current?.click()}
                disabled={state === "submitting"}
              >
                {t("fastlane.public.takePhoto")}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => uploadInputRef.current?.click()}
                disabled={state === "submitting"}
              >
                {t("fastlane.public.uploadPhoto")}
              </Button>
            </div>
            {photo && <p className="truncate text-sm text-muted-foreground">{photo.name}</p>}
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
