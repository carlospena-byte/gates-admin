import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { Spinner } from "@/components/LoadingStates";
import { GoogleMapPicker } from "@/components/GoogleMapPicker";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SelectableCard } from "@/components/ui/selectable-card";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { formatCurrency } from "@/lib/utils";
import { useI18n } from "@/i18n/useI18n";
import { platformPlanService, platformResidentialService, RESIDENTIAL_CODE_RE } from "@/services";
import type { PlatformPlan } from "@/types/database.types";

const DEFAULT_CENTER = { lat: 18.4861, lng: -69.9312 };

export function NewResidentialSheet({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}) {
  const { t } = useI18n();
  const [plans, setPlans] = useState<PlatformPlan[]>([]);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [code, setCode] = useState("");
  const [planId, setPlanId] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [ownerFirstName, setOwnerFirstName] = useState("");
  const [ownerLastName, setOwnerLastName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    void platformPlanService.list().then((r) => {
      if (r.success) setPlans(r.data.filter((p) => p.is_active));
    });
  }, [open]);

  const handleLocation = useCallback((v: { lat: number; lng: number }) => setLocation(v), []);
  const codeValid = RESIDENTIAL_CODE_RE.test(code);
  const canSubmit =
    name.trim() && address.trim() && location && codeValid && planId && /\S+@\S+\.\S+/.test(ownerEmail) && !isSubmitting;

  const submit = async () => {
    setIsSubmitting(true);
    setError(null);
    const result = await platformResidentialService.create({
      name: name.trim(),
      address: address.trim(),
      lat: location?.lat,
      lng: location?.lng,
      code,
      planId,
      ownerEmail: ownerEmail.trim(),
      ownerFirstName: ownerFirstName.trim() || undefined,
      ownerLastName: ownerLastName.trim() || undefined,
    });
    setIsSubmitting(false);
    if (!result.success) {
      setError(result.error.message === "code_taken" ? t("platformAdmin.residentials.new.codeTaken") : result.error.message);
      return;
    }
    toast.success(t("platformAdmin.residentials.new.created", { name: name.trim() }));
    setName("");
    setAddress("");
    setLocation(null);
    setCode("");
    setPlanId("");
    setOwnerEmail("");
    setOwnerFirstName("");
    setOwnerLastName("");
    onOpenChange(false);
    onCreated();
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-4xl">
        <SheetHeader>
          <SheetTitle>{t("platformAdmin.residentials.new.title")}</SheetTitle>
          <SheetDescription>{t("platformAdmin.residentials.new.description")}</SheetDescription>
        </SheetHeader>
        <div className="space-y-8 py-6">
          {error ? (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          <section className="space-y-4">
            <h3 className="text-sm font-semibold">{t("platformAdmin.residentials.new.section.owner")}</h3>
            <div className="grid gap-4 md:grid-cols-3">
              <Input
                label={t("common.firstName")}
                value={ownerFirstName}
                onChange={(e) => setOwnerFirstName(e.target.value)}
                disabled={isSubmitting}
              />
              <Input
                label={t("common.lastName")}
                value={ownerLastName}
                onChange={(e) => setOwnerLastName(e.target.value)}
                disabled={isSubmitting}
              />
              <Input
                label={t("common.email")}
                value={ownerEmail}
                onChange={(e) => setOwnerEmail(e.target.value)}
                autoComplete="off"
                disabled={isSubmitting}
              />
            </div>
          </section>

          <section className="space-y-4">
            <h3 className="text-sm font-semibold">{t("platformAdmin.residentials.new.section.residential")}</h3>
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-4">
                <Input label={t("common.name")} value={name} onChange={(e) => setName(e.target.value)} disabled={isSubmitting} />
                <div className="space-y-1">
                  <Input
                    label={t("platformAdmin.residentials.new.code")}
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^0-9A-Z]/g, "").slice(0, 10))}
                    autoComplete="off"
                    disabled={isSubmitting}
                  />
                  <p className="text-xs text-muted-foreground">{t("platformAdmin.residentials.new.codeHint")}</p>
                </div>
                <Input
                  label={t("platformAdmin.residentials.new.fullAddress")}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  disabled={isSubmitting}
                />
                <p className="text-xs text-muted-foreground">{t("platformAdmin.residentials.new.mapHint")}</p>
              </div>
              <GoogleMapPicker
                apiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY}
                value={location}
                onChange={handleLocation}
                onAddressSelect={setAddress}
                defaultCenter={DEFAULT_CENTER}
              />
            </div>
          </section>

          <section className="space-y-4">
            <h3 className="text-sm font-semibold">{t("platformAdmin.residentials.new.section.plan")}</h3>
            <div className="grid gap-4 md:grid-cols-3">
              {plans.map((p) => (
                <SelectableCard
                  key={p.id}
                  selected={planId === p.id}
                  onSelectedChange={() => setPlanId(p.id)}
                  label={t("platformAdmin.residentials.plan")}
                  title={p.name}
                  description={t("platformAdmin.residentials.new.perUnit", { price: formatCurrency(p.price_per_unit) })}
                  meta={t("platformAdmin.residentials.new.minMonthly", { price: formatCurrency(p.min_monthly_price) })}
                  disabled={isSubmitting}
                />
              ))}
            </div>
          </section>
        </div>
        <SheetFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            {t("common.cancel")}
          </Button>
          <Button onClick={submit} disabled={!canSubmit}>
            {isSubmitting ? <Spinner size="sm" /> : t("common.create")}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
