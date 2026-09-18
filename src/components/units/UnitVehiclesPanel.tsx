/**
 * Vehicles registered to a unit. New vehicles are added via a side sheet
 * (AddVehicleSheet), matching the Residents panel's flow.
 */

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { IconCar } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Spinner } from "@/components/LoadingStates";
import { DeleteIcon, PlusIcon } from "@/components/icons";
import { AddVehicleSheet, type NewVehicleFields } from "@/components/units/AddVehicleSheet";
import { SectionEmptyState } from "@/components/units/SectionEmptyState";
import { confirmDeleteToast } from "@/lib/confirmDeleteToast";
import { vehicleService } from "@/services";
import type { Vehicle } from "@/types/visitor.types";

export function UnitVehiclesPanel({
  unitId,
  residentialId,
  canManage,
}: {
  unitId: string;
  residentialId: string;
  canManage: boolean;
}) {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);

  const load = async () => {
    setIsLoading(true);
    const result = await vehicleService.list(unitId);
    if (result.success) {
      setVehicles(result.data);
    } else {
      toast.error(result.error.message);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unitId]);

  const handleAdd = async (fields: NewVehicleFields): Promise<boolean> => {
    setIsSubmitting(true);
    const result = await vehicleService.create({
      unit_id: unitId,
      residential_id: residentialId,
      plate: fields.plate.trim(),
      brand: fields.brand.trim() || null,
      model: fields.model.trim() || null,
      color: fields.color.trim() || null,
    });
    setIsSubmitting(false);

    if (!result.success) {
      toast.error(result.error.message);
      return false;
    }

    toast.success("Vehicle added");
    await load();
    return true;
  };

  const handleDelete = (id: string, plate: string) => {
    confirmDeleteToast(plate, async () => {
      const result = await vehicleService.delete(id);
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
          <p className="text-sm font-medium">Vehicles</p>
          <p className="text-xs text-muted-foreground">Vehicles registered to this unit.</p>
        </div>
        {canManage && (
          <Button variant="outline" size="sm" onClick={() => setSheetOpen(true)}>
            <PlusIcon /> <span className="ml-2">Add vehicle</span>
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-4">
            <Spinner />
          </div>
        ) : vehicles.length === 0 ? (
          <SectionEmptyState icon={IconCar} title="No vehicles yet." description="Add a vehicle to get started." />
        ) : (
          <div className="space-y-2">
            {vehicles.map((vehicle) => (
              <div key={vehicle.id} className="flex items-start justify-between gap-2 rounded-md border p-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{vehicle.plate}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {[vehicle.brand, vehicle.model, vehicle.color].filter(Boolean).join(" · ") || "—"}
                  </p>
                </div>
                {canManage && (
                  <Button size="sm" variant="ghost" onClick={() => handleDelete(vehicle.id, vehicle.plate)}>
                    <DeleteIcon />
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <AddVehicleSheet open={sheetOpen} onOpenChange={setSheetOpen} isSubmitting={isSubmitting} onCreate={handleAdd} />
    </Card>
  );
}
