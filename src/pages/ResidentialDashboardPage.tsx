import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AppSidebar } from "@/components/AppSidebar";
import { TableSkeleton } from "@/components/LoadingStates";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { UnitTypeManager } from "@/components/UnitTypeManager";
import { UnitManager } from "@/components/UnitManager";
import { UnitTable } from "@/components/units/UnitTable";
import { LocationManager } from "@/components/LocationManager";
import { AddonManager } from "@/components/AddonManager";
import { ChargeManager } from "@/components/ChargeManager";
import { ActivityLogManager } from "@/components/ActivityLogManager";
import { amenitiesService, authService, dashboardMetricsService, residentialUserService } from "@/services";
import { useQuery } from "@/hooks";
import { useUnitManagerData } from "@/hooks/useUnitManagerData";
import { useSession } from "@/state/useSession";
import { canManageResidential } from "@/state/useAccess";
import { OperationalMetricsRow } from "@/components/dashboard/OperationalMetricsRow";
import { RecentActivityCard } from "@/components/dashboard/RecentActivityCard";
import type { ResidentialRole } from "@/types/database.types";

export function ResidentialDashboardPage({
  residentialId,
  role,
}: {
  residentialId: string;
  role: ResidentialRole;
}) {
  const { session, isLoading: sessionLoading } = useSession();
  const canManage = canManageResidential(role);

  const isQueryEnabled = Boolean(residentialId) && !sessionLoading && Boolean(session);

  const {
    units,
    locations: unitLocations,
    isLoading: unitsLoading,
    isSubmitting: isUnitMutating,
    reload: reloadUnits,
    deleteUnit,
    toggleActive: toggleUnitActive,
  } = useUnitManagerData(residentialId, isQueryEnabled, true);

  const { data: users, isLoading: usersLoading, error: usersError, refetch: refetchUsers } = useQuery(
    () => residentialUserService.listByResidential(residentialId),
    { enabled: isQueryEnabled },
  );

  const { data: amenities, isLoading: amenitiesLoading, error: amenitiesError, refetch: refetchAmenities } = useQuery(
    () => amenitiesService.listByResidential(residentialId),
    { enabled: isQueryEnabled },
  );

  const { data: metrics, refetch: refetchMetrics } = useQuery(
    () => dashboardMetricsService.getOperationalMetrics(residentialId),
    { enabled: isQueryEnabled },
  );

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
  const [chargeManagerOpen, setChargeManagerOpen] = useState(false);
  const [activityLogOpen, setActivityLogOpen] = useState(false);

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

  const handleToggleAmenityActive = async (id: string, currentActive: boolean) => {
    const result = await amenitiesService.update(id, { is_active: !currentActive });
    if (result.success) await refetchAmenities();
  };

  const handleRefresh = async () => {
    await Promise.all([reloadUnits(), refetchUsers(), refetchAmenities(), refetchMetrics()]);
  };

  return (
    <div className="min-h-screen">
      <AppSidebar userEmail={session?.user?.email} onSignOut={() => authService.signOut()} showUserMenu />

      <div className="lg:pl-64">
        <div className="mx-auto max-w-6xl px-6 py-6 space-y-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-2xl font-bold tracking-tight">Residential Dashboard</div>
              <div className="text-sm text-muted-foreground">Manage units, users, and amenities</div>
            </div>
            <div className="flex items-center gap-2">
              {canManage && (
                <>
                  <Button variant="secondary" onClick={() => setUnitTypeManagerOpen(true)}>
                    Unit Types
                  </Button>
                  <Button variant="secondary" onClick={() => setLocationManagerOpen(true)}>
                    Locations
                  </Button>
                  <Button variant="secondary" onClick={() => setAddonManagerOpen(true)}>
                    Addons
                  </Button>
                  <Button variant="secondary" onClick={() => setChargeManagerOpen(true)}>
                    Charges
                  </Button>
                  <Button variant="secondary" onClick={() => setActivityLogOpen(true)}>
                    Activity Log
                  </Button>
                </>
              )}
              <Button variant="outline" onClick={handleRefresh} disabled={isLoading}>
                Refresh
              </Button>
            </div>
          </div>

          <OperationalMetricsRow metrics={metrics ?? null} />

          <RecentActivityCard residentialId={residentialId} />

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Units</CardTitle>
                <CardDescription>View and manage units</CardDescription>
              </div>
              {canManage && <Button onClick={() => setUnitManagerOpen(true)}>Add Unit</Button>}
            </CardHeader>
            <CardContent>
              <UnitTable
                units={units}
                locations={unitLocations}
                isLoading={unitsLoading}
                isSubmitting={isUnitMutating}
                canManage={canManage}
                onDelete={deleteUnit}
                onToggleActive={toggleUnitActive}
              />
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
                {canManage && (
                  <Button variant="secondary" onClick={() => setCreateAmenityOpen(true)}>
                    Add
                  </Button>
                )}
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
                            <Switch
                              checked={a.is_active}
                              onCheckedChange={() => handleToggleAmenityActive(a.id, a.is_active)}
                              disabled={!canManage}
                            />
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
            <Input label="Name" value={newAmenityName} onChange={(e) => setNewAmenityName(e.target.value)} disabled={isSubmitting} />
            <Input label="Description (optional)" value={newAmenityDescription} onChange={(e) => setNewAmenityDescription(e.target.value)} disabled={isSubmitting} />
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
      <UnitManager
        open={unitManagerOpen}
        onOpenChange={setUnitManagerOpen}
        residentialId={residentialId}
        showList={false}
        onUnitCreated={reloadUnits}
      />
      <LocationManager open={locationManagerOpen} onOpenChange={setLocationManagerOpen} residentialId={residentialId} />
      <AddonManager open={addonManagerOpen} onOpenChange={setAddonManagerOpen} residentialId={residentialId} />
      <ChargeManager open={chargeManagerOpen} onOpenChange={setChargeManagerOpen} residentialId={residentialId} />
      <ActivityLogManager open={activityLogOpen} onOpenChange={setActivityLogOpen} residentialId={residentialId} />
    </div>
  );
}
