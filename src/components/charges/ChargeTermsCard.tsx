/**
 * Step 1 of a charge: how much, when it's due and what happens when it's late.
 * Name, generation day and validity dates are rarely touched, so they sit
 * behind "Advanced options". A sentence under the form spells out what the
 * current values mean.
 */

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useI18n } from "@/i18n/useI18n";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/LoadingStates";
import { SegmentedControl } from "@/components/charges/SegmentedControl";
import { formatCurrency } from "@/lib/utils";
import type { Charge, LateFeeType, UpdateChargeDto } from "@/types/unit-wizard.types";
import { DatePicker } from "@/components/ui/date-picker";

interface TermsForm {
  name: string;
  description: string;
  amount: string;
  generationDay: string;
  dueDay: string;
  lateFeeType: LateFeeType;
  lateFeeValue: string;
  startsOn: string;
  endsOn: string;
}

function toForm(charge: Charge): TermsForm {
  return {
    name: charge.name,
    description: charge.description || "",
    amount: String(charge.amount),
    generationDay: String(charge.generation_day),
    dueDay: String(charge.due_day),
    lateFeeType: charge.late_fee_type,
    lateFeeValue: String(charge.late_fee_value),
    startsOn: charge.starts_on,
    endsOn: charge.ends_on || "",
  };
}

interface ChargeTermsCardProps {
  charge: Charge;
  canManage: boolean;
  isSubmitting: boolean;
  onSave: (dto: UpdateChargeDto) => Promise<boolean>;
}

