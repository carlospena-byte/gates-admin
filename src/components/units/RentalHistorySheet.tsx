/**
 * Right-side sheet listing a unit's completed/cancelled rentals — opened
 * via "View rental history" in UnitRentalsPanel. Selecting one hands it
 * back to the parent, which swaps to RentalDetailSheet (same detail view
 * used by the main list).
 */

import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { RENTAL_STATUS_VARIANT, RENTAL_TYPE_LABEL, getInitials } from "@/lib/rentalDisplay";
import { formatCurrency } from "@/lib/utils";
import type { UnitRental } from "@/types/unit-wizard.types";

interface RentalHistorySheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rentals: UnitRental[];
  onSelect: (rental: UnitRental) => void;
}

export function RentalHistorySheet({ open, onOpenChange, rentals, onSelect }: RentalHistorySheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Rental history</SheetTitle>
          <SheetDescription>Completed and cancelled rentals for this unit.</SheetDescription>
        </SheetHeader>

        <div className="space-y-2 py-6">
          {rentals.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">No past rentals yet.</p>
          ) : (
            rentals.map((rental) => (
              <button
                key={rental.id}
                type="button"
                onClick={() => onSelect(rental)}
                className="flex w-full items-center gap-3 rounded-md border p-3 text-left hover:bg-accent"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold">
                  {getInitials(rental.tenant_name)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="truncate text-sm font-medium">{rental.tenant_name}</span>
                    <Badge variant={RENTAL_STATUS_VARIANT[rental.status]}>{rental.status}</Badge>
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {RENTAL_TYPE_LABEL[rental.rental_type]} · {rental.start_date} → {rental.end_date || "ongoing"}
                  </span>
                </span>
                {rental.price !== null && (
                  <span className="shrink-0 text-sm font-medium">{formatCurrency(rental.price)}</span>
                )}
              </button>
            ))
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
