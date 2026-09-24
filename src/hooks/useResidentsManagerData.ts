/**
 * Data fetching and mutations for the residential-wide Residents page.
 * Same shape as useVisitorManagerData.ts: one residential-wide fetch,
 * plus the unit list for the "Add Resident" sheet's unit picker.
 */

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { inviteOrLinkResident, unitResidentService, unitService, type UnitWithOwner } from "@/services";
import type { NewResidentFields } from "@/components/units/AddResidentSheet";
import type { ResidentWithStatus, UnitResident } from "@/types/unit-wizard.types";
import { useI18n } from "@/i18n/useI18n";

export function useResidentsManagerData(residentialId: string) {
  const { t } = useI18n();
  const [residents, setResidents] = useState<ResidentWithStatus[]>([]);
  const [units, setUnits] = useState<UnitWithOwner[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const reload = useCallback(async () => {
    setIsLoading(true);

    const [residentsResult, unitsResult] = await Promise.all([
      unitResidentService.listByResidentialWithStatus(residentialId),
      unitService.listByResidential(residentialId),
    ]);

    setIsLoading(false);

    if (residentsResult.success) {
      setResidents(residentsResult.data);
    } else {
      toast.error(residentsResult.error.message);
    }

    if (unitsResult.success) setUnits(unitsResult.data);
  }, [residentialId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  // Shared by createResidentAndInvite (new contact) and the manual
  // "reinvite" action (existing contact whose invitation expired or was
  // never sent) — either way, invites-or-links the given unit_residents row.
  const inviteResident = useCallback(
    async (resident: UnitResident): Promise<void> => {
      if (!resident.email.trim()) {
        toast.error(t("residents.invite.needsEmail"));
        return;
      }

      setIsSubmitting(true);
      const result = await inviteOrLinkResident(resident);
      setIsSubmitting(false);

      if (!result.success) {
        toast.error(result.error.message);
        return;
      }

      if (result.data.kind === "linked_existing") {
        toast.success(t("residents.invite.linkedExisting", { name: resident.full_name }));
      } else if (result.data.emailSent) {
        toast.success(t("residents.invite.sentWithEmail", { email: resident.email, code: result.data.code }));
      } else {
        toast.success(t("residents.invite.sentNoEmail", { name: resident.full_name, code: result.data.code }));
      }
      await reload();
    },
    [t, reload],
  );

  // Creates the contact row and immediately invites (or links, if the email
  // already has an account) — a single admin action instead of two.
  const createResidentAndInvite = useCallback(
    async (fields: NewResidentFields): Promise<boolean> => {
      setIsSubmitting(true);
      const result = await unitResidentService.create({
        unit_id: fields.unitId,
        residential_id: residentialId,
        full_name: fields.fullName.trim(),
        email: fields.email.trim(),
        phone: fields.phone.trim() || null,
      });
      setIsSubmitting(false);

      if (!result.success) {
        toast.error(result.error.message);
        return false;
      }

      await inviteResident(result.data);
      return true;
    },
    [residentialId, inviteResident],
  );

  const deleteResident = useCallback(
    async (id: string): Promise<boolean> => {
      setIsSubmitting(true);
      const result = await unitResidentService.removeResident(id);
      setIsSubmitting(false);

      if (!result.success) {
        toast.error(result.error.message);
        return false;
      }

      toast.success(result.data ? t("residents.remove.revokedAccess") : t("residents.remove.success"));
      await reload();
      return true;
    },
    [reload, t],
  );

  const toggleActive = useCallback(
    async (id: string, currentStatus: boolean) => {
      const result = await unitResidentService.toggleActive(id, currentStatus);
      if (!result.success) {
        toast.error(result.error.message);
        return;
      }
      await reload();
    },
    [reload],
  );

  return {
    residents,
    units,
    isLoading,
    isSubmitting,
    reload,
    createResidentAndInvite,
    deleteResident,
    toggleActive,
    inviteResident,
  };
}
