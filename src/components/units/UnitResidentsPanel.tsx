/**
 * Residents authorized to be in a unit — contact info only (name, email,
 * phone), not tied to a registered app account.
 */

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/LoadingStates";
import { DeleteIcon, PlusIcon } from "@/components/icons";
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
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

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

  const handleAdd = async () => {
    if (!fullName.trim() || !email.trim()) {
      toast.error("Name and email are required");
      return;
    }

    setIsSubmitting(true);
    const result = await unitResidentService.create({
      unit_id: unitId,
      residential_id: residentialId,
      full_name: fullName.trim(),
      email: email.trim(),
      phone: phone.trim() || null,
    });
    setIsSubmitting(false);

    if (!result.success) {
      toast.error(result.error.message);
      return;
    }

    toast.success("Resident added");
    setFullName("");
    setEmail("");
    setPhone("");
    await load();
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
    <Card>
      <CardHeader>
        <CardTitle>Residents</CardTitle>
        <CardDescription>People authorized to be in this unit.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {canManage && (
          <div className="space-y-2 border-b pb-4">
            <Input
              label="Full Name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              disabled={isSubmitting}
            />
            <Input
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isSubmitting}
            />
            <Input
              label="Phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              disabled={isSubmitting}
            />
            <Button
              onClick={handleAdd}
              disabled={isSubmitting || !fullName.trim() || !email.trim()}
              className="w-full"
            >
              {isSubmitting ? (
                <Spinner size="sm" />
              ) : (
                <>
                  <PlusIcon /> <span className="ml-2">Add Resident</span>
                </>
              )}
            </Button>
          </div>
        )}

        {isLoading ? (
          <div className="flex justify-center py-4">
            <Spinner />
          </div>
        ) : residents.length === 0 ? (
          <p className="text-center py-4 text-sm text-muted-foreground">No residents yet.</p>
        ) : (
          <div className="space-y-2">
            {residents.map((resident) => (
              <div key={resident.id} className="flex items-start justify-between gap-2 rounded-md border p-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{resident.full_name}</p>
                  <p className="text-xs text-muted-foreground truncate">{resident.email}</p>
                  {resident.phone && <p className="text-xs text-muted-foreground truncate">{resident.phone}</p>}
                </div>
                {canManage && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDelete(resident.id, resident.full_name)}
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
