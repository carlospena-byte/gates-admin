import { useEffect, useState } from "react";
import { toast } from "sonner";
import { IconArrowLeft } from "@tabler/icons-react";
import { AppSidebar } from "@/components/AppSidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Spinner } from "@/components/LoadingStates";
import { DeleteIcon } from "@/components/icons";
import { UnitResidentsPanel } from "@/components/units/UnitResidentsPanel";
import { UnitRentalsPanel } from "@/components/units/UnitRentalsPanel";
import { UnitChargesPanel } from "@/components/units/UnitChargesPanel";
import { LocationCombobox } from "@/components/units/LocationCombobox";
import { AddonItemPicker } from "@/components/units/AddonItemPicker";
import { confirmDeleteToast } from "@/lib/confirmDeleteToast";
import { authService } from "@/services";
import { useSession } from "@/state/useSession";
import { canManageResidential } from "@/state/useAccess";
import { useUnitManagerData } from "@/hooks/useUnitManagerData";
import { navigateTo } from "@/config/routes";
import type { ResidentialRole } from "@/types/database.types";

/**
 * Full page for a single unit — edit its type/location/addons, manage its
 * residents, toggle active, or delete it. Gets its own page (rather than a
 * sidesheet) because upcoming features (payment history, request history)
 * will live here too. Security/member roles get a read-only view.
 */
export function UnitDetailPage({
  residentialId,
  unitId,
  role,
}: {
  residentialId: string;
  unitId: string;
  role: ResidentialRole;
}) {
  const { session } = useSession();
  const canManage = canManageResidential(role);
  const {
    units,
    unitTypes,
    locations,
    locationTypes,
    addonItems,
    addonTypes,
    isLoading,
    isSubmitting,
    updateUnit,
    deleteUnit,
    toggleActive,
  } = useUnitManagerData(residentialId, true, true);

  const unit = units.find((u) => u.id === unitId);

  const [name, setName] = useState("");
  const [unitTypeId, setUnitTypeId] = useState("");
  const [locationId, setLocationId] = useState("");
  const [addonItemIds, setAddonItemIds] = useState<string[]>([]);
  const [price, setPrice] = useState("");

  useEffect(() => {
    if (!unit) return;
    setName(unit.name);
    setUnitTypeId(unit.unit_type_id || "");
    setLocationId(unit.location_id || "");
    setAddonItemIds(unit.unit_addons?.map((ua) => ua.addon_item_id) || []);
    setPrice(unit.price !== null && unit.price !== undefined ? String(unit.price) : "");
    // Only re-seed when a different unit loads, not on every background reload.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unit?.id]);

  const handleAddonToggle = (addonItemId: string) => {
    setAddonItemIds((prev) =>
      prev.includes(addonItemId) ? prev.filter((id) => id !== addonItemId) : [...prev, addonItemId],
    );
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error("Unit name is required");
      return;
    }

    await updateUnit(unitId, {
      name: name.trim(),
      unitTypeId,
      locationId,
      addonItemIds,
      price: price.trim() ? Number(price) : null,
    });
  };

  const handleDelete = () => {
    if (!unit) return;
    confirmDeleteToast(unit.name, async () => {
      const ok = await deleteUnit(unitId);
      if (ok) navigateTo("units");
    });
  };

  const BackButton = () => (
    <Button variant="ghost" size="sm" onClick={() => navigateTo("units")}>
      <IconArrowLeft className="h-4 w-4 mr-2" /> Back to Units
    </Button>
  );

  if (!unit) {
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
              <p className="text-sm text-muted-foreground">Unit not found.</p>
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
        <div className="mx-auto max-w-6xl px-6 py-6 space-y-6">
          <div className="flex items-center justify-between">
            <BackButton />
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">{unit.is_active ? "Active" : "Inactive"}</span>
              <Switch
                checked={unit.is_active}
                onCheckedChange={() => toggleActive(unitId, unit.is_active)}
                disabled={!canManage}
                aria-label={`Set ${unit.name} ${unit.is_active ? "inactive" : "active"}`}
              />
              {canManage && (
                <Button variant="ghost" size="sm" onClick={handleDelete}>
                  <DeleteIcon />
                </Button>
              )}
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
            <Card>
              <CardHeader>
                <CardTitle>{unit.name}</CardTitle>
                <CardDescription>Owner: {unit.profiles?.email || "Unassigned"}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Input
                  label="Unit Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={isSubmitting || !canManage}
                />

                <Select
                  value={unitTypeId || "none"}
                  onValueChange={(value) => setUnitTypeId(value === "none" ? "" : value)}
                  disabled={isSubmitting || !canManage}
                >
                  <SelectTrigger label="Unit Type">
                    <SelectValue placeholder="Select unit type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {unitTypes.map((type) => (
                      <SelectItem key={type.id} value={type.id}>
                        {type.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <LocationCombobox
                  locations={locations}
                  locationTypes={locationTypes}
                  value={locationId}
                  onChange={setLocationId}
                  disabled={isSubmitting || !canManage}
                />

                <Input
                  label="Price (optional)"
                  type="number"
                  min="0"
                  step="0.01"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="e.g., 500.00"
                  disabled={isSubmitting || !canManage}
                />

                <AddonItemPicker
                  addonItems={addonItems}
                  addonTypes={addonTypes}
                  locations={locations}
                  locationTypes={locationTypes}
                  selectedIds={addonItemIds}
                  onToggle={handleAddonToggle}
                  onSetSelected={setAddonItemIds}
                  disabled={isSubmitting || !canManage}
                />

                {canManage && (
                  <Button onClick={handleSave} disabled={isSubmitting || !name.trim()} className="w-full">
                    {isSubmitting ? <Spinner size="sm" /> : "Save Changes"}
                  </Button>
                )}
              </CardContent>
            </Card>

            <div className="space-y-6">
              <UnitResidentsPanel unitId={unitId} residentialId={residentialId} canManage={canManage} />
              <UnitChargesPanel unitId={unitId} canManage={canManage} />
            </div>
          </div>

          <UnitRentalsPanel unitId={unitId} residentialId={residentialId} canManage={canManage} />
        </div>
      </div>
    </div>
  );
}
