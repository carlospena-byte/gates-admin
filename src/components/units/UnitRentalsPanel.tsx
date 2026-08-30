/**
 * Rental periods for a unit — the ongoing 'monthly' tenancy (the person
 * responsible for the unit) and/or any number of 'short_term' Airbnb-style
 * stays. Tenant/guest is contact info only, like UnitResidentsPanel.
 */

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/LoadingStates";
import { DeleteIcon, PlusIcon } from "@/components/icons";
import { confirmDeleteToast } from "@/lib/confirmDeleteToast";
import { formatCurrency } from "@/lib/utils";
import { unitRentalService } from "@/services";
import { UnitRentalPayments } from "@/components/units/UnitRentalPayments";
import type { RentalStatus, RentalType, UnitRental } from "@/types/unit-wizard.types";

const STATUS_VARIANT: Record<RentalStatus, "secondary" | "default" | "destructive" | "outline"> = {
  pending: "outline",
  active: "default",
  completed: "secondary",
  cancelled: "destructive",
};

const RENTAL_TYPE_LABEL: Record<RentalType, string> = {
  monthly: "Monthly",
  short_term: "Short-term",
};

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
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [rentalType, setRentalType] = useState<RentalType>("monthly");
  const [tenantName, setTenantName] = useState("");
  const [tenantEmail, setTenantEmail] = useState("");
  const [tenantPhone, setTenantPhone] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [price, setPrice] = useState("");

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

  const resetForm = () => {
    setRentalType("monthly");
    setTenantName("");
    setTenantEmail("");
    setTenantPhone("");
    setStartDate("");
    setEndDate("");
    setPrice("");
  };

  const handleAdd = async () => {
    if (!tenantName.trim() || !startDate) {
      toast.error("Tenant name and start date are required");
      return;
    }

    setIsSubmitting(true);
    const result = await unitRentalService.create({
      residential_id: residentialId,
      unit_id: unitId,
      rental_type: rentalType,
      tenant_name: tenantName.trim(),
      tenant_email: tenantEmail.trim() || null,
      tenant_phone: tenantPhone.trim() || null,
      start_date: startDate,
      end_date: endDate || null,
      price: price.trim() ? Number(price) : null,
      status: "active",
    });
    setIsSubmitting(false);

    if (!result.success) {
      toast.error(result.error.message);
      return;
    }

    toast.success("Rental added");
    resetForm();
    await load();
  };

  const handleStatusChange = async (id: string, status: RentalStatus) => {
    const result = await unitRentalService.update(id, { status });
    if (!result.success) {
      toast.error(result.error.message);
      return;
    }
    await load();
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Rentals</CardTitle>
        <CardDescription>
          Who's responsible for this unit (monthly tenant or owner) and any short-term stays.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {canManage && (
          <div className="space-y-2 border-b pb-4">
            <div className="grid gap-2 sm:grid-cols-2">
              <Select value={rentalType} onValueChange={(v) => setRentalType(v as RentalType)} disabled={isSubmitting}>
                <SelectTrigger label="Rental Type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly (responsible tenant)</SelectItem>
                  <SelectItem value="short_term">Short-term (Airbnb-style)</SelectItem>
                </SelectContent>
              </Select>
              <Input
                label="Price (optional)"
                type="number"
                min="0"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                disabled={isSubmitting}
              />
            </div>
            <Input
              label="Tenant / Guest Name"
              value={tenantName}
              onChange={(e) => setTenantName(e.target.value)}
              disabled={isSubmitting}
            />
            <div className="grid gap-2 sm:grid-cols-2">
              <Input
                label="Email (optional)"
                type="email"
                value={tenantEmail}
                onChange={(e) => setTenantEmail(e.target.value)}
                disabled={isSubmitting}
              />
              <Input
                label="Phone (optional)"
                value={tenantPhone}
                onChange={(e) => setTenantPhone(e.target.value)}
                disabled={isSubmitting}
              />
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <Input
                label="Start Date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                disabled={isSubmitting}
              />
              <Input
                label="End Date (optional)"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                disabled={isSubmitting}
              />
            </div>
            <Button
              onClick={handleAdd}
              disabled={isSubmitting || !tenantName.trim() || !startDate}
              className="w-full"
            >
              {isSubmitting ? (
                <Spinner size="sm" />
              ) : (
                <>
                  <PlusIcon /> <span className="ml-2">Add Rental</span>
                </>
              )}
            </Button>
          </div>
        )}

        {isLoading ? (
          <div className="flex justify-center py-4">
            <Spinner />
          </div>
        ) : rentals.length === 0 ? (
          <p className="text-center py-4 text-sm text-muted-foreground">No rentals yet.</p>
        ) : (
          <div className="space-y-3">
            {rentals.map((rental) => (
              <div key={rental.id} className="rounded-md border p-3 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium truncate">{rental.tenant_name}</p>
                      <Badge variant="outline">{RENTAL_TYPE_LABEL[rental.rental_type]}</Badge>
                      <Badge variant={STATUS_VARIANT[rental.status]}>{rental.status}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {rental.start_date} → {rental.end_date || "ongoing"}
                      {rental.price !== null && <span> · {formatCurrency(rental.price)}</span>}
                    </p>
                    {rental.tenant_email && (
                      <p className="text-xs text-muted-foreground truncate">{rental.tenant_email}</p>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setExpandedId((prev) => (prev === rental.id ? null : rental.id))}
                    >
                      {expandedId === rental.id ? "Hide payments" : "Payments"}
                    </Button>
                    {canManage && (
                      <>
                        <Select
                          value={rental.status}
                          onValueChange={(v) => handleStatusChange(rental.id, v as RentalStatus)}
                        >
                          <SelectTrigger className="h-8 w-[110px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="completed">Completed</SelectItem>
                            <SelectItem value="cancelled">Cancelled</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDelete(rental.id, rental.tenant_name)}
                        >
                          <DeleteIcon />
                        </Button>
                      </>
                    )}
                  </div>
                </div>

                {expandedId === rental.id && (
                  <UnitRentalPayments rentalId={rental.id} residentialId={residentialId} canManage={canManage} />
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
