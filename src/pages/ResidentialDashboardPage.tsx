import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Navbar } from "@/components/Navbar";
import { TableSkeleton } from "@/components/LoadingStates";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { UnitTypeManager } from "@/components/UnitTypeManager";
import { UnitManager } from "@/components/UnitManager";
import { LocationManager } from "@/components/LocationManager";
import { AddonManager } from "@/components/AddonManager";
import { amenitiesService, authService, residentialUserService, unitService, unitTypeService } from "@/services";
import { useQuery } from "@/hooks";
import { useSession } from "@/state/useSession";
import type { UnitType } from "@/types/unit-wizard.types";

export function ResidentialDashboardPage({ residentialId }: { residentialId: string }) {
  const { session, isLoading: sessionLoading } = useSession();

  // Debug: Log query conditions
  if (import.meta.env.DEV) {
    console.log('🏠 Dashboard Query Conditions:', {
      residentialId,
      hasResidentialId: Boolean(residentialId),
      sessionLoading,
      hasSession: Boolean(session),
      userEmail: session?.user?.email,
      queryEnabled: Boolean(residentialId) && !sessionLoading && Boolean(session)
    });
  }

  const isQueryEnabled = Boolean(residentialId) && !sessionLoading && Boolean(session);

  const { data: units, isLoading: unitsLoading, error: unitsError, refetch: refetchUnits } = useQuery(
    () => unitService.listByResidential(residentialId),
    { enabled: isQueryEnabled },
  );

  const { data: users, isLoading: usersLoading, error: usersError, refetch: refetchUsers } = useQuery(
    () => residentialUserService.listByResidential(residentialId),
    { enabled: isQueryEnabled },
  );

  const { data: amenities, isLoading: amenitiesLoading, error: amenitiesError, refetch: refetchAmenities } = useQuery(
    () => amenitiesService.listByResidential(residentialId),
    { enabled: isQueryEnabled },
  );

  const { data: unitTypes, refetch: refetchUnitTypes } = useQuery(
    () => unitTypeService.list(residentialId),
    { enabled: isQueryEnabled },
  );

  // Debug: Log loaded data
  if (import.meta.env.DEV) {
    console.log('🏠 Dashboard Data Loaded:', {
      unitsCount: units?.length ?? 0,
      usersCount: users?.length ?? 0,
      amenitiesCount: amenities?.length ?? 0,
      unitTypesCount: unitTypes?.length ?? 0,
      unitsLoading,
      unitsError: unitsError?.message,
      units: units?.map(u => ({ id: u.id, name: u.name }))
    });
  }

  const unitTypeById = useMemo(() => {
    const map = new Map<string, UnitType>();
    for (const type of unitTypes ?? []) map.set(type.id, type);
    return map;
  }, [unitTypes]);

  const isLoading = sessionLoading || unitsLoading || usersLoading || amenitiesLoading;

  const [createAmenityOpen, setCreateAmenityOpen] = useState(false);
  const [newAmenityName, setNewAmenityName] = useState("");
  const [newAmenityDescription, setNewAmenityDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [unitTypeManagerOpen, setUnitTypeManagerOpen] = useState(false);
  const [unitManagerOpen, setUnitManagerOpen] = useState(false);
  const [locationManagerOpen, setLocationManagerOpen] = useState(false);
  const [addonManagerOpen, setAddonManagerOpen] = useState(false);

  const handleCreateAmenity = async () => {
    if (!newAmenityName.trim()) return;
    setIsSubmitting(true);
    setSubmitError(null);

    const result = await amenitiesService.create({
      residential_id: residentialId,
      name: newAmenityName.trim(),
      description: newAmenityDescription.trim() || null,
      is_active: true,
    });

    setIsSubmitting(false);

    if (!result.success) {
      setSubmitError(result.error.message);
      return;
    }

    setNewAmenityName("");
    setNewAmenityDescription("");
    setCreateAmenityOpen(false);
    await refetchAmenities();
  };

  const handleToggleUnitActive = async (id: string, currentActive: boolean) => {
    const result = await unitService.update(id, { is_active: !currentActive });
    if (result.success) await refetchUnits();
  };

  const handleToggleAmenityActive = async (id: string, currentActive: boolean) => {
    const result = await amenitiesService.update(id, { is_active: !currentActive });
    if (result.success) await refetchAmenities();
  };

  const handleRefresh = async () => {
    await Promise.all([refetchUnits(), refetchUsers(), refetchAmenities(), refetchUnitTypes()]);
  };

  return (
    <div className="min-h-screen">
      <Navbar userEmail={session?.user?.email} onSignOut={() => authService.signOut()} showUserMenu />

      <div className="mx-auto max-w-6xl px-6 py-6 space-y-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-2xl font-bold tracking-tight">Residential Dashboard</div>
            <div className="text-sm text-muted-foreground">Manage units, users, and amenities</div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={() => setUnitTypeManagerOpen(true)}>
              Unit Types
            </Button>
            <Button variant="secondary" onClick={() => setLocationManagerOpen(true)}>
              Locations
            </Button>
            <Button variant="secondary" onClick={() => setAddonManagerOpen(true)}>
              Addons
            </Button>
            <Button variant="outline" onClick={handleRefresh} disabled={isLoading}>
              Refresh
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Units</CardTitle>
              <CardDescription>View and manage units</CardDescription>
            </div>
            <Button onClick={() => setUnitManagerOpen(true)}>Add Unit</Button>
          </CardHeader>
          <CardContent>
            {unitsError ? (
              <Alert variant="destructive" className="mb-4">
                <AlertDescription>{unitsError.message}</AlertDescription>
              </Alert>
            ) : null}
            {unitsLoading ? (
              <TableSkeleton rows={3} columns={4} />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Unit</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Owner</TableHead>
                    <TableHead className="w-[120px] text-right">Active</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(units ?? []).map((unit) => (
                    <TableRow key={unit.id}>
                      <TableCell className="font-medium">{unit.name}</TableCell>
                      <TableCell>
                        {unit.unit_type_id ? (
                          <Badge variant="secondary">{unitTypeById.get(unit.unit_type_id)?.name ?? "Unknown"}</Badge>
                        ) : (
                          <span className="text-sm text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{unit.profiles?.email ?? "Unassigned"}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <span className="text-xs text-muted-foreground">{unit.is_active ? "Active" : "Inactive"}</span>
                          <Switch checked={unit.is_active} onCheckedChange={() => handleToggleUnitActive(unit.id, unit.is_active)} />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {!units?.length ? (
                    <TableRow>
                      <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                        No units yet.
                      </TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Users</CardTitle>
              <CardDescription>Members of this residential</CardDescription>
            </CardHeader>
            <CardContent>
              {usersError ? (
                <Alert variant="destructive" className="mb-4">
                  <AlertDescription>{usersError.message}</AlertDescription>
                </Alert>
              ) : null}
              {usersLoading ? (
                <TableSkeleton rows={3} columns={2} />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(users ?? []).map((u) => (
                      <TableRow key={u.user_id}>
                        <TableCell className="text-sm">{u.profiles?.email ?? "Unknown"}</TableCell>
                        <TableCell>
                          <Badge variant={u.role === "admin" ? "default" : "secondary"}>{u.role}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                    {!users?.length ? (
                      <TableRow>
                        <TableCell colSpan={2} className="py-8 text-center text-muted-foreground">
                          No users found.
                        </TableCell>
                      </TableRow>
                    ) : null}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Amenities</CardTitle>
                <CardDescription>Facilities for residents</CardDescription>
              </div>
              <Button variant="secondary" onClick={() => setCreateAmenityOpen(true)}>
                Add
              </Button>
            </CardHeader>
            <CardContent>
              {amenitiesError ? (
                <Alert variant="destructive" className="mb-4">
                  <AlertDescription>{amenitiesError.message}</AlertDescription>
                </Alert>
              ) : null}
              {amenitiesLoading ? (
                <TableSkeleton rows={3} columns={2} />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead className="w-[120px] text-right">Active</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(amenities ?? []).map((a) => (
                      <TableRow key={a.id}>
                        <TableCell className="font-medium">{a.name}</TableCell>
                        <TableCell className="text-right">
                          <Switch checked={a.is_active} onCheckedChange={() => handleToggleAmenityActive(a.id, a.is_active)} />
                        </TableCell>
                      </TableRow>
                    ))}
                    {!amenities?.length ? (
                      <TableRow>
                        <TableCell colSpan={2} className="py-8 text-center text-muted-foreground">
                          No amenities yet.
                        </TableCell>
                      </TableRow>
                    ) : null}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={createAmenityOpen} onOpenChange={setCreateAmenityOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Amenity</DialogTitle>
            <DialogDescription>Add a shared facility</DialogDescription>
          </DialogHeader>
          {submitError ? (
            <Alert variant="destructive">
              <AlertDescription>{submitError}</AlertDescription>
            </Alert>
          ) : null}
          <div className="space-y-3 py-2">
            <Input value={newAmenityName} onChange={(e) => setNewAmenityName(e.target.value)} placeholder="Name" disabled={isSubmitting} />
            <Input value={newAmenityDescription} onChange={(e) => setNewAmenityDescription(e.target.value)} placeholder="Description (optional)" disabled={isSubmitting} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateAmenityOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button onClick={handleCreateAmenity} disabled={isSubmitting || !newAmenityName.trim()}>
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <UnitTypeManager open={unitTypeManagerOpen} onOpenChange={setUnitTypeManagerOpen} residentialId={residentialId} />
      <UnitManager open={unitManagerOpen} onOpenChange={setUnitManagerOpen} residentialId={residentialId} />
      <LocationManager open={locationManagerOpen} onOpenChange={setLocationManagerOpen} residentialId={residentialId} />
      <AddonManager open={addonManagerOpen} onOpenChange={setAddonManagerOpen} residentialId={residentialId} />
    </div>
  );
}
