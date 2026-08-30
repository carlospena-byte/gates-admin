/**
 * Read-only view of a unit's recurring extra charges (e.g. "Seguridad").
 * Assigning/removing in bulk happens on the charge's own detail page —
 * this panel only shows what's currently applied and lets you remove one.
 */

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/LoadingStates";
import { DeleteIcon } from "@/components/icons";
import { confirmDeleteToast } from "@/lib/confirmDeleteToast";
import { formatCurrency } from "@/lib/utils";
import { unitChargeService } from "@/services";
import type { UnitCharge } from "@/types/unit-wizard.types";

export function UnitChargesPanel({ unitId, canManage }: { unitId: string; canManage: boolean }) {
  const [charges, setCharges] = useState<UnitCharge[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const load = async () => {
    setIsLoading(true);
    const result = await unitChargeService.listByUnit(unitId);
    if (result.success) {
      setCharges(result.data);
    } else {
      toast.error(result.error.message);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unitId]);

  const handleRemove = (id: string, name: string) => {
    confirmDeleteToast(name, async () => {
      const result = await unitChargeService.delete(id);
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
        <CardTitle>Extra Charges</CardTitle>
        <CardDescription>Recurring fees applied to this unit (managed from each charge's own page).</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-4">
            <Spinner />
          </div>
        ) : charges.length === 0 ? (
          <p className="text-center py-4 text-sm text-muted-foreground">No extra charges applied.</p>
        ) : (
          <div className="space-y-2">
            {charges.map((charge) => (
              <div key={charge.id} className="flex items-center justify-between gap-2 rounded-md border p-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{charge.charges?.name || "Unknown charge"}</p>
                  <p className="text-xs text-muted-foreground">{formatCurrency(charge.price)}</p>
                </div>
                {canManage && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleRemove(charge.id, charge.charges?.name || "this charge")}
                  >
                    <DeleteIcon />
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
