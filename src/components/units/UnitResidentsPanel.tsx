/**
 * Residents authorized to live in a unit — contact info only (name, email,
 * phone), not tied to a registered app account. New residents are added via
 * a side sheet (AddResidentSheet) rather than an always-visible inline
 * form, matching the Add-ons assignment flow.
 */

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { IconMailForward, IconUsers } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/LoadingStates";
import { DeleteIcon, PlusIcon } from "@/components/icons";
import { AddResidentSheet, type NewResidentFields } from "@/components/units/AddResidentSheet";
import { SectionEmptyState } from "@/components/units/SectionEmptyState";
import { confirmDeleteToast } from "@/lib/confirmDeleteToast";
import { useI18n } from "@/i18n/useI18n";
import { inviteOrLinkResident, unitResidentService } from "@/services";
import { RESIDENT_STATUS_BADGE_VARIANT, residentStatusMessageKey } from "@/components/residents/residentStatus";
import type { ResidentWithStatus } from "@/types/unit-wizard.types";

export function UnitResidentsPanel({
  unitId,
  residentialId,
  canManage,
}: {
  unitId: string;
  residentialId: string;
  canManage: boolean;
}) {
  const { t } = useI18n();
  const [residents, setResidents] = useState<ResidentWithStatus[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);

  const load = async () => {
    setIsLoading(true);
    const result = await unitResidentService.listByUnitWithStatus(unitId);
    if (result.success) {
      setResidents(result.data);
    } else {
      toast.error(result.error.message);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unitId]);

  // Creates the contact row and immediately invites (or links, if the email
  // already has an account) — same single-step flow as the residential-wide
  // Residents page.
  const handleAdd = async (fields: NewResidentFields): Promise<boolean> => {
    setIsSubmitting(true);
    const createResult = await unitResidentService.create({
      unit_id: unitId,
      residential_id: residentialId,
      full_name: fields.fullName.trim(),
      email: fields.email.trim(),
      phone: fields.phone.trim() || null,
    });

    if (!createResult.success) {
      setIsSubmitting(false);
      toast.error(createResult.error.message);
      return false;
    }

    const inviteResult = await inviteOrLinkResident(createResult.data);
    setIsSubmitting(false);

    if (!inviteResult.success) {
      toast.error(inviteResult.error.message);
    } else if (inviteResult.data.kind === "linked_existing") {
      toast.success(t("residents.invite.linkedExisting", { name: createResult.data.full_name }));
    } else if (inviteResult.data.emailSent) {
      toast.success(t("residents.invite.sentWithEmail", { email: createResult.data.email, code: inviteResult.data.code }));
    } else {
      toast.success(t("residents.invite.sentNoEmail", { name: createResult.data.full_name, code: inviteResult.data.code }));
    }

    await load();
    return true;
  };

  const handleReinvite = async (resident: ResidentWithStatus) => {
    setIsSubmitting(true);
    const result = await inviteOrLinkResident(resident);
    setIsSubmitting(false);

    if (!result.success) {
      toast.error(result.error.message);
    } else if (result.data.kind === "linked_existing") {
      toast.success(t("residents.invite.linkedExisting", { name: resident.full_name }));
    } else if (result.data.emailSent) {
      toast.success(t("residents.invite.sentWithEmail", { email: resident.email, code: result.data.code }));
    } else {
      toast.success(t("residents.invite.sentNoEmail", { name: resident.full_name, code: result.data.code }));
    }
    await load();
  };

  // Removes the contact and — unlike a plain unit_residents delete — also
  // revokes any real access (unit_members) or pending invitation it had.
  // Warns first if the resident already has active access.
  const handleDelete = (resident: ResidentWithStatus) => {
    const description =
      resident.status === "active" ? t("residents.remove.confirmActiveDescription") : undefined;
    confirmDeleteToast(
      resident.full_name,
      async () => {
        const result = await unitResidentService.removeResident(resident.id);
        if (!result.success) {
          toast.error(result.error.message);
          return;
        }
        toast.success(result.data ? t("residents.remove.revokedAccess") : t("residents.remove.success"));
        await load();
      },
      description,
    );
  };

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0">
        <div>
          <p className="text-sm font-medium">{t("residents.panel.title")}</p>
          <p className="text-xs text-muted-foreground">{t("residents.panel.description")}</p>
        </div>
        {canManage && (
          <Button variant="outline" size="sm" onClick={() => setSheetOpen(true)}>
            <PlusIcon /> <span className="ml-2">{t("residents.create.submit")}</span>
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-4">
            <Spinner />
          </div>
        ) : residents.length === 0 ? (
          <SectionEmptyState
            icon={IconUsers}
            title={t("residents.panel.emptyTitle")}
            description={t("residents.panel.emptyDescription")}
          />
        ) : (
          <div className="space-y-2">
            {residents.map((resident) => (
              <div key={resident.id} className="flex items-start justify-between gap-2 rounded-md border p-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-medium">{resident.full_name}</p>
                    <Badge variant={RESIDENT_STATUS_BADGE_VARIANT[resident.status]}>
                      {t(residentStatusMessageKey(resident.status))}
                    </Badge>
                  </div>
                  <p className="truncate text-xs text-muted-foreground">{resident.email}</p>
                  {resident.phone && <p className="truncate text-xs text-muted-foreground">{resident.phone}</p>}
                </div>
                {canManage && (
                  <div className="flex shrink-0 items-center">
                    {resident.status !== "active" && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleReinvite(resident)}
                        disabled={isSubmitting}
                        title={
                          resident.status === "not_invited"
                            ? t("residents.table.invite")
                            : t("residents.table.reinvite")
                        }
                      >
                        <IconMailForward className="h-4 w-4" />
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" onClick={() => handleDelete(resident)} disabled={isSubmitting}>
                      <DeleteIcon />
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <AddResidentSheet open={sheetOpen} onOpenChange={setSheetOpen} isSubmitting={isSubmitting} onCreate={handleAdd} />
    </Card>
  );
}
