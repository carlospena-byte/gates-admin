/**
 * Step 2 of a charge: who pays it. Existing rules come first (with how many
 * units they add up to); adding a rule is a compact form underneath where the
 * three kinds of rule are spelled out in plain language.
 */

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { IconBuilding, IconHome } from "@tabler/icons-react";
import { useI18n } from "@/i18n/useI18n";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Spinner } from "@/components/LoadingStates";
import { DeleteIcon } from "@/components/icons";
import { SegmentedControl } from "@/components/charges/SegmentedControl";
import { LocationCombobox } from "@/components/units/LocationCombobox";
import { confirmDeleteToast } from "@/lib/confirmDeleteToast";
import { getLocationFullPath, getUnitFullLabel } from "@/lib/locationHierarchy";
import { formatCurrency } from "@/lib/utils";
import type {
  Charge,
  ChargeAssignment,
  ChargeAssignmentScope,
  CreateChargeAssignmentDto,
  Location,
  LocationTypeDefinition,
  UnitWithWizardData,
} from "@/types/unit-wizard.types";

interface ChargeRulesCardProps {
  charge: Charge;
  assignments: ChargeAssignment[];
  unitCount: number;
  units: UnitWithWizardData[];
  locations: Location[];
  locationTypes: LocationTypeDefinition[];
  canManage: boolean;
  isLoading: boolean;
  isSubmitting: boolean;
  onAdd: (dto: Omit<CreateChargeAssignmentDto, "residential_id" | "charge_id">) => Promise<boolean>;
  onRemove: (id: string) => Promise<boolean>;
  onToggleActive: (id: string, currentStatus: boolean) => Promise<void>;
}

