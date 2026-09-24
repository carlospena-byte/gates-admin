import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  IconArrowLeft,
  IconBed,
  IconBuilding,
  IconCalendar,
  IconCar,
  IconClipboardList,
  IconCreditCard,
  IconDots,
  IconPackage,
  IconStairs,
  IconTrash,
  IconUsers,
} from "@tabler/icons-react";
import { AppSidebar } from "@/components/AppSidebar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Spinner } from "@/components/LoadingStates";
import { UnitResidentsPanel } from "@/components/units/UnitResidentsPanel";
import { UnitVehiclesPanel } from "@/components/units/UnitVehiclesPanel";
import { UnitRentalsPanel } from "@/components/units/UnitRentalsPanel";
import { UnitChargesPanel } from "@/components/units/UnitChargesPanel";
import { LocationCombobox } from "@/components/units/LocationCombobox";
import { UnitAddonsSection } from "@/components/units/UnitAddonsSection";
import { confirmDeleteToast } from "@/lib/confirmDeleteToast";
import { getLocationChain } from "@/lib/locationHierarchy";
import { cn } from "@/lib/utils";
import { authService } from "@/services";
import { useSession } from "@/state/useSession";
import { canManageResidential } from "@/state/useAccess";
import { useUnitManagerData, type UnitFormPayload } from "@/hooks/useUnitManagerData";
import { useScrollSpy } from "@/hooks/useScrollSpy";
import { navigateTo } from "@/config/routes";
import { useI18n } from "@/i18n/useI18n";
import type { ResidentialRole } from "@/types/database.types";

type UnitDraft = Omit<UnitFormPayload, "price"> & { price: string };

// Order matches how sections actually stack on the page (General/Add-ons
// share the top card; Residents sits beside Charges; Rentals is last), so
// the scrollspy highlight advances left-to-right as the user scrolls down.
const SECTIONS = [
  { key: "general", labelKey: "units.detail.sections.general", icon: IconClipboardList },
  { key: "addons", labelKey: "units.detail.sections.addons", icon: IconPackage },
  { key: "residents", labelKey: "units.detail.sections.residents", icon: IconUsers },
  { key: "vehicles", labelKey: "units.detail.sections.vehicles", icon: IconCar },
  { key: "charges", labelKey: "units.detail.sections.charges", icon: IconCreditCard },
  { key: "rentals", labelKey: "units.detail.sections.rentals", icon: IconCalendar },
] as const;

const SECTION_IDS = SECTIONS.map((s) => s.key);

