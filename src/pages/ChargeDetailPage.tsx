import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { IconArrowLeft } from "@tabler/icons-react";
import { useI18n } from "@/i18n/useI18n";
import { AppSidebar } from "@/components/AppSidebar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Spinner } from "@/components/LoadingStates";
import { DeleteIcon } from "@/components/icons";
import { LocationCombobox } from "@/components/units/LocationCombobox";
import { formatCurrency } from "@/lib/utils";
import { getLocationFullPath } from "@/lib/locationHierarchy";
import { confirmDeleteToast } from "@/lib/confirmDeleteToast";
import { authService } from "@/services";
import { useSession } from "@/state/useSession";
import { canManageResidential } from "@/state/useAccess";
import { useChargeDetailData } from "@/hooks/useChargeDetailData";
import { navigateTo } from "@/config/routes";
import type { ResidentialRole } from "@/types/database.types";
import type { ChargeAssignmentScope, LateFeeType } from "@/types/unit-wizard.types";

export function ChargeDetailPage({
  residentialId,
  chargeId,
  role,
}: {
  residentialId: string;
  chargeId: string;
  role: ResidentialRole;
}) {
  const { t } = useI18n();
  const { session } = useSession();
  const canManage = canManageResidential(role);
  const {
    charge,
    assignments,
    unitCount,
    units,
    locations,
    locationTypes,
    isLoading,
    isSubmitting,
    updateCharge,
    addAssignment,
    removeAssignment,
    toggleAssignmentActive,
    generateThisMonth,
  } = useChargeDetailData(residentialId, chargeId);

  const [form, setForm] = useState({
    name: "",
    description: "",
    amount: "",
    generationDay: "1",
    dueDay: "10",
    lateFeeType: "none" as LateFeeType,
    lateFeeValue: "0",
    startsOn: "",
    endsOn: "",
  });
  const setField = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  useEffect(() => {
    if (!charge) return;
    setForm({
      name: charge.name,
      description: charge.description || "",
      amount: String(charge.amount),
      generationDay: String(charge.generation_day),
      dueDay: String(charge.due_day),
      lateFeeType: charge.late_fee_type,
      lateFeeValue: String(charge.late_fee_value),
      startsOn: charge.starts_on,
      endsOn: charge.ends_on || "",
    });
    // Only re-seed when a different charge loads, not on every background reload.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [charge?.id]);

  const [scope, setScope] = useState<ChargeAssignmentScope>("location_subtree");
  const [ruleLocationId, setRuleLocationId] = useState("");
  const [ruleUnitId, setRuleUnitId] = useState("");
  const [ruleOverride, setRuleOverride] = useState("");

  const unitsById = useMemo(() => new Map(units.map((u) => [u.id, u])), [units]);

  const handleSave = async () => {
    const amount = Number(form.amount);
    const generationDay = Number(form.generationDay);
    const dueDay = Number(form.dueDay);
    const lateFeeValue = form.lateFeeType === "none" ? 0 : Number(form.lateFeeValue);

    if (!form.name.trim()) {
      toast.error(t("charges.detail.nameRequired"));
      return;
    }
    if (!(amount >= 0) || form.amount.trim() === "") {
      toast.error(t("charges.detail.amountInvalid"));
      return;
    }
    if (![generationDay, dueDay].every((d) => Number.isInteger(d) && d >= 1 && d <= 28)) {
      toast.error(t("charges.detail.dayInvalid"));
      return;
    }
    if (!(lateFeeValue >= 0) || (form.lateFeeType === "percent" && lateFeeValue > 100)) {
      toast.error(t("charges.detail.lateFeeInvalid"));
      return;
    }
    if (!form.startsOn || (form.endsOn && form.endsOn < form.startsOn)) {
      toast.error(t("charges.detail.datesInvalid"));
      return;
    }

    await updateCharge({
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

  const handleAddRule = async () => {
    if (scope !== "unit" && !ruleLocationId) {
      toast.error(t("charges.detail.pickLocation"));
      return;
    }
    if (scope === "unit" && !ruleUnitId) {
      toast.error(t("charges.detail.pickUnit"));
      return;
    }
    if (ruleOverride.trim() !== "" && !(Number(ruleOverride) >= 0)) {
      toast.error(t("charges.detail.amountInvalid"));
      return;
    }

    const ok = await addAssignment({
      scope,
      location_id: scope === "unit" ? null : ruleLocationId,
      unit_id: scope === "unit" ? ruleUnitId : null,
      amount_override: ruleOverride.trim() === "" ? null : Number(ruleOverride),
    });
    if (ok) {
      setRuleLocationId("");
      setRuleUnitId("");
      setRuleOverride("");
    }
  };

  const describeRule = (a: (typeof assignments)[number]): string => {
    if (a.scope === "unit") {
      const unit = unitsById.get(a.unit_id ?? "");
      return a.units?.name || unit?.name || t("charges.detail.unknownUnit");
    }
    const location = locations.find((l) => l.id === a.location_id);
    return getLocationFullPath(location, locations) || t("charges.detail.unknownLocation");
  };

  const handleRemove = (id: string, label: string) => {
    confirmDeleteToast(label, async () => {
      await removeAssignment(id);
    });
  };

  const BackButton = () => (
    <Button variant="ghost" size="sm" onClick={() => navigateTo("billing")}>
      <IconArrowLeft className="h-4 w-4 mr-2" /> {t("common.back")}
    </Button>
  );

  if (!charge) {
    return (
      <div className="min-h-screen">
        <AppSidebar userEmail={session?.user?.email} residentialId={residentialId} role={role} onSignOut={() => authService.signOut()} showUserMenu />
        <div className="lg:pl-64">
          <div className="mx-auto max-w-3xl px-6 py-6 space-y-4">
            <BackButton />
            {isLoading ? (
              <div className="flex justify-center py-12">
                <Spinner />
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">{t("charges.detail.notFound")}</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <AppSidebar userEmail={session?.user?.email} residentialId={residentialId} role={role} onSignOut={() => authService.signOut()} showUserMenu />

      <div className="lg:pl-64">
        <div className="mx-auto max-w-4xl px-6 py-6 space-y-6">
          <BackButton />

          <Card>
            <CardHeader>
              <CardTitle>{charge.name}</CardTitle>
              <CardDescription>{t("charges.detail.chargeDescription")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  label={t("charges.detail.chargeName.label")}
                  value={form.name}
                  onChange={(e) => setField("name", e.target.value)}
                  disabled={isSubmitting || !canManage}
                />
                <Input
                  label={t("charges.detail.descriptionOptional.label")}
                  value={form.description}
                  onChange={(e) => setField("description", e.target.value)}
                  disabled={isSubmitting || !canManage}
                />
                <Input
                  label={t("charges.detail.amount.label")}
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.amount}
                  onChange={(e) => setField("amount", e.target.value)}
                  disabled={isSubmitting || !canManage}
                />
                <div />
                <Input
                  label={t("charges.detail.generationDay.label")}
                  type="number"
                  min="1"
                  max="28"
                  value={form.generationDay}
                  onChange={(e) => setField("generationDay", e.target.value)}
                  disabled={isSubmitting || !canManage}
                />
                <Input
                  label={t("charges.detail.dueDay.label")}
                  type="number"
                  min="1"
                  max="28"
                  value={form.dueDay}
                  onChange={(e) => setField("dueDay", e.target.value)}
                  disabled={isSubmitting || !canManage}
                />
                <Select
                  value={form.lateFeeType}
                  onValueChange={(v) => setField("lateFeeType", v as LateFeeType)}
                  disabled={isSubmitting || !canManage}
                >
                  <SelectTrigger label={t("charges.detail.lateFeeType.label")}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{t("charges.detail.lateFeeType.none")}</SelectItem>
                    <SelectItem value="fixed">{t("charges.detail.lateFeeType.fixed")}</SelectItem>
                    <SelectItem value="percent">{t("charges.detail.lateFeeType.percent")}</SelectItem>
                  </SelectContent>
                </Select>
                {form.lateFeeType !== "none" ? (
                  <Input
                    label={
                      form.lateFeeType === "percent"
                        ? t("charges.detail.lateFeeValue.percent")
                        : t("charges.detail.lateFeeValue.fixed")
                    }
                    type="number"
                    min="0"
                    max={form.lateFeeType === "percent" ? "100" : undefined}
                    step="0.01"
                    value={form.lateFeeValue}
                    onChange={(e) => setField("lateFeeValue", e.target.value)}
                    disabled={isSubmitting || !canManage}
                  />
                ) : (
                  <div />
                )}
                <Input
                  label={t("charges.detail.startsOn.label")}
                  type="date"
                  value={form.startsOn}
                  onChange={(e) => setField("startsOn", e.target.value)}
                  disabled={isSubmitting || !canManage}
                />
                <Input
                  label={t("charges.detail.endsOn.label")}
                  type="date"
                  value={form.endsOn}
                  onChange={(e) => setField("endsOn", e.target.value)}
                  disabled={isSubmitting || !canManage}
                />
              </div>
              <p className="text-xs text-muted-foreground">{t("charges.detail.billingHelp")}</p>
              {canManage && (
                <div className="flex flex-wrap gap-2">
                  <Button onClick={handleSave} disabled={isSubmitting || !form.name.trim()}>
                    {isSubmitting ? <Spinner size="sm" /> : t("charges.detail.saveChanges")}
                  </Button>
                  <Button variant="outline" onClick={() => void generateThisMonth()} disabled={isSubmitting}>
                    {t("charges.detail.generateNow")}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {canManage && (
            <Card>
              <CardHeader>
                <CardTitle>{t("charges.detail.addRule")}</CardTitle>
                <CardDescription>{t("charges.detail.addRuleDescription")}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Select value={scope} onValueChange={(v) => setScope(v as ChargeAssignmentScope)}>
                  <SelectTrigger label={t("charges.detail.scope.label")}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="location_subtree">{t("charges.detail.scope.subtree")}</SelectItem>
                    <SelectItem value="location_only">{t("charges.detail.scope.only")}</SelectItem>
                    <SelectItem value="unit">{t("charges.detail.scope.unit")}</SelectItem>
                  </SelectContent>
                </Select>

                {scope !== "unit" && (
                  <LocationCombobox
                    locations={locations}
                    locationTypes={locationTypes}
                    value={ruleLocationId}
                    onChange={setRuleLocationId}
                    disabled={isSubmitting}
                  />
                )}

                {scope === "unit" && (
                  <Select value={ruleUnitId} onValueChange={setRuleUnitId} disabled={isSubmitting}>
                    <SelectTrigger label={t("charges.detail.unit.label")}>
                      <SelectValue placeholder={t("charges.detail.unit.placeholder")} />
                    </SelectTrigger>
                    <SelectContent>
                      {units.map((unit) => (
                        <SelectItem key={unit.id} value={unit.id}>
                          {unit.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}

                <Input
                  label={t("charges.detail.override.label")}
                  type="number"
                  min="0"
                  step="0.01"
                  value={ruleOverride}
                  onChange={(e) => setRuleOverride(e.target.value)}
                  placeholder={t("charges.detail.override.placeholder", { amount: formatCurrency(charge.amount) })}
                  disabled={isSubmitting}
                />

                <Button onClick={handleAddRule} disabled={isSubmitting} className="w-full">
                  {isSubmitting ? <Spinner size="sm" /> : t("charges.detail.addRule")}
                </Button>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>{t("charges.detail.currentRules")}</CardTitle>
              <CardDescription>
                {t("charges.detail.unitsCovered", { count: unitCount, chargeName: charge.name })}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center py-4">
                  <Spinner />
                </div>
              ) : assignments.length === 0 ? (
                <p className="text-center py-4 text-sm text-muted-foreground">{t("charges.detail.noRules")}</p>
              ) : (
                <div className="space-y-1.5">
                  {assignments.map((assignment) => (
                    <div
                      key={assignment.id}
                      className="flex items-center justify-between gap-2 rounded-md border p-2"
                    >
                      <div className="min-w-0 text-sm">
                        <span className="font-medium">{describeRule(assignment)}</span>{" "}
                        <Badge variant="secondary" className="cursor-default">
                          {t(
                            assignment.scope === "location_subtree"
                              ? "charges.detail.scope.subtreeShort"
                              : assignment.scope === "location_only"
                                ? "charges.detail.scope.onlyShort"
                                : "charges.detail.scope.unitShort",
                          )}
                        </Badge>{" "}
                        <span className="text-muted-foreground">
                          {formatCurrency(assignment.amount_override ?? charge.amount)}
                        </span>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        {!assignment.is_active && <Badge variant="secondary">{t("common.inactive")}</Badge>}
                        {canManage && (
                          <>
                            <Switch
                              checked={assignment.is_active}
                              onCheckedChange={() => toggleAssignmentActive(assignment.id, assignment.is_active)}
                              disabled={isSubmitting}
                              aria-label={t("charges.detail.setAssignmentStatus", {
                                status: assignment.is_active ? t("common.inactive") : t("common.active"),
                              })}
                            />
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleRemove(assignment.id, describeRule(assignment))}
                              disabled={isSubmitting}
                            >
                              <DeleteIcon />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
