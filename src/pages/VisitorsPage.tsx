/**
 * Visitors page — Today / Upcoming / Currently Inside / History, backed by
 * one residential-wide fetch (useVisitorManagerData) split into buckets
 * client-side, same convention as every other list page in the app.
 */

import { useMemo, useState } from "react";
import { IconChevronDown, IconRefresh } from "@tabler/icons-react";
import { AppSidebar } from "@/components/AppSidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AddFrequentVisitSheet, type NewFrequentVisitFields } from "@/components/visitors/AddFrequentVisitSheet";
import { AddDeliveryVisitSheet, type NewDeliveryVisitFields } from "@/components/visitors/AddDeliveryVisitSheet";
import { AddFastlaneVisitSheet, type NewFastlaneVisitFields } from "@/components/visitors/AddFastlaneVisitSheet";
import { VisitorTable } from "@/components/visitors/VisitorTable";
import { useI18n } from "@/i18n/useI18n";
import { authService } from "@/services";
import { useSession } from "@/state/useSession";
import { canManageResidential } from "@/state/useAccess";
import { useVisitorManagerData } from "@/hooks/useVisitorManagerData";
import type { ResidentialRole } from "@/types/database.types";
import type { VisitorWithInviter } from "@/types/visitor.types";

type ActiveSheet = "frequent" | "delivery" | "fastlane" | null;

export function VisitorsPage({ residentialId, role }: { residentialId: string; role: ResidentialRole }) {
  const { t } = useI18n();
  const { session } = useSession();
  const canManage = canManageResidential(role);
  const canCheckInOut = canManage || role === "security";
  const [activeSheet, setActiveSheet] = useState<ActiveSheet>(null);

  const {
    visitors,
    units,
    isLoading,
    isSubmitting,
    reload,
    createFrequentVisit,
    createDeliveryVisit,
    createFastlaneVisit,
    sendFastlaneNotification,
    deleteVisitor,
    checkIn,
    checkOut,
  } = useVisitorManagerData(residentialId);

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

  const handleCreateFrequent = async (fields: NewFrequentVisitFields): Promise<boolean> =>
    createFrequentVisit({ ...fields, invitedBy: session?.user?.id ?? null });

  const handleCreateDelivery = async (fields: NewDeliveryVisitFields): Promise<boolean> =>
    createDeliveryVisit({ ...fields, invitedBy: session?.user?.id ?? null });

  const handleCreateFastlane = async (fields: NewFastlaneVisitFields): Promise<VisitorWithInviter | null> =>
    createFastlaneVisit(fields);

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
      <AppSidebar userEmail={session?.user?.email} residentialId={residentialId} role={role} onSignOut={() => authService.signOut()} showUserMenu />

      <div className="lg:pl-64">
        <div className="mx-auto max-w-7xl px-6 py-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>{t("visitors.title")}</CardTitle>
                <CardDescription>{t("visitors.description")}</CardDescription>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={reload} disabled={isLoading}>
                  <IconRefresh className="h-4 w-4" />
                </Button>
                {canManage && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button>
                        {t("visitors.add")}
                        <IconChevronDown className="ml-1 h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setActiveSheet("frequent")}>
                        {t("visitors.frequent.menuLabel")}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setActiveSheet("delivery")}>
                        {t("visitors.delivery.menuLabel")}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setActiveSheet("fastlane")}>
                        {t("visitors.fastlane.menuLabel")}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="today">
                <TabsList>
                  <TabsTrigger value="today">{t("visitors.tabs.today", { count: buckets.today.length })}</TabsTrigger>
                  <TabsTrigger value="upcoming">
                    {t("visitors.tabs.upcoming", { count: buckets.upcoming.length })}
                  </TabsTrigger>
                  <TabsTrigger value="inside">{t("visitors.tabs.inside", { count: buckets.inside.length })}</TabsTrigger>
                  <TabsTrigger value="history">
                    {t("visitors.tabs.history", { count: buckets.history.length })}
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="today" className="pt-4">
                  <VisitorTable visitors={buckets.today} emptyMessage={t("visitors.empty.today")} {...tableProps} />
                </TabsContent>
                <TabsContent value="upcoming" className="pt-4">
                  <VisitorTable visitors={buckets.upcoming} emptyMessage={t("visitors.empty.upcoming")} {...tableProps} />
                </TabsContent>
                <TabsContent value="inside" className="pt-4">
                  <VisitorTable visitors={buckets.inside} emptyMessage={t("visitors.empty.inside")} {...tableProps} />
                </TabsContent>
                <TabsContent value="history" className="pt-4">
                  <VisitorTable visitors={buckets.history} emptyMessage={t("visitors.empty.history")} {...tableProps} />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>

      <AddFrequentVisitSheet
        open={activeSheet === "frequent"}
        onOpenChange={(open) => setActiveSheet(open ? "frequent" : null)}
        units={units}
        isSubmitting={isSubmitting}
        onCreate={handleCreateFrequent}
      />
      <AddDeliveryVisitSheet
        open={activeSheet === "delivery"}
        onOpenChange={(open) => setActiveSheet(open ? "delivery" : null)}
        units={units}
        isSubmitting={isSubmitting}
        onCreate={handleCreateDelivery}
      />
      <AddFastlaneVisitSheet
        open={activeSheet === "fastlane"}
        onOpenChange={(open) => setActiveSheet(open ? "fastlane" : null)}
        units={units}
        isSubmitting={isSubmitting}
        onCreate={handleCreateFastlane}
        onResend={sendFastlaneNotification}
      />
    </div>
  );
}
