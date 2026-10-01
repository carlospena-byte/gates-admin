/**
 * Visitors page — Today / Upcoming / Currently Inside / History, backed by
 * one residential-wide fetch (useVisitorManagerData) split into buckets
 * client-side, same convention as every other list page in the app.
 */

import { useMemo, useState } from "react";
import { IconChevronDown, IconDownload, IconRefresh } from "@tabler/icons-react";
import { AppSidebar } from "@/components/AppSidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DateRangePicker, type DateRange } from "@/components/ui/date-range-picker";
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
import { STATUS_LABEL_KEYS, VISIT_TYPE_LABEL_KEYS } from "@/components/visitors/visitorLabels";
import { useI18n } from "@/i18n/useI18n";
import { authService } from "@/services";
import { useSession } from "@/state/useSession";
import { canManageResidential } from "@/state/useAccess";
import { useVisitorManagerData } from "@/hooks/useVisitorManagerData";
import type { ResidentialRole } from "@/types/database.types";
import type { VisitorWithInviter, VisitType } from "@/types/visitor.types";

type ActiveSheet = "frequent" | "delivery" | "fastlane" | null;
type VisitTypeFilter = VisitType | "all";
type VisitorsTab = "today" | "upcoming" | "inside" | "history";

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function endOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
}

function defaultHistoryRange(): DateRange {
  const to = startOfDay(new Date());
  const from = new Date(to);
  from.setDate(from.getDate() - 7);
  return { from, to };
}

