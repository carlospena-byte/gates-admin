import { useEffect, useState } from "react";
import { toast } from "sonner";
import { IconArrowLeft } from "@tabler/icons-react";
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
      toast.error("Charge name is required");
      return;
    }
    await updateCharge({ name: name.trim(), description: description.trim() || null });
  };

  const handleManualToggle = (unitId: string) => {
    setTargetUnitIds((prev) => (prev.includes(unitId) ? prev.filter((id) => id !== unitId) : [...prev, unitId]));
  };

  const handleAssign = async () => {
    if (!assignPrice.trim()) {
      toast.error("Price is required");
      return;
    }

    let target: AssignTarget;
    if (targetMode === "all") {
      target = { mode: "all" };
    } else if (targetMode === "location") {
      if (!targetLocationId) {
        toast.error("Pick a location");
        return;
      }
      target = { mode: "location", locationId: targetLocationId };
    } else if (targetMode === "unitType") {
      if (!targetUnitTypeId) {
        toast.error("Pick a unit type");
        return;
      }
      target = { mode: "unitType", unitTypeId: targetUnitTypeId };
    } else {
      if (targetUnitIds.length === 0) {
        toast.error("Pick at least one unit");
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
      <IconArrowLeft className="h-4 w-4 mr-2" /> Back
    </Button>
  );

  if (!charge) {
    return (
      <div className="min-h-screen">
        <AppSidebar userEmail={session?.user?.email} onSignOut={() => authService.signOut()} showUserMenu />
        <div className="lg:pl-64">
          <div className="mx-auto max-w-3xl px-6 py-6 space-y-4">
            <BackButton />
            {isLoading ? (
              <div className="flex justify-center py-12">
                <Spinner />
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Charge not found.</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <AppSidebar userEmail={session?.user?.email} onSignOut={() => authService.signOut()} showUserMenu />

      <div className="lg:pl-64">
        <div className="mx-auto max-w-4xl px-6 py-6 space-y-6">
          <BackButton />

          <Card>
            <CardHeader>
              <CardTitle>{charge.name}</CardTitle>
              <CardDescription>
                Recurring extra charge — its price is set per unit or group below, not here.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                label="Charge Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isSubmitting || !canManage}
              />
              <Input
                label="Description (optional)"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={isSubmitting || !canManage}
              />
              {canManage && (
                <Button onClick={handleSave} disabled={isSubmitting || !name.trim()}>
                  {isSubmitting ? <Spinner size="sm" /> : "Save Changes"}
                </Button>
              )}
            </CardContent>
          </Card>

          {canManage && (
            <Card>
              <CardHeader>
                <CardTitle>Assign to Units</CardTitle>
                <CardDescription>
                  Apply one price to a whole group at once — no need to check units off one by one.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Select value={targetMode} onValueChange={(v) => setTargetMode(v as TargetMode)}>
                  <SelectTrigger label="Assign To">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All active units</SelectItem>
                    <SelectItem value="location">Units under a location (e.g. a tower)</SelectItem>
                    <SelectItem value="unitType">Units of a type</SelectItem>
                    <SelectItem value="manual">Manual selection</SelectItem>
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
                    <SelectTrigger label="Unit Type">
                      <SelectValue placeholder="Select unit type" />
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
                      <p className="text-sm text-muted-foreground">No units available</p>
                    )}
                  </div>
                )}

                <Input
                  label="Price for this group"
                  type="number"
                  min="0"
                  step="0.01"
                  value={assignPrice}
                  onChange={(e) => setAssignPrice(e.target.value)}
                  placeholder="e.g., 100.00"
                  disabled={isSubmitting}
                />

                <Button onClick={handleAssign} disabled={isSubmitting || !assignPrice.trim()} className="w-full">
                  {isSubmitting ? <Spinner size="sm" /> : "Apply"}
                </Button>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Current Assignments</CardTitle>
              <CardDescription>
                {assignments.length} unit{assignments.length === 1 ? "" : "s"} charged for {charge.name}.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center py-4">
                  <Spinner />
                </div>
              ) : assignments.length === 0 ? (
                <p className="text-center py-4 text-sm text-muted-foreground">No units assigned yet.</p>
              ) : (
                <div className="space-y-1.5">
                  {assignments.map((assignment) => (
                    <div
                      key={assignment.id}
                      className="flex items-center justify-between gap-2 rounded-md border p-2"
                    >
                      <div className="min-w-0 text-sm">
                        <span className="font-medium">{assignment.units?.name || "Unknown unit"}</span>{" "}
                        <span className="text-muted-foreground">{formatCurrency(assignment.price)}</span>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        {!assignment.is_active && <Badge variant="secondary">inactive</Badge>}
                        {canManage && (
                          <>
                            <Switch
                              checked={assignment.is_active}
                              onCheckedChange={() => toggleAssignmentActive(assignment.id, assignment.is_active)}
                              disabled={isSubmitting}
                              aria-label={`Set assignment ${assignment.is_active ? "inactive" : "active"}`}
                            />
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleRemove(assignment.id, assignment.units?.name || "this unit")}
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
