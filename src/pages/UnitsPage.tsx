import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Navbar } from "@/components/Navbar";
import { TableSkeleton } from "@/components/LoadingStates";
import { UnitManager } from "@/components/UnitManager";
import { authService, unitService } from "@/services";
import { useSession } from "@/state/useSession";
import type { UnitWithOwner } from "@/services/api.service";

const RefreshIcon = () => (
  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
    />
  </svg>
);

export function UnitsPage({ residentialId }: { residentialId: string }) {
  const { session } = useSession();
  const [units, setUnits] = useState<UnitWithOwner[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [unitManagerOpen, setUnitManagerOpen] = useState(false);

  const loadUnits = useCallback(async () => {
    setIsLoading(true);
    const result = await unitService.listByResidential(residentialId);

    if (result.success) {
      setUnits(result.data);
      console.log('✅ Units loaded:', result.data.length);
    } else {
      toast.error(result.error.message);
      console.error('❌ Failed to load units:', result.error);
    }

    setIsLoading(false);
  }, [residentialId]);

  useEffect(() => {
    loadUnits();
  }, [loadUnits]);

  const handleToggleActive = async (id: string, currentActive: boolean) => {
    const result = await unitService.update(id, { is_active: !currentActive });

    if (result.success) {
      toast.success(`Unit ${!currentActive ? 'activated' : 'deactivated'}`);
      await loadUnits();
    } else {
      toast.error(result.error.message);
    }
  };

  const handleUnitManagerClose = async () => {
    setUnitManagerOpen(false);
    // Always refresh after closing the manager
    await loadUnits();
  };

  return (
    <div className="min-h-screen">
      <Navbar userEmail={session?.user?.email} onSignOut={() => authService.signOut()} showUserMenu />

      <div className="mx-auto max-w-7xl px-6 py-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Units</CardTitle>
              <CardDescription>Manage all residential units</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={loadUnits} disabled={isLoading}>
                <RefreshIcon />
              </Button>
              <Button onClick={() => setUnitManagerOpen(true)}>Add Unit</Button>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <TableSkeleton rows={5} columns={5} />
            ) : units.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">
                <p className="text-lg font-medium">No units found</p>
                <p className="text-sm mt-2">Click "Add Unit" to create your first unit</p>
              </div>
            ) : (
              <div className="rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Unit Name</TableHead>
                      <TableHead>Owner</TableHead>
                      <TableHead>Unit Type</TableHead>
                      <TableHead>Location Type</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead className="text-right">Active</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {units.map((unit) => (
                      <TableRow key={unit.id}>
                        <TableCell className="font-medium">{unit.name}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {unit.profiles?.email || "Unassigned"}
                        </TableCell>
                        <TableCell>
                          {unit.unit_type ? (
                            <Badge variant="secondary">{unit.unit_type.name}</Badge>
                          ) : (
                            <span className="text-sm text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {unit.location ? (
                            <Badge variant="outline">{unit.location.type}</Badge>
                          ) : (
                            <span className="text-sm text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {unit.location?.name || "—"}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <span className="text-xs text-muted-foreground">
                              {unit.is_active ? "Active" : "Inactive"}
                            </span>
                            <Switch
                              checked={unit.is_active}
                              onCheckedChange={() => handleToggleActive(unit.id, unit.is_active)}
                              aria-label={`Toggle ${unit.name} active state`}
                            />
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {!isLoading && units.length > 0 && (
              <div className="mt-4 text-sm text-muted-foreground">
                Showing {units.length} {units.length === 1 ? 'unit' : 'units'}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <UnitManager
        open={unitManagerOpen}
        onOpenChange={handleUnitManagerClose}
        residentialId={residentialId}
      />
    </div>
  );
}
