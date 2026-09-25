/**
 * Platform-admin panel for the plan catalog (platform_plans) — global rows
 * residentials get assigned to. No billing/payment processing here, just
 * the catalog itself: name, pricing formula, active/inactive.
 *
 * Pricing formula: max(base_price + price_per_unit * units, min_monthly_price)
 *
 * A plan can optionally "anchor" its pricing to another plan: it then shares
 * that plan's base_price and its price_per_unit becomes
 * anchor.price_per_unit + offset, always — a DB trigger keeps this in sync
 * if the anchor plan's own pricing changes later (see
 * supabase/migrations/20261017000000_platform_plans_price_anchor.sql).
 */

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/LoadingStates";
import { confirmDeleteToast } from "@/lib/confirmDeleteToast";
import { formatCurrency } from "@/lib/utils";
import { computeMonthlyPrice } from "@/lib/planPricing";
import { platformPlanService } from "@/services";
import type { PlatformPlan } from "@/types/database.types";
import { useI18n } from "@/i18n/useI18n";

const EXAMPLE_UNIT_COUNT = 50;
const MIN_BASE_PRICE = 49.99;
const NO_ANCHOR = "none";

interface PlanFormState {
  name: string;
  basePrice: string;
  pricePerUnit: string;
  minMonthlyPrice: string;
  anchorPlanId: string;
  offset: string;
}

const emptyForm: PlanFormState = {
  name: "",
  basePrice: "",
  pricePerUnit: "",
  minMonthlyPrice: "",
  anchorPlanId: NO_ANCHOR,
  offset: "",
};

function toNumber(value: string): number {
  return value.trim() ? Number(value) : 0;
}

/** Plans other plans are allowed to anchor to: not anchored themselves (no chains), and not `excludeId`. */
function anchorCandidates(plans: PlatformPlan[], excludeId?: string) {
  return plans.filter((p) => p.id !== excludeId && p.price_anchor_plan_id == null);
}

