/**
 * Visitors page — Today / Upcoming / Currently Inside / History, backed by
 * one residential-wide fetch (useVisitorManagerData) split into buckets
 * client-side, same convention as every other list page in the app.
 */

import { useMemo, useState } from "react";
import { IconRefresh } from "@tabler/icons-react";
import { AppSidebar } from "@/components/AppSidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AddVisitorSheet, type NewVisitorFields } from "@/components/visitors/AddVisitorSheet";
import { VisitorTable } from "@/components/visitors/VisitorTable";
import { authService } from "@/services";
import { useSession } from "@/state/useSession";
import { canManageResidential } from "@/state/useAccess";
import { useVisitorManagerData, type VisitorFormPayload } from "@/hooks/useVisitorManagerData";
import type { ResidentialRole } from "@/types/database.types";
import type { VisitorWithInviter } from "@/types/visitor.types";

export function VisitorsPage({ residentialId, role }: { residentialId: string; role: ResidentialRole }) {
  const { session } = useSession();
  const canManage = canManageResidential(role);
  const canCheckInOut = canManage || role === "security";
  const [sheetOpen, setSheetOpen] = useState(false);

  const { visitors, units, isLoading, isSubmitting, reload, createVisitor, deleteVisitor, checkIn, checkOut } =
    useVisitorManagerData(residentialId);

  const buckets = useMemo(() => {
    const today: VisitorWithInviter[] = [];
    const upcoming: VisitorWithInviter[] = [];
    const inside: VisitorWithInviter[] = [];
    const history: VisitorWithInviter[] = [];
    const todayStr = new Date().toDateString();

    for (const visitor of visitors) {
      if (visitor.status === "inside") {
        inside.push(visitor);
      } else if (visitor.status === "completed" || visitor.status === "cancelled" || visitor.status === "rejected") {
        history.push(visitor);
      } else if (new Date(visitor.valid_from).toDateString() === todayStr) {
        today.push(visitor);
      } else {
        upcoming.push(visitor);
      }
    }

    return { today, upcoming, inside, history };
  }, [visitors]);

  const handleCreate = async (fields: NewVisitorFields): Promise<boolean> => {
    const payload: VisitorFormPayload = {
      name: fields.name.trim(),
      phone: fields.phone.trim(),
      plate: fields.plate.trim(),
      unitId: fields.unitId,
      validFrom: new Date(fields.validFrom).toISOString(),
      validUntil: new Date(fields.validUntil).toISOString(),
      invitedBy: session?.user?.id ?? null,
    };
    return createVisitor(payload);
  };

  const tableProps = {
    units,
    isLoading,
    isSubmitting,
    canManage,
    canCheckInOut,
    onCheckIn: checkIn,
    onCheckOut: checkOut,
    onDelete: deleteVisitor,
  };

  return (
    <div className="min-h-screen">
      <AppSidebar userEmail={session?.user?.email} onSignOut={() => authService.signOut()} showUserMenu />

      <div className="lg:pl-64">
        <div className="mx-auto max-w-7xl px-6 py-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Visitors</CardTitle>
                <CardDescription>Schedule visits and manage gate check-in/check-out</CardDescription>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={reload} disabled={isLoading}>
                  <IconRefresh className="h-4 w-4" />
                </Button>
                {canManage && <Button onClick={() => setSheetOpen(true)}>Add Visitor</Button>}
              </div>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="today">
                <TabsList>
                  <TabsTrigger value="today">Today ({buckets.today.length})</TabsTrigger>
                  <TabsTrigger value="upcoming">Upcoming ({buckets.upcoming.length})</TabsTrigger>
                  <TabsTrigger value="inside">Currently Inside ({buckets.inside.length})</TabsTrigger>
                  <TabsTrigger value="history">History ({buckets.history.length})</TabsTrigger>
                </TabsList>

                <TabsContent value="today" className="pt-4">
                  <VisitorTable visitors={buckets.today} emptyMessage="No visitors scheduled for today." {...tableProps} />
                </TabsContent>
                <TabsContent value="upcoming" className="pt-4">
                  <VisitorTable visitors={buckets.upcoming} emptyMessage="No upcoming visitors." {...tableProps} />
                </TabsContent>
                <TabsContent value="inside" className="pt-4">
                  <VisitorTable visitors={buckets.inside} emptyMessage="No one is currently inside." {...tableProps} />
                </TabsContent>
                <TabsContent value="history" className="pt-4">
                  <VisitorTable visitors={buckets.history} emptyMessage="No visit history yet." {...tableProps} />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>

      <AddVisitorSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        units={units}
        isSubmitting={isSubmitting}
        onCreate={handleCreate}
      />
    </div>
  );
}