function csvCell(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

export function VisitorsPage({ residentialId, role }: { residentialId: string; role: ResidentialRole }) {
  const { t, locale } = useI18n();
  const { session } = useSession();
  const canManage = canManageResidential(role);
  const canCheckInOut = canManage || role === "security";
  const [activeSheet, setActiveSheet] = useState<ActiveSheet>(null);
  const [activeTab, setActiveTab] = useState<VisitorsTab>("today");
  const [visitTypeFilter, setVisitTypeFilter] = useState<VisitTypeFilter>("all");
  const [visitorQuery, setVisitorQuery] = useState("");
  const [invitedByQuery, setInvitedByQuery] = useState("");
  const [plateQuery, setPlateQuery] = useState("");
  const [historyRange, setHistoryRange] = useState<DateRange>(defaultHistoryRange);

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

  const filteredVisitors = useMemo(() => {
    const visitorQueryLower = visitorQuery.trim().toLowerCase();
    const invitedByQueryLower = invitedByQuery.trim().toLowerCase();
    const plateQueryLower = plateQuery.trim().toLowerCase();

    return visitors.filter((visitor) => {
      if (visitTypeFilter !== "all" && visitor.visit_type !== visitTypeFilter) return false;
      if (visitorQueryLower && !(visitor.name ?? "").toLowerCase().includes(visitorQueryLower)) return false;
      if (invitedByQueryLower && !(visitor.profiles?.email ?? "").toLowerCase().includes(invitedByQueryLower))
        return false;
      if (plateQueryLower && !(visitor.plate ?? "").toLowerCase().includes(plateQueryLower)) return false;
      return true;
    });
  }, [visitors, visitTypeFilter, visitorQuery, invitedByQuery, plateQuery]);

  const buckets = useMemo(() => {
    const today: VisitorWithInviter[] = [];
    const upcoming: VisitorWithInviter[] = [];
    const inside: VisitorWithInviter[] = [];
    const history: VisitorWithInviter[] = [];
    const todayStr = new Date().toDateString();
    const rangeStart = startOfDay(historyRange.from);
    const rangeEnd = endOfDay(historyRange.to);

    for (const visitor of filteredVisitors) {
      if (visitor.status === "inside") {
        inside.push(visitor);
      } else if (
        visitor.status === "completed" ||
        visitor.status === "cancelled" ||
        visitor.status === "rejected" ||
        visitor.status === "expired"
      ) {
        const validUntil = new Date(visitor.valid_until);
        if (validUntil >= rangeStart && validUntil <= rangeEnd) {
          history.push(visitor);
        }
      } else if (new Date(visitor.valid_from).toDateString() === todayStr) {
        today.push(visitor);
      } else {
        upcoming.push(visitor);
      }
    }

    return { today, upcoming, inside, history };
  }, [filteredVisitors, historyRange]);

  const unitNameById = useMemo(() => new Map(units.map((unit) => [unit.id, unit.name])), [units]);

  const handleExportHistory = () => {
    const header = [
      t("visitors.table.visitor"),
      t("visitors.table.type"),
      t("common.unit"),
      t("visitors.table.invitedBy"),
      t("visitors.table.plate"),
      t("visitors.table.validUntil"),
      t("common.status"),
    ];

    const rows = buckets.history.map((visitor) => [
      visitor.name ?? t("visitors.table.pendingRegistration"),
      t(VISIT_TYPE_LABEL_KEYS[visitor.visit_type]),
      (visitor.unit_id ? unitNameById.get(visitor.unit_id) : null) ?? "",
      visitor.profiles?.email ?? "",
      visitor.plate ?? "",
      new Date(visitor.valid_until).toLocaleString(),
      t(STATUS_LABEL_KEYS[visitor.status]),
    ]);

    const csv = [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `visitors-history-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

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
              <div className="mb-4 flex flex-wrap items-end gap-2">
                <Select value={visitTypeFilter} onValueChange={(value) => setVisitTypeFilter(value as VisitTypeFilter)}>
                  <SelectTrigger label={t("visitors.filters.typeLabel")} className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("visitors.filters.typeAll")}</SelectItem>
                    <SelectItem value="frequent">{t("visitors.type.frequent")}</SelectItem>
                    <SelectItem value="delivery">{t("visitors.type.delivery")}</SelectItem>
                    <SelectItem value="fastlane">{t("visitors.type.fastlane")}</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  label={t("visitors.filters.visitorLabel")}
                  placeholder={t("visitors.filters.visitorPlaceholder")}
                  value={visitorQuery}
                  onChange={(e) => setVisitorQuery(e.target.value)}
                  className="flex-1 min-w-[160px]"
                />
                <Input
                  label={t("visitors.filters.invitedByLabel")}
                  placeholder={t("visitors.filters.invitedByPlaceholder")}
                  value={invitedByQuery}
                  onChange={(e) => setInvitedByQuery(e.target.value)}
                  className="flex-1 min-w-[160px]"
                />
                <Input
                  label={t("visitors.filters.plateLabel")}
                  placeholder={t("visitors.filters.platePlaceholder")}
                  value={plateQuery}
                  onChange={(e) => setPlateQuery(e.target.value)}
                  className="flex-1 min-w-[140px]"
                />
              </div>

              <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as VisitorsTab)}>
                <TabsList>
                  <TabsTrigger value="today">{t("visitors.tabs.today", { count: buckets.today.length })}</TabsTrigger>
                  <TabsTrigger value="upcoming">
                    {t("visitors.tabs.upcoming", { count: buckets.upcoming.length })}
                  </TabsTrigger>
                  <TabsTrigger value="inside">{t("visitors.tabs.inside", { count: buckets.inside.length })}</TabsTrigger>
                  <TabsTrigger value="history">{t("visitors.tabs.historyPlain")}</TabsTrigger>
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
                  <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
                    <DateRangePicker
                      label={t("visitors.history.dateRangeLabel")}
                      value={historyRange}
                      onChange={setHistoryRange}
                      applyLabel={t("visitors.history.applyRange")}
                      locale={locale}
                      className="max-w-xs"
                    />
                    <Button variant="outline" size="sm" onClick={handleExportHistory} disabled={buckets.history.length === 0}>
                      <IconDownload className="mr-1 h-4 w-4" />
                      {t("visitors.history.export")}
                    </Button>
                  </div>
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
