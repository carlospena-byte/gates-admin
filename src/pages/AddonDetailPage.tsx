import { useEffect, useState } from "react";
import { toast } from "sonner";
import { IconArrowLeft } from "@tabler/icons-react";
import { AppSidebar } from "@/components/AppSidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/LoadingStates";
import { AddonItemCreateForm } from "@/components/addons/AddonItemCreateForm";
import { AddonItemTable } from "@/components/addons/AddonItemTable";
import { authService } from "@/services";
import { useSession } from "@/state/useSession";
import { canManageResidential } from "@/state/useAccess";
import { useAddonItemManagerData } from "@/hooks/useAddonItemManagerData";
import { navigateTo } from "@/config/routes";
import { useI18n } from "@/i18n/useI18n";
import type { ResidentialRole } from "@/types/database.types";

/**
 * Full page for a single addon (e.g. "Parqueo") — edit its name/type, and
 * manage its addon_items, the physical instances of it (e.g. "P1 101"),
 * each with its own place in the location hierarchy.
 */
export function AddonDetailPage({
  residentialId,
  addonId,
  role,
}: {
  residentialId: string;
  addonId: string;
  role: ResidentialRole;
}) {
  const { t } = useI18n();
  const { session } = useSession();
  const canManage = canManageResidential(role);
  const {
    addon,
    addonTypes,
    items,
    locations,
    locationTypes,
    isLoading,
    isSubmitting,
    updateAddon,
    createItem,
    updateItem,
    deleteItem,
    toggleItemActive,
  } = useAddonItemManagerData(residentialId, addonId);

  const [name, setName] = useState("");
  const [addonTypeId, setAddonTypeId] = useState("");

  useEffect(() => {
    if (!addon) return;
    setName(addon.name);
    setAddonTypeId(addon.addon_type_id);
    // Only re-seed when the addon itself (re)loads, not on every background reload.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addon?.id]);

  const handleSave = async () => {
    if (!name.trim() || !addonTypeId) {
      toast.error(t("addonDetail.error.nameTypeRequired"));
      return;
    }
    await updateAddon({ name: name.trim(), addon_type_id: addonTypeId });
  };

  const BackButton = () => (
    <Button variant="ghost" size="sm" onClick={() => navigateTo("residential")}>
      <IconArrowLeft className="h-4 w-4 mr-2" /> {t("common.back")}
    </Button>
  );

  if (!addon) {
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
              <p className="text-sm text-muted-foreground">{t("addonDetail.notFound")}</p>
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
              <CardTitle>{addon.name}</CardTitle>
              <CardDescription>{t("addonDetail.editCard.description")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                label={t("addon.create.nameLabel")}
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isSubmitting || !canManage}
              />

              <Select value={addonTypeId} onValueChange={setAddonTypeId} disabled={isSubmitting || !canManage}>
                <SelectTrigger label={t("addonType.entityLabel")}>
                  <SelectValue placeholder={t("addon.create.typePlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                  {addonTypes.map((type) => (
                    <SelectItem key={type.id} value={type.id}>
                      {type.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {canManage && (
                <Button onClick={handleSave} disabled={isSubmitting || !name.trim() || !addonTypeId}>
                  {isSubmitting ? <Spinner size="sm" /> : t("addonDetail.saveChanges")}
                </Button>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("addonDetail.internalAddons.title")}</CardTitle>
              <CardDescription>{t("addonDetail.internalAddons.description")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {canManage && (
                <AddonItemCreateForm
                  locations={locations}
                  locationTypes={locationTypes}
                  isSubmitting={isSubmitting}
                  onCreate={createItem}
                />
              )}

              <AddonItemTable
                items={items}
                locations={locations}
                locationTypes={locationTypes}
                isLoading={isLoading}
                isSubmitting={isSubmitting}
                onUpdate={updateItem}
                onDelete={deleteItem}
                onToggleActive={toggleItemActive}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
