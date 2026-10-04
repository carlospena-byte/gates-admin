/**
 * Reservations page — a single list of every amenity booking, with search
 * (by requester/unit) plus amenity/status/date filters above the table so
 * an admin reviewing a stack of pending requests can narrow down fast.
 */

import { IconRefresh, IconSearch } from "@tabler/icons-react";
import { useMemo, useState } from "react";
import { AppSidebar } from "@/components/AppSidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AddReservationSheet, type NewReservationFields } from "@/components/reservations/AddReservationSheet";
import { ApproveReservationDialog, type ApprovalPaymentFields } from "@/components/reservations/ApproveReservationDialog";
import { ReservationDetailSheet } from "@/components/reservations/ReservationDetailSheet";
import { ReservationTable, type UnitInfo } from "@/components/reservations/ReservationTable";
import { authService } from "@/services";
import { useSession } from "@/state/useSession";
import { canManageResidential, canCreateReservation } from "@/state/useAccess";
import { useReservationsManagerData, type ReservationFormPayload } from "@/hooks/useReservationsManagerData";
import { getLocationFullPath, getUnitFullLabel } from "@/lib/locationHierarchy";
import { formatProfileName } from "@/lib/utils";
import type { AmenityBookingStatus, AmenityBookingWithUser } from "@/types/amenities.types";
import type { ResidentialRole } from "@/types/database.types";
import { useI18n } from "@/i18n/useI18n";
import { useCreateIntent } from "@/lib/createIntent";
import { SectionTabs } from "@/components/SectionTabs";
import { DatePicker } from "@/components/ui/date-picker";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

const ALL_AMENITIES = "all";

type ReservationsTab = "pending" | "approved" | "history";

const TAB_STATUSES: Record<ReservationsTab, AmenityBookingStatus[]> = {
  pending: ["pending"],
  approved: ["confirmed"],
  history: ["cancelled", "expired"],
};