export function ChargeTermsCard({ charge, canManage, isSubmitting, onSave }: ChargeTermsCardProps) {
  const { t } = useI18n();
  const [form, setForm] = useState<TermsForm>(() => toForm(charge));
  const set = <K extends keyof TermsForm>(key: K, value: TermsForm[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  // Re-seed only when the charge itself changed in the database (another charge
  // loaded, or our save came back) — NOT on any reload, which would wipe unsaved edits.
  useEffect(() => {
    setForm(toForm(charge));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [charge.id, charge.updated_at]);

  const saved = useMemo(() => toForm(charge), [charge]);
  const isDirty = (Object.keys(form) as (keyof TermsForm)[]).some((key) => form[key] !== saved[key]);

  const amount = Number(form.amount);
  const lateFeeValue = form.lateFeeType === "none" ? 0 : Number(form.lateFeeValue);
  const lateFeeAmount = form.lateFeeType === "percent" ? (amount * lateFeeValue) / 100 : lateFeeValue;

  const summary = [
    t("charges.terms.summary.base", { amount: formatCurrency(amount || 0), day: form.dueDay || "?" }),
    form.lateFeeType === "none"
      ? t("charges.terms.summary.noFee")
      : form.lateFeeType === "fixed"
        ? t("charges.terms.summary.fixedFee", { fee: formatCurrency(lateFeeAmount || 0) })
        : t("charges.terms.summary.percentFee", {
            percent: form.lateFeeValue || "0",
            fee: formatCurrency(lateFeeAmount || 0),
          }),
  ].join(" ");

  const handleSave = async () => {
    const generationDay = Number(form.generationDay);
    const dueDay = Number(form.dueDay);

    if (!form.name.trim()) return toast.error(t("charges.detail.nameRequired"));
    if (form.amount.trim() === "" || !(amount >= 0)) return toast.error(t("charges.detail.amountInvalid"));
    if (![generationDay, dueDay].every((d) => Number.isInteger(d) && d >= 1 && d <= 28)) {
      return toast.error(t("charges.detail.dayInvalid"));
    }
    if (!(lateFeeValue >= 0) || (form.lateFeeType === "percent" && lateFeeValue > 100)) {
      return toast.error(t("charges.detail.lateFeeInvalid"));
    }
    if (!form.startsOn || (form.endsOn && form.endsOn < form.startsOn)) {
      return toast.error(t("charges.detail.datesInvalid"));
    }

    await onSave({
      name: form.name.trim(),
      description: form.description.trim() || null,
      amount,
      generation_day: generationDay,
      due_day: dueDay,
      late_fee_type: form.lateFeeType,
      late_fee_value: lateFeeValue,
      starts_on: form.startsOn,
      ends_on: form.endsOn || null,
    });
  };

  const disabled = isSubmitting || !canManage;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-3 text-xl">
          <span className="flex size-7 items-center justify-center rounded-full bg-primary text-sm text-primary-foreground">
            1
          </span>
          {t("charges.terms.title")}
        </CardTitle>
        <CardDescription>{t("charges.terms.description")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label={t("charges.detail.amount.label")}
            type="number"
            min="0"
            step="0.01"
            value={form.amount}
            onChange={(e) => set("amount", e.target.value)}
            disabled={disabled}
          />
          <Input
            label={t("charges.terms.dueDay.label")}
            type="number"
            min="1"
            max="28"
            value={form.dueDay}
            onChange={(e) => set("dueDay", e.target.value)}
            disabled={disabled}
          />
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium">{t("charges.terms.lateFee.title")}</p>
          <div className="flex flex-wrap items-center gap-3">
            <SegmentedControl
              ariaLabel={t("charges.terms.lateFee.title")}
              value={form.lateFeeType}
              onChange={(v) => set("lateFeeType", v)}
              disabled={disabled}
              options={[
                { value: "none", label: t("charges.detail.lateFeeType.none") },
                { value: "fixed", label: t("charges.detail.lateFeeType.fixed") },
                { value: "percent", label: t("charges.detail.lateFeeType.percent") },
              ]}
            />
            {form.lateFeeType !== "none" && (
              <Input
                aria-label={
                  form.lateFeeType === "percent"
                    ? t("charges.detail.lateFeeValue.percent")
                    : t("charges.detail.lateFeeValue.fixed")
                }
                type="number"
                min="0"
                max={form.lateFeeType === "percent" ? "100" : undefined}
                step="0.01"
                value={form.lateFeeValue}
                onChange={(e) => set("lateFeeValue", e.target.value)}
                disabled={disabled}
                className="w-36"
                placeholder={form.lateFeeType === "percent" ? "%" : "$"}
              />
            )}
          </div>
        </div>

        <p className="rounded-lg bg-gates-accent px-4 py-3 text-sm text-gates-text-brand">{summary}</p>

        <details className="group rounded-lg border">
          <summary className="cursor-pointer select-none px-4 py-3 text-sm font-medium">
            {t("charges.terms.advanced")}
          </summary>
          <div className="grid gap-4 border-t p-4 sm:grid-cols-2">
            <Input
              label={t("charges.detail.chargeName.label")}
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              disabled={disabled}
            />
            <Input
              label={t("charges.detail.descriptionOptional.label")}
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              disabled={disabled}
            />
            <Input
              label={t("charges.detail.generationDay.label")}
              type="number"
              min="1"
              max="28"
              value={form.generationDay}
              onChange={(e) => set("generationDay", e.target.value)}
              disabled={disabled}
            />
            <div />
            <DatePicker
              mode="range"
              allowOpenEnd
              clearable
              className="sm:col-span-2"
              label={`${t("charges.detail.startsOn.label")} – ${t("charges.detail.endsOn.label")}`}
              value={{ from: form.startsOn, to: form.endsOn }}
              onChange={(range) => {
                set("startsOn", range.from);
                set("endsOn", range.to);
              }}
              disabled={disabled}
            />
            <p className="text-xs text-muted-foreground sm:col-span-2">{t("charges.detail.billingHelp")}</p>
          </div>
        </details>

        {canManage && (
          <div className="flex items-center gap-3">
            <Button onClick={handleSave} disabled={isSubmitting || !isDirty}>
              {isSubmitting ? <Spinner size="sm" /> : t("charges.detail.saveChanges")}
            </Button>
            {isDirty && <span className="text-sm text-gates-warning">{t("charges.terms.unsaved")}</span>}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
