/**
 * Reservations page — a single list of every amenity booking, with the
 * amenity/unit/time picked inside the "Add Reservation" sheet rather than
 * as a page-level filter. List view only (no calendar widget).
 */

import { IconRefresh } from "@tabler/icons-react";
import { useState } from "react";
import { AppSidebar } from "@/components/AppSidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AddReservationSheet, type NewReservationFields } from "@/components/reservations/AddReservationSheet";
import { ReservationTable } from "@/components/reservations/ReservationTable";
import { authService } from "@/services";
import { useSession } from "@/state/useSession";
import { canManageResidential, canCreateReservation } from "@/state/useAccess";
import { useReservationsManagerData, type ReservationFormPayload } from "@/hooks/useReservationsManagerData";
import type { ResidentialRole } from "@/types/database.types";
import { useI18n } from "@/i18n/useI18n";

export function ReservationsPage({ residentialId, role }: { residentialId: string; role: ResidentialRole }) {
  const { t } = useI18n();
  const { session } = useSession();
  const canManage = canManageResidential(role);
  const canCreate = canCreateReservation(role);
  const [sheetOpen, setSheetOpen] = useState(false);

  const {
    amenities,
    units,
    bookings,
    isLoading,
    isSubmitting,
    reload,
    createBooking,
    cancelBooking,
  } = useReservationsManagerData(residentialId);

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
                <ReservationTable
                  bookings={bookings}
                  isLoading={isLoading}
                  isSubmitting={isSubmitting}
                  currentUserId={session?.user?.id}
                  canManage={canManage}
                  onCancel={cancelBooking}
                />
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
          units={units.map((u) => ({ id: u.id, name: u.name }))}
          isSubmitting={isSubmitting}
          onCreate={handleCreate}
        />
      )}
    </div>
  );
}