export function ReservationsPage({ residentialId, role }: { residentialId: string; role: ResidentialRole }) {
  const { t } = useI18n();
  const { session } = useSession();
  const canManage = canManageResidential(role);
  const canCreate = canCreateReservation(role);
  const [sheetOpen, setSheetOpen] = useState(false);
  useCreateIntent("reservation", () => {
    if (canCreate) setSheetOpen(true);
  });
  const [amenityFilter, setAmenityFilter] = useState(ALL_AMENITIES);
  const [activeTab, setActiveTab] = useState<ReservationsTab>("pending");
  const [dateFilter, setDateFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [viewedBooking, setViewedBooking] = useState<AmenityBookingWithUser | null>(null);

  const {
    amenities,
    units,
    locations,
    residents,
    bookings,
    isLoading,
    isSubmitting,
    reload,
    createBooking,
    cancelBooking,
    approveBooking,
    updateBookingsStatus,
  } = useReservationsManagerData(residentialId);

  const unitLabelById = useMemo(() => {
    const map = new Map<string, string>();
    for (const unit of units) {
      const fullLocation = unit.location ? locations.find((l) => l.id === unit.location!.id) ?? null : null;
      map.set(unit.id, getUnitFullLabel(unit.name, fullLocation, locations));
    }
    return map;
  }, [units, locations]);

  // Separate from unitLabelById (which flattens into one "Torre A → 101"
  // string for the amenity-picker sheet) — the table shows the unit number
  // and its tower/floor path as two visually distinct lines.
  const unitInfoById = useMemo(() => {
    const map = new Map<string, UnitInfo>();
    for (const unit of units) {
      const fullLocation = unit.location ? locations.find((l) => l.id === unit.location!.id) ?? null : null;
      map.set(unit.id, { name: unit.name, path: getLocationFullPath(fullLocation, locations, " · ") });
    }
    return map;
  }, [units, locations]);

  // `profiles.first_name`/`last_name` isn't reliably filled in — the name a
  // resident actually gave when they were invited lives on `unit_residents`
  // instead (see validate_unit_invitation), so prefer that match (by unit +
  // email) over the profile fields, falling back to the profile/email.
  const bookerNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const booking of bookings) {
      const email = booking.profiles?.email;
      const resident = email
        ? residents.find((r) => r.unit_id === booking.unit_id && r.email === email)
        : undefined;
      map.set(booking.id, resident?.full_name || formatProfileName(booking.profiles));
    }
    return map;
  }, [bookings, residents]);

  const hasActiveFilters =
    amenityFilter !== ALL_AMENITIES || dateFilter !== "" || searchQuery.trim() !== "";

  const clearFilters = () => {
    setAmenityFilter(ALL_AMENITIES);
    setDateFilter("");
    setSearchQuery("");
  };

  // Search/amenity/date filters apply across tabs; the tab then picks the
  // status bucket, so the tab counts reflect the other active filters.
  const matchingBookings = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return bookings.filter((booking) => {
      if (amenityFilter !== ALL_AMENITIES && booking.amenity_id !== amenityFilter) return false;
      if (dateFilter && new Date(booking.start_time).toISOString().slice(0, 10) !== dateFilter) return false;
      if (query) {
        const bookerName = (bookerNameById.get(booking.id) ?? "").toLowerCase();
        const unitName = (booking.unit_id && unitInfoById.get(booking.unit_id)?.name) || "";
        if (!bookerName.includes(query) && !unitName.toLowerCase().includes(query)) return false;
      }
      return true;
    });
  }, [bookings, amenityFilter, dateFilter, searchQuery, bookerNameById, unitInfoById]);

  const bucketCounts = useMemo(() => {
    const countFor = (tab: ReservationsTab) =>
      matchingBookings.filter((b) => TAB_STATUSES[tab].includes(b.status)).length;
    return { pending: countFor("pending"), approved: countFor("approved"), history: countFor("history") };
  }, [matchingBookings]);

  const filteredBookings = useMemo(
    () => matchingBookings.filter((b) => TAB_STATUSES[activeTab].includes(b.status)),
    [matchingBookings, activeTab],
  );

  const handleTabChange = (tab: ReservationsTab) => {
    setActiveTab(tab);
    setSelectedIds(new Set());
  };

  const toggleSelect = (id: string) =>
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const toggleSelectAll = (ids: string[]) =>
    setSelectedIds((prev) => {
      const allSelected = ids.length > 0 && ids.every((id) => prev.has(id));
      return allSelected ? new Set() : new Set(ids);
    });

  const handleBulkApprove = async () => {
    await updateBookingsStatus([...selectedIds], "confirmed");
    setSelectedIds(new Set());
  };

  const handleBulkCancel = async (reason?: string) => {
    await updateBookingsStatus([...selectedIds], "cancelled", reason);
    setSelectedIds(new Set());
  };

  const markConfirmed = (id: string) =>
    setViewedBooking((prev) => (prev && prev.id === id ? { ...prev, status: "confirmed" } : prev));

  // A paid amenity gets the approve-and-record-payment dialog; a free one
  // is approved straight away.
  const handleApprove = async (id: string) => {
    const booking = bookings.find((b) => b.id === id);
    const amenity = amenities.find((a) => a.id === booking?.amenity_id);
    if (amenity?.requires_payment && (amenity.price ?? 0) > 0) {
      setApprovingId(id);
      return;
    }
    await approveBooking(id);
    markConfirmed(id);
  };

  const approvingBooking = approvingId ? bookings.find((b) => b.id === approvingId) ?? null : null;
  const approvingAmenity = amenities.find((a) => a.id === approvingBooking?.amenity_id);

  const handleApproveWithPayment = async (payment: ApprovalPaymentFields | null) => {
    if (!approvingBooking) return;
    await approveBooking(
      approvingBooking.id,
      payment ? { ...payment, createdBy: session?.user?.id ?? null } : undefined,
    );
    markConfirmed(approvingBooking.id);
  };

  const handleCancel = async (id: string, reason?: string) => {
    await cancelBooking(id, reason);
    setViewedBooking((prev) =>
      prev && prev.id === id ? { ...prev, status: "cancelled", rejection_reason: reason?.trim() || null } : prev,
    );
  };

  const handleCreate = async (fields: NewReservationFields): Promise<boolean> => {
    if (!session?.user?.id) return false;
    const startTime = new Date(fields.startTime);
    const endTime = new Date(startTime.getTime() + fields.hours * 60 * 60 * 1000);
    const payload: ReservationFormPayload = {
      amenityId: fields.amenityId,
      userId: session.user.id,
      unitId: fields.unitId,
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      notes: fields.notes.trim(),
    };
    return createBooking(payload);
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
                <CardTitle>{t("reservations.page.title")}</CardTitle>
                <CardDescription>{t("reservations.page.description")}</CardDescription>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="icon" aria-label={t("common.refresh")} onClick={reload} disabled={isLoading}>
                  <IconRefresh className="h-4 w-4" />
                </Button>
                {canCreate && (
                  <Button onClick={() => setSheetOpen(true)} disabled={amenities.length === 0}>
                    {t("reservations.page.add")}
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {amenities.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("reservations.page.noAmenities")}</p>
              ) : (
                <>
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="relative w-full min-w-0 flex-1 sm:min-w-[220px] sm:w-auto">
                      <Input
                        label={t("reservations.filter.searchLabel")}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder={t("reservations.filter.searchPlaceholder")}
                      />
                      <IconSearch className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                    </div>

                    <Select value={amenityFilter} onValueChange={setAmenityFilter}>
                      <SelectTrigger label={t("reservations.filter.amenityLabel")} className="w-full sm:w-56">
                        <SelectValue placeholder={t("reservations.filter.placeholder")} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={ALL_AMENITIES}>{t("reservations.filter.all")}</SelectItem>
                        {amenities.map((amenity) => (
                          <SelectItem key={amenity.id} value={amenity.id}>
                            {amenity.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <DatePicker
                      mode="single"
                      clearable
                      label={t("reservations.filter.date")}
                      value={dateFilter}
                      onChange={setDateFilter}
                      className="w-full sm:w-56"
                    />

                    {hasActiveFilters && (
                      <Button variant="ghost" size="sm" onClick={clearFilters}>
                        {t("reservations.filter.clear")}
                      </Button>
                    )}
                  </div>

                  <Tabs value={activeTab} onValueChange={(value) => handleTabChange(value as ReservationsTab)}>
                    <TabsList>
                      <TabsTrigger value="pending">{t("reservations.tabs.pending", { count: bucketCounts.pending })}</TabsTrigger>
                      <TabsTrigger value="approved">{t("reservations.tabs.approved", { count: bucketCounts.approved })}</TabsTrigger>
                      <TabsTrigger value="history">{t("reservations.tabs.history", { count: bucketCounts.history })}</TabsTrigger>
                    </TabsList>
                  </Tabs>

                  <p className="text-sm text-muted-foreground">
                    {t("reservations.filter.count", { count: filteredBookings.length })}
                  </p>

                  <ReservationTable
                    bookings={filteredBookings}
                    totalCount={bookings.length}
                    allowBulk={activeTab === "pending"}
                    emptyMessage={t(`reservations.empty.${activeTab}`)}
                    isLoading={isLoading}
                    isSubmitting={isSubmitting}
                    canManage={canManage}
                    unitInfoById={unitInfoById}
                    bookerNameById={bookerNameById}
                    selectedIds={selectedIds}
                    onToggleSelect={toggleSelect}
                    onToggleSelectAll={toggleSelectAll}
                    onBulkApprove={handleBulkApprove}
                    onBulkCancel={handleBulkCancel}
                    onReview={setViewedBooking}
                    hasActiveFilters={hasActiveFilters}
                    onClearFilters={clearFilters}
                  />
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {canCreate && (
        <AddReservationSheet
          open={sheetOpen}
          onOpenChange={setSheetOpen}
          amenities={amenities.map((a) => ({ id: a.id, name: a.name }))}
          units={units.map((u) => ({ id: u.id, name: unitLabelById.get(u.id) ?? u.name }))}
          isSubmitting={isSubmitting}
          onCreate={handleCreate}
        />
      )}

      {approvingBooking && approvingAmenity && (
        <ApproveReservationDialog
          open
          amenityName={approvingAmenity.name}
          unitLabel={unitLabelById.get(approvingBooking.unit_id ?? "")}
          price={approvingAmenity.price ?? 0}
          isSubmitting={isSubmitting}
          onOpenChange={(open) => {
            if (!open) setApprovingId(null);
          }}
          onConfirm={handleApproveWithPayment}
        />
      )}

      <ReservationDetailSheet
        booking={viewedBooking}
        unitLabel={viewedBooking ? unitLabelById.get(viewedBooking.unit_id ?? "") : undefined}
        bookerName={viewedBooking ? bookerNameById.get(viewedBooking.id) : undefined}
        onOpenChange={(open) => {
          if (!open) setViewedBooking(null);
        }}
        isSubmitting={isSubmitting}
        canManage={canManage}
        currentUserId={session?.user?.id}
        onApprove={handleApprove}
        onCancel={handleCancel}
      />
    </div>
  );
}
