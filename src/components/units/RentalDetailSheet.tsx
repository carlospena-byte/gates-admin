/**
 * Right-side sheet showing one rental's full detail — tenant info, status,
 * and its payment installments. Opened by clicking a rental row in
 * UnitRentalsPanel or RentalHistorySheet; replaces the old inline
 * status-select/payments-toggle/delete row actions.
 */

import { useI18n } from "@/i18n/useI18n";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { DeleteIcon } from "@/components/icons";
import { UnitRentalPayments } from "@/components/units/UnitRentalPayments";
import { RENTAL_STATUS_VARIANT, RENTAL_TYPE_LABEL } from "@/lib/rentalDisplay";
import { formatCurrency } from "@/lib/utils";
import type { RentalStatus, UnitRental } from "@/types/unit-wizard.types";

interface RentalDetailSheetProps {
  rental: UnitRental | null;
  residentialId: string;
  canManage: boolean;
  onOpenChange: (open: boolean) => void;
  onStatusChange: (id: string, status: RentalStatus) => void;
  onDelete: (id: string, tenantName: string) => void;
}

export function RentalDetailSheet({
  rental,
  residentialId,
  canManage,
  onOpenChange,
  onStatusChange,
  onDelete,
}: RentalDetailSheetProps) {
  const { t } = useI18n();
  return (
    <Sheet open={!!rental} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-lg">
        {rental && (
          <>
            <SheetHeader>
              <SheetTitle>{rental.tenant_name}</SheetTitle>
              <SheetDescription>
                {RENTAL_TYPE_LABEL[rental.rental_type]} · {rental.start_date} →{" "}
                {rental.end_date || t("rentals.detail.ongoing")}
              </SheetDescription>
            </SheetHeader>

            <div className="space-y-4 py-6">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={RENTAL_STATUS_VARIANT[rental.status]}>{rental.status}</Badge>
                {rental.price !== null && (
                  <span className="text-sm text-muted-foreground">
                    {t("rentals.detail.priceMonthly", { price: formatCurrency(rental.price) })}
                  </span>
                )}
              </div>

              {(rental.tenant_email || rental.tenant_phone) && (
                <div className="space-y-1 text-sm text-muted-foreground">
                  {rental.tenant_email && <p>{rental.tenant_email}</p>}
                  {rental.tenant_phone && <p>{rental.tenant_phone}</p>}
                </div>
              )}

              {canManage && (
                <div className="flex items-center justify-between gap-2 border-y py-3">
                  <Select value={rental.status} onValueChange={(v) => onStatusChange(rental.id, v as RentalStatus)}>
                    <SelectTrigger className="h-8 w-[150px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">{t("rentals.status.pending")}</SelectItem>
                      <SelectItem value="active">{t("rentals.status.active")}</SelectItem>
                      <SelectItem value="completed">{t("rentals.status.completed")}</SelectItem>
                      <SelectItem value="cancelled">{t("rentals.status.cancelled")}</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      onDelete(rental.id, rental.tenant_name);
                      onOpenChange(false);
                    }}
                  >
                    <DeleteIcon /> <span className="ml-2">{t("common.delete")}</span>
                  </Button>
                </div>
              )}

              <UnitRentalPayments rentalId={rental.id} residentialId={residentialId} canManage={canManage} />
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
