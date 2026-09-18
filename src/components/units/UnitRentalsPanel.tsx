/**
 * Rental periods for a unit — the ongoing 'monthly' tenancy (the person
 * responsible for the unit) and/or any number of 'short_term' Airbnb-style
 * stays. New rentals are added via a side sheet (AddRentalSheet); clicking
 * a rental opens its detail (status, payments, delete) in RentalDetailSheet.
 * Completed/cancelled rentals move out of the main list into
 * RentalHistorySheet, reached via "View rental history".
 */

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { IconCalendarEvent, IconChevronRight, IconHistory } from "@tabler/icons-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Spinner } from "@/components/LoadingStates";
import { PlusIcon } from "@/components/icons";
import { AddRentalSheet, type NewRentalFields } from "@/components/units/AddRentalSheet";
import { RentalDetailSheet } from "@/components/units/RentalDetailSheet";
import { RentalHistorySheet } from "@/components/units/RentalHistorySheet";
import { SectionEmptyState } from "@/components/units/SectionEmptyState";
import { confirmDeleteToast } from "@/lib/confirmDeleteToast";
import { ACTIVE_RENTAL_STATUSES, RENTAL_STATUS_VARIANT, RENTAL_TYPE_LABEL, getInitials } from "@/lib/rentalDisplay";
import { formatCurrency } from "@/lib/utils";
import { unitRentalService } from "@/services";
import type { RentalStatus, UnitRental } from "@/types/unit-wizard.types";

export function UnitRentalsPanel({
  unitId,
  residentialId,
  canManage,
}: {
  unitId: string;
  residentialId: string;
  canManage: boolean;
}) {
  const [rentals, setRentals] = useState<UnitRental[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [selectedRental, setSelectedRental] = useState<UnitRental | null>(null);

  const load = async () => {
    setIsLoading(true);
    const result = await unitRentalService.list(unitId);
    if (result.success) {
      setRentals(result.data);
    } else {
      toast.error(result.error.message);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unitId]);

  const handleAdd = async (fields: NewRentalFields): Promise<boolean> => {
    setIsSubmitting(true);
    const result = await unitRentalService.create({
      residential_id: residentialId,
      unit_id: unitId,
      rental_type: fields.rentalType,
      tenant_name: fields.tenantName.trim(),
      tenant_email: fields.tenantEmail.trim() || null,
      tenant_phone: fields.tenantPhone.trim() || null,
      start_date: fields.startDate,
      end_date: fields.endDate || null,
      price: fields.price.trim() ? Number(fields.price) : null,
      status: "active",
    });
    setIsSubmitting(false);

    if (!result.success) {
      toast.error(result.error.message);
      return false;
    }

    toast.success("Rental added");
    await load();
    return true;
  };

  const handleStatusChange = async (id: string, status: RentalStatus) => {
    const result = await unitRentalService.update(id, { status });
    if (!result.success) {
      toast.error(result.error.message);
      return;
    }
    await load();
    setSelectedRental((prev) => (prev && prev.id === id ? { ...prev, status } : prev));
  };

  const handleDelete = (id: string, tenantName: string) => {
    confirmDeleteToast(tenantName, async () => {
      const result = await unitRentalService.delete(id);
      if (!result.success) {
        toast.error(result.error.message);
        return;
      }
      await load();
    });
  };

  const currentRentals = rentals.filter((r) => ACTIVE_RENTAL_STATUSES.includes(r.status));
  const historyRentals = rentals.filter((r) => !ACTIVE_RENTAL_STATUSES.includes(r.status));

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0">
        <div>
          <p className="text-sm font-medium">Rentals</p>
          <p className="text-xs text-muted-foreground">Manage current and upcoming rentals.</p>
        </div>
        {canManage && (
          <Button variant="outline" size="sm" onClick={() => setAddOpen(true)}>
            <PlusIcon /> <span className="ml-2">Add rental</span>
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="flex justify-center py-4">
            <Spinner />
          </div>
        ) : currentRentals.length === 0 ? (
          <SectionEmptyState
            icon={IconCalendarEvent}
            title="No active rentals."
            description="Add a rental to get started."
          />
        ) : (
          <div className="space-y-2">
            {currentRentals.map((rental) => (
              <button
                key={rental.id}
                type="button"
                onClick={() => setSelectedRental(rental)}
                className="flex w-full items-center gap-3 rounded-md border p-3 text-left hover:bg-accent"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold">
                  {getInitials(rental.tenant_name)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="truncate text-sm font-medium">{rental.tenant_name}</span>
                    <Badge variant={RENTAL_STATUS_VARIANT[rental.status]}>{rental.status}</Badge>
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {RENTAL_TYPE_LABEL[rental.rental_type]}
                  </span>
                </span>
                <span className="shrink-0 text-right text-xs text-muted-foreground">
                  <span className="block">
                    {rental.start_date} → {rental.end_date || "ongoing"}
                  </span>
                  {rental.price !== null && (
                    <span className="block font-medium text-foreground">{formatCurrency(rental.price)} / month</span>
                  )}
                </span>
                <IconChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              </button>
            ))}
          </div>
        )}

        <button
          type="button"
          onClick={() => setHistoryOpen(true)}
          className="flex w-full items-center justify-between gap-2 rounded-md border border-dashed p-3 text-sm text-muted-foreground hover:bg-accent"
        >
          <span className="flex items-center gap-2">
            <IconHistory className="h-4 w-4" /> View rental history
          </span>
          <IconChevronRight className="h-4 w-4" />
        </button>
      </CardContent>

      <AddRentalSheet open={addOpen} onOpenChange={setAddOpen} isSubmitting={isSubmitting} onCreate={handleAdd} />

      <RentalHistorySheet
        open={historyOpen}
        onOpenChange={setHistoryOpen}
        rentals={historyRentals}
        onSelect={(rental) => {
          setHistoryOpen(false);
          setSelectedRental(rental);
        }}
      />

      <RentalDetailSheet
        rental={selectedRental}
        residentialId={residentialId}
        canManage={canManage}
        onOpenChange={(open) => !open && setSelectedRental(null)}
        onStatusChange={handleStatusChange}
        onDelete={handleDelete}
      />
    </Card>
  );
}