/**
 * Full page for a single unit — edit its type/location/addons, manage its
 * residents, toggle active, or delete it. Gets its own page (rather than a
 * sidesheet) because upcoming features (payment history, request history)
 * will live here too. Security/member roles get a read-only view.
 *
 * All sections render at once, stacked on the page; the section nav below
 * the unit header is a sticky scrollspy strip that jumps to (and
 * highlights) whichever section is in view, not a tab switcher.
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
  const { t } = useI18n();
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
    updateAddonItem,
  } = useUnitManagerData(residentialId, true, true);

  const unit = units.find((u) => u.id === unitId);

  const [activeSection, jumpToSection] = useScrollSpy(SECTION_IDS);
  const scrollToSection = (id: string) => {
    jumpToSection(id);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const emptyDraft: UnitDraft = { name: "", unitTypeId: "", locationId: "", addonItemIds: [], price: "" };

  // Seeded from the unit, then only re-seeded when a different unit loads
  // (see the effect below) or right after a successful save (see
  // handleSave) — never on a background reload, so it doesn't clobber
  // in-progress edits.
  const [snapshot, setSnapshot] = useState<UnitDraft | null>(null);
  const [draft, setDraft] = useState<UnitDraft>(emptyDraft);

  useEffect(() => {
    if (!unit) return;
    const seeded: UnitDraft = {
      name: unit.name,
      unitTypeId: unit.unit_type_id || "",
      locationId: unit.location_id || "",
      addonItemIds: unit.unit_addons?.map((ua) => ua.addon_item_id) || [],
      price: unit.price !== null && unit.price !== undefined ? String(unit.price) : "",
    };
    setSnapshot(seeded);
    setDraft(seeded);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unit?.id]);

  const isDirty =
    !!snapshot &&
    (draft.name !== snapshot.name ||
      draft.unitTypeId !== snapshot.unitTypeId ||
      draft.locationId !== snapshot.locationId ||
      draft.price !== snapshot.price ||
      draft.addonItemIds.length !== snapshot.addonItemIds.length ||
      [...draft.addonItemIds].sort().join(",") !== [...snapshot.addonItemIds].sort().join(","));

  const setName = (name: string) => setDraft((prev) => ({ ...prev, name }));
  const setUnitTypeId = (unitTypeId: string) => setDraft((prev) => ({ ...prev, unitTypeId }));
  const setLocationId = (locationId: string) => setDraft((prev) => ({ ...prev, locationId }));
  const setPrice = (price: string) => setDraft((prev) => ({ ...prev, price }));
  const setAddonItemIds = (addonItemIds: string[]) => setDraft((prev) => ({ ...prev, addonItemIds }));

  const unitLocation = locations.find((l) => l.id === draft.locationId);
  const locationChain = useMemo(() => getLocationChain(unitLocation, locations), [unitLocation, locations]);
  const unitTypeObj = unitTypes.find((t) => t.id === draft.unitTypeId);

  const handleSave = async () => {
    if (!draft.name.trim()) {
      toast.error(t("units.detail.nameRequired"));
      return;
    }

    const payload: UnitFormPayload = {
      name: draft.name.trim(),
      unitTypeId: draft.unitTypeId,
      locationId: draft.locationId,
      addonItemIds: draft.addonItemIds,
      price: draft.price.trim() ? Number(draft.price) : null,
    };

    const ok = await updateUnit(unitId, payload);
    if (ok) {
      const saved: UnitDraft = { ...payload, price: draft.price };
      setSnapshot(saved);
      setDraft(saved);
    }
  };

  const handleCancel = () => {
    if (snapshot) setDraft(snapshot);
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
      <IconArrowLeft className="h-4 w-4 mr-2" /> {t("units.detail.backToUnits")}
    </Button>
  );

  if (!unit) {
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
              <p className="text-sm text-muted-foreground">{t("units.detail.notFound")}</p>
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
        <div className={cn("mx-auto max-w-6xl px-6 py-6 space-y-6", isDirty && "pb-28")}>
          <div className="flex items-center justify-between">
            <BackButton />
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">
                {unit.is_active ? t("common.active") : t("common.inactive")}
              </span>
              <Switch
                checked={unit.is_active}
                onCheckedChange={() => toggleActive(unitId, unit.is_active)}
                disabled={!canManage}
                aria-label={t("units.detail.toggleActiveAria", {
                  name: unit.name,
                  state: unit.is_active ? t("common.inactive") : t("common.active"),
                })}
              />
              {canManage && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="icon" aria-label={t("units.detail.moreActionsAria")}>
                      <IconDots className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      className="cursor-pointer text-red-600 focus:text-red-600 dark:text-red-400 dark:focus:text-red-400"
                      onClick={handleDelete}
                    >
                      <IconTrash className="mr-2 h-4 w-4" /> {t("units.detail.deleteUnit")}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>

          <Card>
            <CardHeader className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-semibold leading-none tracking-tight">{unit.name}</h1>
                <Badge
                  className={cn(
                    "border-transparent",
                    unit.is_active ? "bg-green-100 text-green-700" : "bg-secondary text-secondary-foreground",
                  )}
                >
                  {unit.is_active ? t("common.active") : t("common.inactive")}
                </Badge>
              </div>

              {(locationChain.length > 0 || unitTypeObj) && (
                <div className="flex flex-wrap gap-2">
                  {locationChain.map((loc) => {
                    const level = locationTypes.find((t) => t.code === loc.type)?.level ?? 1;
                    const LevelIcon = level > 1 ? IconStairs : IconBuilding;
                    return (
                      <Badge key={loc.id} variant="secondary" className="gap-1 font-normal">
                        <LevelIcon className="h-3.5 w-3.5" /> {loc.name}
                      </Badge>
                    );
                  })}
                  {unitTypeObj && (
                    <Badge variant="secondary" className="gap-1 font-normal">
                      <IconBed className="h-3.5 w-3.5" /> {unitTypeObj.name}
                    </Badge>
                  )}
                </div>
              )}

              <p className="text-sm text-muted-foreground">
                {t("units.detail.owner", { email: unit.profiles?.email || t("units.common.unassigned") })}
              </p>
            </CardHeader>
          </Card>

          {/* Sticky section nav — jumps to (and highlights) whichever section is
              in view. Sits outside every section's card so it keeps working
              while scrolling past the top card into Residents/Charges/Rentals. */}
          <div className="sticky top-14 z-20 border-b bg-background lg:top-0">
            <nav className="flex items-center gap-1 overflow-x-auto">
              {SECTIONS.map(({ key, labelKey, icon: Icon }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => scrollToSection(key)}
                  className={cn(
                    "inline-flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    activeSection === key
                      ? "border-primary text-foreground"
                      : "border-transparent text-muted-foreground hover:text-foreground",
                  )}
                >
                  <Icon className="h-4 w-4" /> {t(labelKey)}
                </button>
              ))}
            </nav>
          </div>

          <Card>
            <CardContent className="space-y-8 pt-6">
              <section id="general" className="scroll-mt-28 space-y-4">
                <div>
                  <p className="text-sm font-medium">{t("units.detail.sections.general")}</p>
                  <p className="text-xs text-muted-foreground">{t("units.detail.general.description")}</p>
                </div>

                <Input
                  label={t("units.detail.fields.name")}
                  value={draft.name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={isSubmitting || !canManage}
                />

                <Select
                  value={draft.unitTypeId || "none"}
                  onValueChange={(value) => setUnitTypeId(value === "none" ? "" : value)}
                  disabled={isSubmitting || !canManage}
                >
                  <SelectTrigger label={t("units.detail.fields.type")}>
                    <SelectValue placeholder={t("units.detail.fields.typePlaceholder")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{t("common.none")}</SelectItem>
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
                  value={draft.locationId}
                  onChange={setLocationId}
                  disabled={isSubmitting || !canManage}
                />

                <Input
                  label={t("units.detail.fields.price")}
                  type="number"
                  min="0"
                  step="0.01"
                  value={draft.price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder={t("units.detail.fields.pricePlaceholder")}
                  disabled={isSubmitting || !canManage}
                />
              </section>

              <div className="border-t" />

              <section id="addons" className="scroll-mt-28">
                <UnitAddonsSection
                  addonItems={addonItems}
                  addonTypes={addonTypes}
                  locations={locations}
                  locationTypes={locationTypes}
                  selectedIds={draft.addonItemIds}
                  onSetSelected={setAddonItemIds}
                  onUpdateAddonItem={updateAddonItem}
                  isSubmitting={isSubmitting}
                  disabled={isSubmitting || !canManage}
                />
              </section>
            </CardContent>
          </Card>

          <div className="grid gap-6 md:grid-cols-2">
            <section id="residents" className="scroll-mt-28">
              <UnitResidentsPanel unitId={unitId} residentialId={residentialId} canManage={canManage} />
            </section>

            <section id="vehicles" className="scroll-mt-28">
              <UnitVehiclesPanel unitId={unitId} residentialId={residentialId} canManage={canManage} />
            </section>

            <section id="charges" className="scroll-mt-28">
              <UnitChargesPanel unitId={unitId} canManage={canManage} />
            </section>
          </div>

          <section id="rentals" className="scroll-mt-28">
            <UnitRentalsPanel unitId={unitId} residentialId={residentialId} canManage={canManage} />
          </section>
        </div>
      </div>

      {isDirty && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t bg-background lg:pl-64">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4">
            <div>
              <p className="text-sm font-medium">{t("common.unsavedChanges")}</p>
              <p className="text-xs text-muted-foreground">{t("units.detail.unsavedDescription")}</p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={handleCancel} disabled={isSubmitting}>
                {t("common.cancel")}
              </Button>
              <Button onClick={handleSave} disabled={isSubmitting || !draft.name.trim()}>
                {isSubmitting ? <Spinner size="sm" /> : t("units.detail.saveChanges")}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
