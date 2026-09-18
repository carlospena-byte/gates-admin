/**
 * Residents authorized to live in a unit — contact info only (name, email,
 * phone), not tied to a registered app account. New residents are added via
 * a side sheet (AddResidentSheet) rather than an always-visible inline
 * form, matching the Add-ons assignment flow.
 */

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { IconUsers } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Spinner } from "@/components/LoadingStates";
import { DeleteIcon, PlusIcon } from "@/components/icons";
import { AddResidentSheet, type NewResidentFields } from "@/components/units/AddResidentSheet";
import { SectionEmptyState } from "@/components/units/SectionEmptyState";
import { confirmDeleteToast } from "@/lib/confirmDeleteToast";
import { unitResidentService } from "@/services";
import type { UnitResident } from "@/types/unit-wizard.types";

export function UnitResidentsPanel({
  unitId,
  residentialId,
  canManage,
}: {
  unitId: string;
  residentialId: string;
  canManage: boolean;
}) {
  const [residents, setResidents] = useState<UnitResident[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);

  const load = async () => {
    setIsLoading(true);
    const result = await unitResidentService.list(unitId);
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

  const handleAdd = async (fields: NewResidentFields): Promise<boolean> => {
    setIsSubmitting(true);
    const result = await unitResidentService.create({
      unit_id: unitId,
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

    toast.success("Resident added");
    await load();
    return true;
  };

  const handleDelete = (id: string, name: string) => {
    confirmDeleteToast(name, async () => {
      const result = await unitResidentService.delete(id);
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
          <p className="text-sm font-medium">Residents</p>
          <p className="text-xs text-muted-foreground">People authorized to live in this unit.</p>
        </div>
        {canManage && (
          <Button variant="outline" size="sm" onClick={() => setSheetOpen(true)}>
            <PlusIcon /> <span className="ml-2">Add resident</span>
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-4">
            <Spinner />
          </div>
        ) : residents.length === 0 ? (
          <SectionEmptyState icon={IconUsers} title="No residents yet." description="Add a resident to get started." />
        ) : (
          <div className="space-y-2">
            {residents.map((resident) => (
              <div key={resident.id} className="flex items-start justify-between gap-2 rounded-md border p-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{resident.full_name}</p>
                  <p className="truncate text-xs text-muted-foreground">{resident.email}</p>
                  {resident.phone && <p className="truncate text-xs text-muted-foreground">{resident.phone}</p>}
                </div>
                {canManage && (
                  <Button size="sm" variant="ghost" onClick={() => handleDelete(resident.id, resident.full_name)}>
                    <DeleteIcon />
                  </Button>
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
