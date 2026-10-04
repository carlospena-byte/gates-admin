import { useState } from "react";
import { IconRefresh } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AppSidebar } from "@/components/AppSidebar";
import { UnitManager } from "@/components/UnitManager";
import { UnitTable } from "@/components/units/UnitTable";
import { authService } from "@/services";
import { useSession } from "@/state/useSession";
import { canManageResidential } from "@/state/useAccess";
import { useUnitManagerData } from "@/hooks/useUnitManagerData";
import { useI18n } from "@/i18n/useI18n";
import { useCreateIntent } from "@/lib/createIntent";
import { SectionTabs } from "@/components/SectionTabs";
import type { ResidentialRole } from "@/types/database.types";

export function UnitsPage({ residentialId, role }: { residentialId: string; role: ResidentialRole }) {
  const { t } = useI18n();
  const { session } = useSession();
  const canManage = canManageResidential(role);
  const [unitManagerOpen, setUnitManagerOpen] = useState(false);
  useCreateIntent("unit", () => setUnitManagerOpen(true));

  const {
    units,
    locations,
    isLoading,
    isSubmitting,
    reload,
    deleteUnit,
    toggleActive,
  } = useUnitManagerData(residentialId, true, true);

  const handleUnitManagerOpenChange = (open: boolean) => {
    setUnitManagerOpen(open);
    if (!open) void reload();
  };

  return (
    <div className="min-h-screen">
      <AppSidebar userEmail={session?.user?.email} residentialId={residentialId} role={role} onSignOut={() => authService.signOut()} showUserMenu />

      <div className="lg:pl-64">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
          <SectionTabs section="community" role={role} />
          <Card>
            <CardHeader className="flex flex-col gap-3 space-y-0 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle>{t("common.units")}</CardTitle>
                <CardDescription>{t("units.page.description")}</CardDescription>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="icon" aria-label={t("common.refresh")} onClick={reload} disabled={isLoading}>
                  <IconRefresh className="h-4 w-4" />
                </Button>
                {canManage && <Button onClick={() => setUnitManagerOpen(true)}>{t("units.actions.addUnit")}</Button>}
              </div>
            </CardHeader>
            <CardContent>
              <UnitTable
                units={units}
                locations={locations}
                isLoading={isLoading}
                isSubmitting={isSubmitting}
                canManage={canManage}
                onDelete={deleteUnit}
                onToggleActive={toggleActive}
              />
            </CardContent>
          </Card>
        </div>
      </div>

      <UnitManager
        open={unitManagerOpen}
        onOpenChange={handleUnitManagerOpenChange}
        residentialId={residentialId}
        showList={false}
        onUnitCreated={reload}
      />
    </div>
  );
}
