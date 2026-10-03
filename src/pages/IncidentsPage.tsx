/**
 * Incidents page — New / In Progress / Resolved / Closed, backed by one
 * residential-wide fetch (useIncidentManagerData) split into buckets
 * client-side, same convention as VisitorsPage.
 */

import { useMemo, useState } from "react";
import { IconRefresh } from "@tabler/icons-react";
import { AppSidebar } from "@/components/AppSidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AddIncidentSheet, type NewIncidentFields } from "@/components/incidents/AddIncidentSheet";
import { IncidentDetailSheet } from "@/components/incidents/IncidentDetailSheet";
import { IncidentTable } from "@/components/incidents/IncidentTable";
import { toast } from "sonner";
import { authService, incidentService } from "@/services";
import { useSession } from "@/state/useSession";
import { canManageResidential } from "@/state/useAccess";
import { useIncidentManagerData, type IncidentFormPayload } from "@/hooks/useIncidentManagerData";
import { useI18n } from "@/i18n/useI18n";
import { useCreateIntent } from "@/lib/createIntent";
import { SectionTabs } from "@/components/SectionTabs";
import type { ResidentialRole } from "@/types/database.types";
import type { IncidentWithRelations } from "@/types/incident.types";

export function IncidentsPage({ residentialId, role }: { residentialId: string; role: ResidentialRole }) {
  const { t } = useI18n();
  const { session } = useSession();
  const canManage = canManageResidential(role);
  const [sheetOpen, setSheetOpen] = useState(false);
  useCreateIntent("incident", () => setSheetOpen(true));
  const [selectedIncident, setSelectedIncident] = useState<IncidentWithRelations | null>(null);

  const {
    incidents,
    units,
    incidentTypes,
    assignableUsers,
    isLoading,
    isSubmitting,
    reload,
    createIncident,
    deleteIncident,
    setStatus,
    setPriority,
    assignTo,
  } = useIncidentManagerData(residentialId);

  const buckets = useMemo(() => {
    const grouped: Record<string, IncidentWithRelations[]> = { new: [], in_progress: [], resolved: [], closed: [] };
    for (const incident of incidents) {
      // Cancelled reports (withdrawn by the resident) live with the closed ones.
      grouped[incident.status === "cancelled" ? "closed" : incident.status]?.push(incident);
    }
    return grouped;
  }, [incidents]);

  const handleCreate = async (fields: NewIncidentFields): Promise<boolean> => {
    const payload: IncidentFormPayload = {
      title: fields.title.trim(),
      description: fields.description.trim(),
      incidentTypeId: fields.incidentTypeId,
      location: fields.location.trim(),
      unitId: fields.unitId,
      reportedBy: session?.user?.id ?? null,
    };
    return createIncident(payload);
  };

  // Keep the open detail sheet in sync with the underlying list after a
  // mutation (setStatus/assignTo update `incidents`, not `selectedIncident`).
  const openIncident = incidents.find((i) => i.id === selectedIncident?.id) ?? null;

  const canOperate = canManage || role === "security";

  const takeIncident = async (id: string) => {
    const result = await incidentService.update(id, { status: "in_progress", assigned_to: session?.user?.id ?? null });
    if (!result.success) {
      toast.error(result.error.message);
      return;
    }
    toast.success(t("inbox.incident.taken"));
    await reload();
  };

  const resolveIncidents = async (ids: string[]) => {
    const resolvedAt = new Date().toISOString();
    const results = await Promise.all(
      ids.map((id) => incidentService.update(id, { status: "resolved", resolved_at: resolvedAt })),
    );
    const failures = results.filter((result) => !result.success).length;
    if (failures > 0) toast.error(t("incidents.bulk.failed", { count: failures }));
    else toast.success(t("incidents.bulk.resolved", { count: ids.length }));
    await reload();
  };

  const tableProps = {
    isLoading,
    isSubmitting,
    canManage,
    canOperate,
    onTake: takeIncident,
    onResolve: resolveIncidents,
    onOpen: setSelectedIncident,
    onDelete: deleteIncident,
  };

  return (
    <div className="min-h-screen">
      <AppSidebar userEmail={session?.user?.email} residentialId={residentialId} role={role} onSignOut={() => authService.signOut()} showUserMenu />

      <div className="lg:pl-64">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
          <SectionTabs section="operations" role={role} />
          <Card>
            <CardHeader className="flex flex-col gap-3 space-y-0 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle>{t("incidents.page.title")}</CardTitle>
                <CardDescription>{t("incidents.page.description")}</CardDescription>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="icon" aria-label={t("common.refresh")} onClick={reload} disabled={isLoading}>
                  <IconRefresh className="h-4 w-4" />
                </Button>
                <Button onClick={() => setSheetOpen(true)}>{t("incidents.page.reportIncident")}</Button>
              </div>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="new">
                <TabsList>
                  <TabsTrigger value="new">{t("incidents.tabs.new", { count: buckets.new.length })}</TabsTrigger>
                  <TabsTrigger value="in_progress">
                    {t("incidents.tabs.inProgress", { count: buckets.in_progress.length })}
                  </TabsTrigger>
                  <TabsTrigger value="resolved">
                    {t("incidents.tabs.resolved", { count: buckets.resolved.length })}
                  </TabsTrigger>
                  <TabsTrigger value="closed">{t("incidents.tabs.closed", { count: buckets.closed.length })}</TabsTrigger>
                </TabsList>

                <TabsContent value="new" className="pt-4">
                  <IncidentTable incidents={buckets.new} emptyMessage={t("incidents.empty.new")} {...tableProps} />
                </TabsContent>
                <TabsContent value="in_progress" className="pt-4">
                  <IncidentTable
                    incidents={buckets.in_progress}
                    emptyMessage={t("incidents.empty.inProgress")}
                    {...tableProps}
                  />
                </TabsContent>
                <TabsContent value="resolved" className="pt-4">
                  <IncidentTable
                    incidents={buckets.resolved}
                    emptyMessage={t("incidents.empty.resolved")}
                    {...tableProps}
                  />
                </TabsContent>
                <TabsContent value="closed" className="pt-4">
                  <IncidentTable incidents={buckets.closed} emptyMessage={t("incidents.empty.closed")} {...tableProps} />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>

      <AddIncidentSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        units={units}
        incidentTypes={incidentTypes}
        isSubmitting={isSubmitting}
        onCreate={handleCreate}
      />

      <IncidentDetailSheet
        incident={openIncident}
        residentialId={residentialId}
        canManage={canManage}
        assignableUsers={assignableUsers}
        isSubmitting={isSubmitting}
        onOpenChange={(open) => !open && setSelectedIncident(null)}
        onSetPriority={setPriority}
        onSetStatus={setStatus}
        onAssign={assignTo}
      />
    </div>
  );
}
