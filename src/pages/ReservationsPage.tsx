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

const ALL_AMENITIES = "all";
const ALL_STATUSES = "all";

export function ReservationsPage({ residentialId, role }: { residentialId: string; role: ResidentialRole }) {
  const { t } = useI18n();
  const { session } = useSession();
  const canManage = canManageResidential(role);
  const canCreate = canCreateReservation(role);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [amenityFilter, setAmenityFilter] = useState(ALL_AMENITIES);
  const [statusFilter, setStatusFilter] = useState<typeof ALL_STATUSES | AmenityBookingStatus>(ALL_STATUSES);
  const [dateFilter, setDateFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
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
    amenityFilter !== ALL_AMENITIES || statusFilter !== ALL_STATUSES || dateFilter !== "" || searchQuery.trim() !== "";

  const clearFilters = () => {
    setAmenityFilter(ALL_AMENITIES);
    setStatusFilter(ALL_STATUSES);
    setDateFilter("");
    setSearchQuery("");
  };

  const filteredBookings = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return bookings.filter((booking) => {
      if (amenityFilter !== ALL_AMENITIES && booking.amenity_id !== amenityFilter) return false;
      if (statusFilter !== ALL_STATUSES && booking.status !== statusFilter) return false;
      if (dateFilter && new Date(booking.start_time).toISOString().slice(0, 10) !== dateFilter) return false;
      if (query) {
        const bookerName = (bookerNameById.get(booking.id) ?? "").toLowerCase();
        const unitName = (booking.unit_id && unitInfoById.get(booking.unit_id)?.name) || "";
        if (!bookerName.includes(query) && !unitName.toLowerCase().includes(query)) return false;
      }
      return true;
    });
  }, [bookings, amenityFilter, statusFilter, dateFilter, searchQuery, bookerNameById, unitInfoById]);

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

  const handleApprove = async (id: string) => {
    await approveBooking(id);
    setViewedBooking((prev) => (prev && prev.id === id ? { ...prev, status: "confirmed" } : prev));
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
        <div className="mx-auto max-w-7xl px-6 py-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>{t("reservations.page.title")}</CardTitle>
                <CardDescription>{t("reservations.page.description")}</CardDescription>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={reload} disabled={isLoading}>
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
                    <div className="relative min-w-[220px] flex-1">
                      <IconSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder={t("reservations.filter.searchPlaceholder")}
                        className="pl-9"
                      />
                    </div>

                    <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
                      <SelectTrigger className="w-44">
                        <SelectValue placeholder={t("reservations.filter.statusPlaceholder")} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={ALL_STATUSES}>{t("reservations.filter.allStatuses")}</SelectItem>
                        <SelectItem value="pending">{t("reservations.status.pending")}</SelectItem>
                        <SelectItem value="confirmed">{t("reservations.status.confirmed")}</SelectItem>
                        <SelectItem value="cancelled">{t("reservations.status.cancelled")}</SelectItem>
                        <SelectItem value="expired">{t("reservations.status.expired")}</SelectItem>
                      </SelectContent>
                    </Select>

                    <Select value={amenityFilter} onValueChange={setAmenityFilter}>
                      <SelectTrigger className="w-48">
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

                    <Input
                      type="date"
                      value={dateFilter}
                      onChange={(e) => setDateFilter(e.target.value)}
                      className="w-40"
                    />

                    {hasActiveFilters && (
                      <Button variant="ghost" size="sm" onClick={clearFilters}>
                        {t("reservations.filter.clear")}
                      </Button>
                    )}
                  </div>

                  <p className="text-sm text-muted-foreground">
                    {t("reservations.filter.count", { count: filteredBookings.length })}
                  </p>

                  <ReservationTable
                    bookings={filteredBookings}
                    totalCount={bookings.length}
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
