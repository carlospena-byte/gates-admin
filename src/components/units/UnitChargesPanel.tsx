/**
 * Read-only view of a unit's recurring extra charges (e.g. "Seguridad").
 * Assigning/removing in bulk happens on each charge's own detail page,
 * reached from the residential dashboard's charge catalog — "Manage" here
 * just takes you there; this panel only shows what's currently applied and
 * lets you remove one.
 */

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { IconArrowRight, IconReceipt2 } from "@tabler/icons-react";
import { useI18n } from "@/i18n/useI18n";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Spinner } from "@/components/LoadingStates";
import { DeleteIcon } from "@/components/icons";
import { SectionEmptyState } from "@/components/units/SectionEmptyState";
import { confirmDeleteToast } from "@/lib/confirmDeleteToast";
import { formatCurrency } from "@/lib/utils";
import { unitChargeService } from "@/services";
import { navigateTo } from "@/config/routes";
import type { UnitCharge } from "@/types/unit-wizard.types";

export function UnitChargesPanel({ unitId, canManage }: { unitId: string; canManage: boolean }) {
  const { t } = useI18n();
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
    <Card className="h-full">
      <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0">
        <div>
          <p className="text-sm font-medium">{t("charges.unitPanel.title")}</p>
          <p className="text-xs text-muted-foreground">{t("charges.unitPanel.subtitle")}</p>
        </div>
        <Button variant="ghost" size="sm" onClick={() => navigateTo("residential")}>
          {t("common.manage")} <IconArrowRight className="ml-1 h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-4">
            <Spinner />
          </div>
        ) : charges.length === 0 ? (
          <SectionEmptyState
            icon={IconReceipt2}
            title={t("charges.unitPanel.emptyTitle")}
            description={t("charges.unitPanel.emptyDescription")}
          />
        ) : (
          <div className="space-y-2">
            {charges.map((charge) => (
              <div key={charge.id} className="flex items-center justify-between gap-2 rounded-md border p-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {charge.charges?.name || t("charges.unitPanel.unknownCharge")}
                  </p>
                  <p className="text-xs text-muted-foreground">{formatCurrency(charge.price)}</p>
                </div>
                {canManage && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleRemove(charge.id, charge.charges?.name || t("charges.unitPanel.thisCharge"))}
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
