/**
 * Reservations page — pick an amenity, see its upcoming/past bookings,
 * book a new slot for yourself. List view only (no calendar widget).
 */

import { IconRefresh } from "@tabler/icons-react";
import { useState } from "react";
import { AppSidebar } from "@/components/AppSidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AddReservationSheet, type NewReservationFields } from "@/components/reservations/AddReservationSheet";
import { ReservationTable } from "@/components/reservations/ReservationTable";
import { authService } from "@/services";
import { useSession } from "@/state/useSession";
import { canManageResidential } from "@/state/useAccess";
import { useReservationsManagerData, type ReservationFormPayload } from "@/hooks/useReservationsManagerData";
import type { ResidentialRole } from "@/types/database.types";

export function ReservationsPage({ residentialId, role }: { residentialId: string; role: ResidentialRole }) {
  const { session } = useSession();
  const canManage = canManageResidential(role);
  const [sheetOpen, setSheetOpen] = useState(false);

  const {
    amenities,
    selectedAmenityId,
    setSelectedAmenityId,
    bookings,
    isLoading,
    isSubmitting,
    reload,
    createBooking,
    cancelBooking,
  } = useReservationsManagerData(residentialId);

  const selectedAmenity = amenities.find((a) => a.id === selectedAmenityId);

  const handleCreate = async (fields: NewReservationFields): Promise<boolean> => {
    if (!selectedAmenityId || !session?.user?.id) return false;
    const payload: ReservationFormPayload = {
      amenityId: selectedAmenityId,
      userId: session.user.id,
      startTime: new Date(fields.startTime).toISOString(),
      endTime: new Date(fields.endTime).toISOString(),
      notes: fields.notes.trim(),
    };
    return createBooking(payload);
  };

  return (
    <div className="min-h-screen">
      <AppSidebar userEmail={session?.user?.email} onSignOut={() => authService.signOut()} showUserMenu />

      <div className="lg:pl-64">
        <div className="mx-auto max-w-7xl px-6 py-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Reservations</CardTitle>
                <CardDescription>Book and manage amenity time slots</CardDescription>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={reload} disabled={isLoading}>
                  <IconRefresh className="h-4 w-4" />
                </Button>
                <Button onClick={() => setSheetOpen(true)} disabled={!selectedAmenityId}>
                  Add Reservation
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {amenities.length === 0 ? (
                <p className="text-sm text-muted-foreground">No amenities configured yet.</p>
              ) : (
                <>
                  <Select value={selectedAmenityId} onValueChange={setSelectedAmenityId}>
                    <SelectTrigger label="Amenity" className="max-w-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {amenities.map((amenity) => (
                        <SelectItem key={amenity.id} value={amenity.id}>
                          {amenity.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <ReservationTable
                    bookings={bookings}
                    isLoading={isLoading}
                    isSubmitting={isSubmitting}
                    currentUserId={session?.user?.id}
                    canManage={canManage}
                    onCancel={cancelBooking}
                  />
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <AddReservationSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        amenityName={selectedAmenity?.name ?? ""}
        isSubmitting={isSubmitting}
        onCreate={handleCreate}
      />
    </div>
  );
}
