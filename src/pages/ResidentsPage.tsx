/**
 * Residents page — residential-wide list of unit_residents, the "lista
 * transversal" the audit flagged as missing (the data/CRUD already existed
 * per-unit via UnitResidentsPanel).
 */

import { useState } from "react";
import { IconRefresh } from "@tabler/icons-react";
import { AppSidebar } from "@/components/AppSidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AddResidentSheet } from "@/components/units/AddResidentSheet";
import { ResidentTable } from "@/components/residents/ResidentTable";
import { authService } from "@/services";
import { useSession } from "@/state/useSession";
import { canManageResidential } from "@/state/useAccess";
import { useResidentsManagerData } from "@/hooks/useResidentsManagerData";
import { useI18n } from "@/i18n/useI18n";
import type { ResidentialRole } from "@/types/database.types";

export function ResidentsPage({ residentialId, role }: { residentialId: string; role: ResidentialRole }) {
  const { t } = useI18n();
  const { session } = useSession();
  const canManage = canManageResidential(role);
  const [sheetOpen, setSheetOpen] = useState(false);

  const { residents, units, isLoading, isSubmitting, reload, createResidentAndInvite, deleteResident, toggleActive, inviteResident } =
    useResidentsManagerData(residentialId);

  return (
    <div className="min-h-screen">
      <AppSidebar userEmail={session?.user?.email} residentialId={residentialId} role={role} onSignOut={() => authService.signOut()} showUserMenu />

      <div className="lg:pl-64">
        <div className="mx-auto max-w-7xl px-6 py-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>{t("residents.page.title")}</CardTitle>
                <CardDescription>{t("residents.page.description")}</CardDescription>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={reload} disabled={isLoading}>
                  <IconRefresh className="h-4 w-4" />
                </Button>
                {canManage && <Button onClick={() => setSheetOpen(true)}>{t("residents.page.add")}</Button>}
              </div>
            </CardHeader>
            <CardContent>
              <ResidentTable
                residents={residents}
                isLoading={isLoading}
                isSubmitting={isSubmitting}
                canManage={canManage}
                onToggleActive={toggleActive}
                onDelete={deleteResident}
                onInvite={inviteResident}
              />
            </CardContent>
          </Card>
        </div>
      </div>

      <AddResidentSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        units={units}
        isSubmitting={isSubmitting}
        onCreate={createResidentAndInvite}
      />
    </div>
  );
}
