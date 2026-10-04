/**
 * A single recurring charge, laid out as a flow: a summary header, then
 * 1) how much / when / late fee, then 2) who pays it, then generating this
 * month's installments.
 */

import { IconArrowLeft } from "@tabler/icons-react";
import { useI18n } from "@/i18n/useI18n";
import { AppSidebar } from "@/components/AppSidebar";
import { ChargeRulesCard } from "@/components/charges/ChargeRulesCard";
import { ChargeTermsCard } from "@/components/charges/ChargeTermsCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Spinner } from "@/components/LoadingStates";
import { formatCurrency } from "@/lib/utils";
import { authService } from "@/services";
import { useSession } from "@/state/useSession";
import { canManageResidential } from "@/state/useAccess";
import { useChargeDetailData } from "@/hooks/useChargeDetailData";
import { navigateTo } from "@/config/routes";
import type { ResidentialRole } from "@/types/database.types";
import type { Charge } from "@/types/unit-wizard.types";

function lateFeeLabel(charge: Charge, t: ReturnType<typeof useI18n>["t"]): string {
  if (charge.late_fee_type === "none") return t("charges.header.noLateFee");
  if (charge.late_fee_type === "percent") return t("charges.header.lateFeePercent", { value: charge.late_fee_value });
  return t("charges.header.lateFeeFixed", { value: formatCurrency(charge.late_fee_value) });
}

export function ChargeDetailPage({
  residentialId,
  chargeId,
  role,
}: {
  residentialId: string;
  chargeId: string;
  role: ResidentialRole;
}) {
  const { t } = useI18n();
  const { session } = useSession();
  const canManage = canManageResidential(role);
  const {
    charge,
    assignments,
    unitCount,
    units,
    locations,
    locationTypes,
    isLoading,
    isSubmitting,
    updateCharge,
    addAssignment,
    removeAssignment,
    toggleAssignmentActive,
    generateThisMonth,
  } = useChargeDetailData(residentialId, chargeId);

  const shell = (children: React.ReactNode) => (
    <div className="min-h-screen">
      <AppSidebar
        userEmail={session?.user?.email}
        residentialId={residentialId}
        role={role}
        onSignOut={() => authService.signOut()}
        showUserMenu
      />
      <div className="lg:pl-64">
        <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6">
          <Button variant="ghost" size="sm" onClick={() => navigateTo("settingsCharges")}>
            <IconArrowLeft className="mr-2 h-4 w-4" /> {t("common.back")}
          </Button>
          {children}
        </div>
      </div>
    </div>
  );

  if (!charge) {
    return shell(
      isLoading ? (
        <div className="flex justify-center py-12">
          <Spinner />
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">{t("charges.detail.notFound")}</p>
      ),
    );
  }

  return shell(
    <>
      <header className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-3xl font-medium tracking-tight">{charge.name}</h1>
          <label className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">
              {charge.is_active ? t("common.active") : t("common.inactive")}
            </span>
            <Switch
              checked={charge.is_active}
              onCheckedChange={(checked) => void updateCharge({ is_active: checked })}
              disabled={!canManage || isSubmitting}
              aria-label={t("charges.header.activeToggle")}
            />
          </label>
        </div>
        {charge.description && <p className="text-sm text-muted-foreground">{charge.description}</p>}
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary" className="cursor-default">
            {t("charges.header.perMonth", { amount: formatCurrency(charge.amount) })}
          </Badge>
          <Badge variant="secondary" className="cursor-default">
            {t("charges.header.dueDay", { day: charge.due_day })}
          </Badge>
          <Badge variant="secondary" className="cursor-default">
            {lateFeeLabel(charge, t)}
          </Badge>
          <Badge variant={unitCount > 0 ? "success" : "warning"} className="cursor-default">
            {t("charges.header.units", { count: unitCount })}
          </Badge>
        </div>
        {!charge.is_active && <p className="text-sm text-gates-warning">{t("charges.header.inactiveNote")}</p>}
      </header>

      <div className="grid items-start gap-6 lg:grid-cols-2">
        <ChargeTermsCard charge={charge} canManage={canManage} isSubmitting={isSubmitting} onSave={updateCharge} />

        <ChargeRulesCard
          charge={charge}
          assignments={assignments}
          unitCount={unitCount}
          units={units}
          locations={locations}
          locationTypes={locationTypes}
          canManage={canManage}
          isLoading={isLoading}
          isSubmitting={isSubmitting}
          onAdd={addAssignment}
          onRemove={removeAssignment}
          onToggleActive={toggleAssignmentActive}
        />
      </div>

      {canManage && (
        <Card>
          <CardContent className="flex flex-wrap items-center justify-between gap-4 pt-6">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">{t("charges.generate.title")}</p>
              <p className="text-sm text-muted-foreground">
                {unitCount === 0
                  ? t("charges.generate.needRules")
                  : t("charges.generate.description", { day: charge.generation_day })}
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => void generateThisMonth()}
              disabled={isSubmitting || unitCount === 0 || !charge.is_active}
            >
              {t("charges.detail.generateNow")}
            </Button>
          </CardContent>
        </Card>
      )}
    </>,
  );
}
