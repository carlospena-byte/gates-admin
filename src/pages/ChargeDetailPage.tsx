import { useEffect, useState } from "react";
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
import { confirmDeleteToast } from "@/lib/confirmDeleteToast";
import { authService } from "@/services";
import { useSession } from "@/state/useSession";
import { canManageResidential } from "@/state/useAccess";
import { useChargeDetailData, type AssignTarget } from "@/hooks/useChargeDetailData";
import { navigateTo } from "@/config/routes";
import type { ResidentialRole } from "@/types/database.types";

type TargetMode = AssignTarget["mode"];

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
    units,
    unitTypes,
    locations,
    locationTypes,
    isLoading,
    isSubmitting,
    updateCharge,
    bulkAssign,
    removeAssignment,
    toggleAssignmentActive,
  } = useChargeDetailData(residentialId, chargeId);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    if (!charge) return;
    setName(charge.name);
    setDescription(charge.description || "");
    // Only re-seed when a different charge loads, not on every background reload.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [charge?.id]);

  const [targetMode, setTargetMode] = useState<TargetMode>("all");
  const [targetLocationId, setTargetLocationId] = useState("");
  const [targetUnitTypeId, setTargetUnitTypeId] = useState("");
  const [targetUnitIds, setTargetUnitIds] = useState<string[]>([]);
  const [assignPrice, setAssignPrice] = useState("");

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error(t("charges.detail.nameRequired"));
      return;
    }
    await updateCharge({ name: name.trim(), description: description.trim() || null });
  };

  const handleManualToggle = (unitId: string) => {
    setTargetUnitIds((prev) => (prev.includes(unitId) ? prev.filter((id) => id !== unitId) : [...prev, unitId]));
  };

  const handleAssign = async () => {
    if (!assignPrice.trim()) {
      toast.error(t("charges.detail.priceRequired"));
      return;
    }

    let target: AssignTarget;
    if (targetMode === "all") {
      target = { mode: "all" };
    } else if (targetMode === "location") {
      if (!targetLocationId) {
        toast.error(t("charges.detail.pickLocation"));
        return;
      }
      target = { mode: "location", locationId: targetLocationId };
    } else if (targetMode === "unitType") {
      if (!targetUnitTypeId) {
        toast.error(t("charges.detail.pickUnitType"));
        return;
      }
      target = { mode: "unitType", unitTypeId: targetUnitTypeId };
    } else {
      if (targetUnitIds.length === 0) {
        toast.error(t("charges.detail.pickAtLeastOneUnit"));
        return;
      }
      target = { mode: "manual", unitIds: targetUnitIds };
    }

    const ok = await bulkAssign(target, Number(assignPrice));
    if (ok) {
      setAssignPrice("");
      setTargetUnitIds([]);
    }
  };

  const handleRemove = (id: string, unitName: string) => {
    confirmDeleteToast(unitName, async () => {
      await removeAssignment(id);
    });
  };

  const BackButton = () => (
    <Button variant="ghost" size="sm" onClick={() => navigateTo("residential")}>
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
              <Input
                label={t("charges.detail.chargeName.label")}
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isSubmitting || !canManage}
              />
              <Input
                label={t("charges.detail.descriptionOptional.label")}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={isSubmitting || !canManage}
              />
              {canManage && (
                <Button onClick={handleSave} disabled={isSubmitting || !name.trim()}>
                  {isSubmitting ? <Spinner size="sm" /> : t("charges.detail.saveChanges")}
                </Button>
              )}
            </CardContent>
          </Card>

          {canManage && (
            <Card>
              <CardHeader>
                <CardTitle>{t("charges.detail.assignToUnits")}</CardTitle>
                <CardDescription>{t("charges.detail.assignDescription")}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Select value={targetMode} onValueChange={(v) => setTargetMode(v as TargetMode)}>
                  <SelectTrigger label={t("charges.detail.assignTo.label")}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("charges.detail.assignTo.all")}</SelectItem>
                    <SelectItem value="location">{t("charges.detail.assignTo.location")}</SelectItem>
                    <SelectItem value="unitType">{t("charges.detail.assignTo.unitType")}</SelectItem>
                    <SelectItem value="manual">{t("charges.detail.assignTo.manual")}</SelectItem>
                  </SelectContent>
                </Select>

                {targetMode === "location" && (
                  <LocationCombobox
                    locations={locations}
                    locationTypes={locationTypes}
                    value={targetLocationId}
                    onChange={setTargetLocationId}
                    disabled={isSubmitting}
                  />
                )}

                {targetMode === "unitType" && (
                  <Select value={targetUnitTypeId} onValueChange={setTargetUnitTypeId} disabled={isSubmitting}>
                    <SelectTrigger label={t("charges.detail.unitType.label")}>
                      <SelectValue placeholder={t("charges.detail.unitType.placeholder")} />
                    </SelectTrigger>
                    <SelectContent>
                      {unitTypes.map((type) => (
                        <SelectItem key={type.id} value={type.id}>
                          {type.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}

                {targetMode === "manual" && (
                  <div className="border rounded-md p-3 max-h-48 overflow-y-auto space-y-1">
                    {units.length > 0 ? (
                      units.map((unit) => (
                        <div key={unit.id} className="flex items-center space-x-2 py-1">
                          <input
                            type="checkbox"
                            id={`charge-unit-${unit.id}`}
                            checked={targetUnitIds.includes(unit.id)}
                            onChange={() => handleManualToggle(unit.id)}
                            disabled={isSubmitting}
                            className="h-4 w-4"
                          />
                          <label htmlFor={`charge-unit-${unit.id}`} className="text-sm cursor-pointer">
                            {unit.name}
                          </label>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">{t("charges.detail.noUnitsAvailable")}</p>
                    )}
                  </div>
                )}

                <Input
                  label={t("charges.detail.priceForGroup.label")}
                  type="number"
                  min="0"
                  step="0.01"
                  value={assignPrice}
                  onChange={(e) => setAssignPrice(e.target.value)}
                  placeholder={t("charges.detail.priceForGroup.placeholder")}
                  disabled={isSubmitting}
                />

                <Button onClick={handleAssign} disabled={isSubmitting || !assignPrice.trim()} className="w-full">
                  {isSubmitting ? <Spinner size="sm" /> : t("charges.detail.apply")}
                </Button>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>{t("charges.detail.currentAssignments")}</CardTitle>
              <CardDescription>
                {t("charges.detail.unitsChargedFor", { count: assignments.length, chargeName: charge.name })}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center py-4">
                  <Spinner />
                </div>
              ) : assignments.length === 0 ? (
                <p className="text-center py-4 text-sm text-muted-foreground">{t("charges.detail.noUnitsAssigned")}</p>
              ) : (
                <div className="space-y-1.5">
                  {assignments.map((assignment) => (
                    <div
                      key={assignment.id}
                      className="flex items-center justify-between gap-2 rounded-md border p-2"
                    >
                      <div className="min-w-0 text-sm">
                        <span className="font-medium">{assignment.units?.name || t("charges.detail.unknownUnit")}</span>{" "}
                        <span className="text-muted-foreground">{formatCurrency(assignment.price)}</span>
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
                              onClick={() =>
                                handleRemove(assignment.id, assignment.units?.name || t("charges.detail.thisUnit"))
                              }
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