export function PlatformPlanManager() {
  const { t } = useI18n();
  const [plans, setPlans] = useState<PlatformPlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState<PlanFormState>(emptyForm);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingForm, setEditingForm] = useState<PlanFormState>(emptyForm);

  const load = async () => {
    setIsLoading(true);
    const result = await platformPlanService.list();
    if (result.success) {
      setPlans(result.data);
    } else {
      toast.error(result.error.message);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    void load();
  }, []);

  const createAnchor = form.anchorPlanId !== NO_ANCHOR ? plans.find((p) => p.id === form.anchorPlanId) : undefined;
  const editingAnchor =
    editingForm.anchorPlanId !== NO_ANCHOR ? plans.find((p) => p.id === editingForm.anchorPlanId) : undefined;

  const handleCreate = async () => {
    if (!form.name.trim()) return;
    if (!createAnchor && toNumber(form.basePrice) < MIN_BASE_PRICE) {
      toast.error(t("platformAdmin.plans.basePriceTooLow", { min: MIN_BASE_PRICE }));
      return;
    }
    setIsSubmitting(true);
    const result = await platformPlanService.create({
      name: form.name.trim(),
      base_price: createAnchor ? createAnchor.base_price : toNumber(form.basePrice),
      price_per_unit: createAnchor ? createAnchor.price_per_unit + toNumber(form.offset) : toNumber(form.pricePerUnit),
      min_monthly_price: toNumber(form.minMonthlyPrice),
      price_anchor_plan_id: createAnchor ? createAnchor.id : null,
      price_per_unit_offset: createAnchor ? toNumber(form.offset) : null,
    });
    setIsSubmitting(false);

    if (!result.success) {
      toast.error(result.error.message);
      return;
    }

    toast.success(t("platformAdmin.plans.created"));
    setForm(emptyForm);
    await load();
  };

  const startEditing = (plan: PlatformPlan) => {
    setEditingId(plan.id);
    setEditingForm({
      name: plan.name,
      basePrice: String(plan.base_price),
      pricePerUnit: String(plan.price_per_unit),
      minMonthlyPrice: String(plan.min_monthly_price),
      anchorPlanId: plan.price_anchor_plan_id ?? NO_ANCHOR,
      offset: plan.price_per_unit_offset != null ? String(plan.price_per_unit_offset) : "",
    });
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditingForm(emptyForm);
  };

  const handleUpdate = async (id: string) => {
    if (!editingForm.name.trim()) return;
    if (!editingAnchor && toNumber(editingForm.basePrice) < MIN_BASE_PRICE) {
      toast.error(t("platformAdmin.plans.basePriceTooLow", { min: MIN_BASE_PRICE }));
      return;
    }
    setIsSubmitting(true);
    const result = await platformPlanService.update(id, {
      name: editingForm.name.trim(),
      base_price: editingAnchor ? editingAnchor.base_price : toNumber(editingForm.basePrice),
      price_per_unit: editingAnchor
        ? editingAnchor.price_per_unit + toNumber(editingForm.offset)
        : toNumber(editingForm.pricePerUnit),
      min_monthly_price: toNumber(editingForm.minMonthlyPrice),
      price_anchor_plan_id: editingAnchor ? editingAnchor.id : null,
      price_per_unit_offset: editingAnchor ? toNumber(editingForm.offset) : null,
    });
    setIsSubmitting(false);

    if (!result.success) {
      toast.error(result.error.message);
      return;
    }
    cancelEditing();
    await load();
  };

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    const result = await platformPlanService.toggleActive(id, currentStatus);
    if (!result.success) {
      toast.error(result.error.message);
      return;
    }
    await load();
  };

  const handleDelete = (id: string, planName: string) => {
    confirmDeleteToast(planName, async () => {
      const result = await platformPlanService.delete(id);
      if (!result.success) {
        toast.error(result.error.message);
        return;
      }
      await load();
    });
  };

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">{t("platformAdmin.plans.formula")}</p>

      <div className="flex flex-wrap items-end gap-2">
        <Input
          label={t("common.name")}
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          disabled={isSubmitting}
          className="flex-1 min-w-[10rem]"
        />
        <Input
          label={t("platformAdmin.plans.basePrice")}
          type="number"
          min={MIN_BASE_PRICE}
          step="0.01"
          value={createAnchor ? String(createAnchor.base_price) : form.basePrice}
          onChange={(e) => setForm({ ...form, basePrice: e.target.value })}
          disabled={isSubmitting || !!createAnchor}
          className="w-32"
        />
        <Input
          label={t("platformAdmin.plans.pricePerUnit")}
          type="number"
          value={createAnchor ? String(createAnchor.price_per_unit + toNumber(form.offset)) : form.pricePerUnit}
          onChange={(e) => setForm({ ...form, pricePerUnit: e.target.value })}
          disabled={isSubmitting || !!createAnchor}
          className="w-32"
        />
        <Input
          label={t("platformAdmin.plans.minMonthlyPrice")}
          type="number"
          value={form.minMonthlyPrice}
          onChange={(e) => setForm({ ...form, minMonthlyPrice: e.target.value })}
          disabled={isSubmitting}
          className="w-32"
        />
        <div className="space-y-1">
          <label className="text-sm font-medium text-foreground">{t("platformAdmin.plans.anchorTo")}</label>
          <Select
            value={form.anchorPlanId}
            onValueChange={(value) => setForm({ ...form, anchorPlanId: value })}
            disabled={isSubmitting}
          >
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NO_ANCHOR}>{t("common.none")}</SelectItem>
              {anchorCandidates(plans).map((plan) => (
                <SelectItem key={plan.id} value={plan.id}>
                  {plan.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {createAnchor ? (
          <Input
            label={t("platformAdmin.plans.offset")}
            type="number"
            step="0.01"
            value={form.offset}
            onChange={(e) => setForm({ ...form, offset: e.target.value })}
            disabled={isSubmitting}
            className="w-28"
          />
        ) : null}
        <Button onClick={handleCreate} disabled={isSubmitting || !form.name.trim()}>
          {isSubmitting ? <Spinner size="sm" /> : t("common.add")}
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <Spinner />
        </div>
      ) : plans.length === 0 ? (
        <div className="py-8 text-center text-sm text-muted-foreground">{t("platformAdmin.plans.empty")}</div>
      ) : (
        <div className="rounded-lg border bg-card">
          <div className="divide-y">
            {plans.map((plan) => (
              <div key={plan.id} className="flex flex-wrap items-center gap-4 px-4 py-3">
                {editingId === plan.id ? (
                  <>
                    <Input
                      value={editingForm.name}
                      onChange={(e) => setEditingForm({ ...editingForm, name: e.target.value })}
                      className="h-9 flex-1 min-w-[10rem]"
                      autoFocus
                      disabled={isSubmitting}
                    />
                    <Input
                      type="number"
                      min={MIN_BASE_PRICE}
                      step="0.01"
                      value={editingAnchor ? String(editingAnchor.base_price) : editingForm.basePrice}
                      onChange={(e) => setEditingForm({ ...editingForm, basePrice: e.target.value })}
                      className="h-9 w-28"
                      disabled={isSubmitting || !!editingAnchor}
                    />
                    <Input
                      type="number"
                      value={
                        editingAnchor
                          ? String(editingAnchor.price_per_unit + toNumber(editingForm.offset))
                          : editingForm.pricePerUnit
                      }
                      onChange={(e) => setEditingForm({ ...editingForm, pricePerUnit: e.target.value })}
                      className="h-9 w-28"
                      disabled={isSubmitting || !!editingAnchor}
                    />
                    <Input
                      type="number"
                      value={editingForm.minMonthlyPrice}
                      onChange={(e) => setEditingForm({ ...editingForm, minMonthlyPrice: e.target.value })}
                      className="h-9 w-28"
                      disabled={isSubmitting}
                    />
                    <Select
                      value={editingForm.anchorPlanId}
                      onValueChange={(value) => setEditingForm({ ...editingForm, anchorPlanId: value })}
                      disabled={isSubmitting}
                    >
                      <SelectTrigger className="h-9 w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NO_ANCHOR}>{t("common.none")}</SelectItem>
                        {anchorCandidates(plans, plan.id).map((candidate) => (
                          <SelectItem key={candidate.id} value={candidate.id}>
                            {candidate.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {editingAnchor ? (
                      <Input
                        type="number"
                        step="0.01"
                        value={editingForm.offset}
                        onChange={(e) => setEditingForm({ ...editingForm, offset: e.target.value })}
                        className="h-9 w-24"
                        disabled={isSubmitting}
                      />
                    ) : null}
                    <Button size="sm" onClick={() => handleUpdate(plan.id)} disabled={isSubmitting || !editingForm.name.trim()}>
                      {t("common.save")}
                    </Button>
                    <Button size="sm" variant="outline" onClick={cancelEditing} disabled={isSubmitting}>
                      {t("common.cancel")}
                    </Button>
                  </>
                ) : (
                  <>
                    <div className="flex-1 min-w-[10rem]">
                      <span className="block truncate text-sm font-medium text-foreground">{plan.name}</span>
                      <span className="block text-xs text-muted-foreground">
                        {t("platformAdmin.plans.exampleAt", {
                          units: EXAMPLE_UNIT_COUNT,
                          price: formatCurrency(computeMonthlyPrice(plan, EXAMPLE_UNIT_COUNT)),
                        })}
                      </span>
                      {plan.price_anchor_plan_id ? (
                        <span className="block text-xs text-muted-foreground">
                          {t("platformAdmin.plans.anchoredTo", {
                            plan: plans.find((p) => p.id === plan.price_anchor_plan_id)?.name ?? "—",
                            offset: formatCurrency(plan.price_per_unit_offset ?? 0),
                          })}
                        </span>
                      ) : null}
                    </div>
                    <span className="w-24 text-xs text-muted-foreground">
                      {t("platformAdmin.plans.basePrice")}: {formatCurrency(plan.base_price)}
                    </span>
                    <span className="w-28 text-xs text-muted-foreground">
                      {t("platformAdmin.plans.pricePerUnit")}: {formatCurrency(plan.price_per_unit)}
                    </span>
                    <span className="w-24 text-xs text-muted-foreground">
                      {t("platformAdmin.plans.minMonthlyPrice")}: {formatCurrency(plan.min_monthly_price)}
                    </span>
                    <Badge
                      className={
                        plan.is_active
                          ? "bg-gates-success-bg text-gates-success hover:bg-gates-success-bg"
                          : "bg-gates-subtle text-gates-text-secondary hover:bg-gates-subtle"
                      }
                    >
                      {plan.is_active ? t("common.active") : t("common.inactive")}
                    </Badge>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="sm" variant="ghost" disabled={isSubmitting}>
                          ···
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => startEditing(plan)}>{t("common.edit")}</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleToggleActive(plan.id, plan.is_active)}>
                          {plan.is_active ? t("common.setInactive") : t("common.setActive")}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => handleDelete(plan.id, plan.name)}
                        >
                          {t("common.delete")}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