export function ChargeRulesCard({
  charge,
  assignments,
  unitCount,
  units,
  locations,
  locationTypes,
  canManage,
  isLoading,
  isSubmitting,
  onAdd,
  onRemove,
  onToggleActive,
}: ChargeRulesCardProps) {
  const { t } = useI18n();
  const [scope, setScope] = useState<ChargeAssignmentScope>("location_subtree");
  const [locationId, setLocationId] = useState("");
  const [unitId, setUnitId] = useState("");
  const [override, setOverride] = useState("");

  const unitLabels = useMemo(() => {
    const map = new Map<string, string>();
    for (const unit of units) {
      const location = unit.location_id ? locations.find((l) => l.id === unit.location_id) : undefined;
      map.set(unit.id, getUnitFullLabel(unit.name, location, locations));
    }
    return map;
  }, [units, locations]);

  const sortedUnits = useMemo(
    () => [...units].sort((a, b) => (unitLabels.get(a.id) ?? "").localeCompare(unitLabels.get(b.id) ?? "")),
    [units, unitLabels],
  );

  const ruleTitle = (rule: ChargeAssignment): string => {
    if (rule.scope === "unit") {
      return (rule.unit_id && unitLabels.get(rule.unit_id)) || rule.units?.name || t("charges.detail.unknownUnit");
    }
    const location = locations.find((l) => l.id === rule.location_id);
    return getLocationFullPath(location, locations) || t("charges.detail.unknownLocation");
  };

  const ruleKind = (rule: ChargeAssignment): string =>
    t(
      rule.scope === "location_subtree"
        ? "charges.rules.kind.subtree"
        : rule.scope === "location_only"
          ? "charges.rules.kind.only"
          : "charges.rules.kind.unit",
    );

  const handleAdd = async () => {
    if (scope !== "unit" && !locationId) return toast.error(t("charges.detail.pickLocation"));
    if (scope === "unit" && !unitId) return toast.error(t("charges.detail.pickUnit"));
    if (override.trim() !== "" && !(Number(override) >= 0)) return toast.error(t("charges.detail.amountInvalid"));

    const ok = await onAdd({
      scope,
      location_id: scope === "unit" ? null : locationId,
      unit_id: scope === "unit" ? unitId : null,
      amount_override: override.trim() === "" ? null : Number(override),
    });
    if (ok) {
      setLocationId("");
      setUnitId("");
      setOverride("");
    }
  };

  const handleRemove = (rule: ChargeAssignment) => {
    confirmDeleteToast(ruleTitle(rule), async () => {
      await onRemove(rule.id);
    });
  };

  const scopeHelp =
    scope === "location_subtree"
      ? t("charges.rules.help.subtree")
      : scope === "location_only"
        ? t("charges.rules.help.only")
        : t("charges.rules.help.unit");

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-3 text-xl">
          <span className="flex size-7 items-center justify-center rounded-full bg-primary text-sm text-primary-foreground">
            2
          </span>
          {t("charges.rules.title")}
        </CardTitle>
        <CardDescription>{t("charges.rules.description")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-baseline gap-3">
          <span className="text-3xl font-semibold tracking-tight">{unitCount}</span>
          <span className="text-sm text-muted-foreground">{t("charges.rules.unitsCovered", { count: unitCount })}</span>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-4">
            <Spinner />
          </div>
        ) : assignments.length === 0 ? (
          <p className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
            {t("charges.rules.empty")}
          </p>
        ) : (
          <ul className="space-y-2">
            {assignments.map((rule) => {
              const Icon = rule.scope === "unit" ? IconHome : IconBuilding;
              return (
                <li
                  key={rule.id}
                  className="flex items-center gap-3 rounded-lg border p-3"
                  style={{ opacity: rule.is_active ? 1 : 0.6 }}
                >
                  <Icon className="h-5 w-5 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{ruleTitle(rule)}</p>
                    <p className="text-xs text-muted-foreground">{ruleKind(rule)}</p>
                  </div>
                  <div className="text-right text-sm">
                    <p className="font-medium">{formatCurrency(rule.amount_override ?? charge.amount)}</p>
                    {rule.amount_override !== null && (
                      <Badge variant="info" className="cursor-default">
                        {t("charges.rules.customAmount")}
                      </Badge>
                    )}
                  </div>
                  {canManage && (
                    <>
                      <Switch
                        checked={rule.is_active}
                        onCheckedChange={() => onToggleActive(rule.id, rule.is_active)}
                        disabled={isSubmitting}
                        aria-label={t("charges.detail.setAssignmentStatus", {
                          status: rule.is_active ? t("common.inactive") : t("common.active"),
                        })}
                      />
                      <Button size="sm" variant="ghost" onClick={() => handleRemove(rule)} disabled={isSubmitting}>
                        <DeleteIcon />
                      </Button>
                    </>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        {canManage && (
          <div className="space-y-4 rounded-lg bg-muted/40 p-4">
            <p className="text-sm font-medium">{t("charges.detail.addRule")}</p>

            <SegmentedControl
              ariaLabel={t("charges.detail.scope.label")}
              value={scope}
              onChange={(v) => {
                setScope(v);
                setLocationId("");
                setUnitId("");
              }}
              disabled={isSubmitting}
              options={[
                { value: "location_subtree", label: t("charges.rules.choice.subtree") },
                { value: "location_only", label: t("charges.rules.choice.only") },
                { value: "unit", label: t("charges.rules.choice.unit") },
              ]}
            />
            <p className="text-sm text-muted-foreground">{scopeHelp}</p>

            {scope !== "unit" ? (
              <LocationCombobox
                locations={locations}
                locationTypes={locationTypes}
                value={locationId}
                onChange={setLocationId}
                disabled={isSubmitting}
              />
            ) : (
              <Select value={unitId} onValueChange={setUnitId} disabled={isSubmitting}>
                <SelectTrigger label={t("charges.detail.unit.label")}>
                  <SelectValue placeholder={t("charges.detail.unit.placeholder")} />
                </SelectTrigger>
                <SelectContent>
                  {sortedUnits.map((unit) => (
                    <SelectItem key={unit.id} value={unit.id}>
                      {unitLabels.get(unit.id) ?? unit.name}
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
              value={override}
              onChange={(e) => setOverride(e.target.value)}
              placeholder={t("charges.detail.override.placeholder", { amount: formatCurrency(charge.amount) })}
              disabled={isSubmitting}
            />

            <Button onClick={handleAdd} disabled={isSubmitting} className="w-full">
              {isSubmitting ? <Spinner size="sm" /> : t("charges.rules.add")}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
