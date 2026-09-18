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
import { authService } from "@/services";
import { useSession } from "@/state/useSession";
import { canManageResidential } from "@/state/useAccess";
import { useIncidentManagerData, type IncidentFormPayload } from "@/hooks/useIncidentManagerData";
import type { ResidentialRole } from "@/types/database.types";
import type { IncidentWithRelations } from "@/types/incident.types";

export function IncidentsPage({ residentialId, role }: { residentialId: string; role: ResidentialRole }) {
  const { session } = useSession();
  const canManage = canManageResidential(role);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState<IncidentWithRelations | null>(null);

  const {
    incidents,
    units,
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
      grouped[incident.status]?.push(incident);
    }
    return grouped;
  }, [incidents]);

  const handleCreate = async (fields: NewIncidentFields): Promise<boolean> => {
    const payload: IncidentFormPayload = {
      title: fields.title.trim(),
      description: fields.description.trim(),
      category: fields.category,
      location: fields.location.trim(),
      unitId: fields.unitId,
      reportedBy: session?.user?.id ?? null,
    };
    return createIncident(payload);
  };

  // Keep the open detail sheet in sync with the underlying list after a
  // mutation (setStatus/assignTo update `incidents`, not `selectedIncident`).
  const openIncident = incidents.find((i) => i.id === selectedIncident?.id) ?? null;

  const tableProps = {
    isLoading,
    isSubmitting,
    canManage,
    onOpen: setSelectedIncident,
    onDelete: deleteIncident,
  };

  return (
    <div className="min-h-screen">
      <AppSidebar userEmail={session?.user?.email} onSignOut={() => authService.signOut()} showUserMenu />

      <div className="lg:pl-64">
        <div className="mx-auto max-w-7xl px-6 py-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Incidents</CardTitle>
                <CardDescription>Report and triage issues</CardDescription>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={reload} disabled={isLoading}>
                  <IconRefresh className="h-4 w-4" />
                </Button>
                <Button onClick={() => setSheetOpen(true)}>Report Incident</Button>
              </div>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="new">
                <TabsList>
                  <TabsTrigger value="new">New ({buckets.new.length})</TabsTrigger>
                  <TabsTrigger value="in_progress">In Progress ({buckets.in_progress.length})</TabsTrigger>
                  <TabsTrigger value="resolved">Resolved ({buckets.resolved.length})</TabsTrigger>
                  <TabsTrigger value="closed">Closed ({buckets.closed.length})</TabsTrigger>
                </TabsList>

                <TabsContent value="new" className="pt-4">
                  <IncidentTable incidents={buckets.new} emptyMessage="No new incidents." {...tableProps} />
                </TabsContent>
                <TabsContent value="in_progress" className="pt-4">
                  <IncidentTable incidents={buckets.in_progress} emptyMessage="Nothing in progress." {...tableProps} />
                </TabsContent>
                <TabsContent value="resolved" className="pt-4">
                  <IncidentTable incidents={buckets.resolved} emptyMessage="No resolved incidents yet." {...tableProps} />
                </TabsContent>
                <TabsContent value="closed" className="pt-4">
                  <IncidentTable incidents={buckets.closed} emptyMessage="No closed incidents." {...tableProps} />
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
