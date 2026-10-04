/**
 * Read-only view of the recurring charges that apply to a unit (e.g.
 * "Seguridad"), whichever rule covers it. Rules are edited on each charge's
 * own detail page — "Manage" here just takes you there.
 */

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { IconArrowRight, IconReceipt2 } from "@tabler/icons-react";
import { useI18n } from "@/i18n/useI18n";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Spinner } from "@/components/LoadingStates";
import { SectionEmptyState } from "@/components/units/SectionEmptyState";
import { formatCurrency } from "@/lib/utils";
import { chargeAssignmentService } from "@/services";
import { navigateTo } from "@/config/routes";
import type { UnitApplicableCharge } from "@/types/unit-wizard.types";

export function UnitChargesPanel({ unitId }: { unitId: string; canManage?: boolean }) {
  const { t } = useI18n();
  const [charges, setCharges] = useState<UnitApplicableCharge[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const load = async () => {
    setIsLoading(true);
    const result = await chargeAssignmentService.listByUnit(unitId);
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
              <div key={charge.charge_id} className="flex items-center justify-between gap-2 rounded-md border p-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {charge.charge_name}
                  </p>
                  <p className="text-xs text-muted-foreground">{formatCurrency(charge.amount)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
