import { useEffect, useState } from "react";
import { IconBell } from "@tabler/icons-react";

import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AppSidebar } from "@/components/AppSidebar";
import { TableSkeleton } from "@/components/LoadingStates";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { SummaryStat } from "@/components/ui/summary-stat";
import { UnitTypeManager } from "@/components/UnitTypeManager";
import { UnitManager } from "@/components/UnitManager";
import { UnitTable } from "@/components/units/UnitTable";
import { LocationManager } from "@/components/LocationManager";
import { AddonManager } from "@/components/AddonManager";
import { ChargeManager } from "@/components/ChargeManager";
import { ActivityLogManager } from "@/components/ActivityLogManager";
import { AmenityFormSheet } from "@/components/amenities/AmenityFormSheet";
import { ServiceManager } from "@/components/amenities/ServiceManager";
import { ProviderManager } from "@/components/providers/ProviderManager";
import { EditIcon } from "@/components/icons";
import {
  amenitiesService,
  amenityImageService,
  authService,
  dashboardMetricsService,
  residentialUserService,
} from "@/services";
import { useQuery } from "@/hooks";
import { useUnitManagerData } from "@/hooks/useUnitManagerData";
import { useSession } from "@/state/useSession";
import { canManageResidential } from "@/state/useAccess";
import { navigateTo } from "@/config/routes";
import { OperationalMetricsRow } from "@/components/dashboard/OperationalMetricsRow";
import { AttentionCards } from "@/components/dashboard/AttentionCards";
import { RecentActivityCard } from "@/components/dashboard/RecentActivityCard";
import { useI18n } from "@/i18n/useI18n";
import type { ResidentialRole } from "@/types/database.types";

export function ResidentialDashboardPage({
  residentialId,
  role,
}: {
  residentialId: string;
  role: ResidentialRole;
}) {
  const { t, locale } = useI18n();
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

  const [amenityFormOpen, setAmenityFormOpen] = useState(false);
  const [editingAmenityId, setEditingAmenityId] = useState<string | null>(null);
  const [amenityThumbnails, setAmenityThumbnails] = useState<Record<string, string>>({});

  const [unitTypeManagerOpen, setUnitTypeManagerOpen] = useState(false);
  const [unitManagerOpen, setUnitManagerOpen] = useState(false);
  const [locationManagerOpen, setLocationManagerOpen] = useState(false);
  const [addonManagerOpen, setAddonManagerOpen] = useState(false);
  const [chargeManagerOpen, setChargeManagerOpen] = useState(false);
  const [serviceManagerOpen, setServiceManagerOpen] = useState(false);
  const [providerManagerOpen, setProviderManagerOpen] = useState(false);
  const [activityLogOpen, setActivityLogOpen] = useState(false);

  useEffect(() => {
    if (!amenities?.length) {
      setAmenityThumbnails({});
      return;
    }

    let cancelled = false;
    void (async () => {
      const result = await amenityImageService.listPrimaryByResidential(residentialId);
      if (!result.success || cancelled) return;

      const entries = await Promise.all(
        result.data.map(async (img) => {
          const signed = await amenityImageService.getSignedUrl(img.storage_path);
          return [img.amenity_id, signed.success ? signed.data : null] as const;
        }),
      );
      if (cancelled) return;
      setAmenityThumbnails(Object.fromEntries(entries.filter(([, url]) => url)) as Record<string, string>);
    })();

    return () => {
      cancelled = true;
    };
  }, [amenities, residentialId]);

  const openCreateAmenity = () => {
    setEditingAmenityId(null);
    setAmenityFormOpen(true);
  };

  const openEditAmenity = (id: string) => {
    setEditingAmenityId(id);
    setAmenityFormOpen(true);
  };

  const handleToggleAmenityActive = async (id: string, currentActive: boolean) => {
    const result = await amenitiesService.update(id, { is_active: !currentActive });
    if (result.success) await refetchAmenities();
  };

  const handleRefresh = async () => {
    await Promise.all([reloadUnits(), refetchUsers(), refetchAmenities(), refetchMetrics()]);
  };

  const todayLabel = new Date().toLocaleDateString(locale === "es" ? "es-ES" : "en-US", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const unassignedUnits = Math.max(0, (metrics?.activeProperties ?? 0) - (metrics?.activeResidents ?? 0));

  return (
    <div className="min-h-screen bg-gates-canvas">
      <AppSidebar userEmail={session?.user?.email} residentialId={residentialId} role={role} onSignOut={() => authService.signOut()} showUserMenu />

      <div className="lg:pl-64">
        <div className="mx-auto max-w-7xl px-6 py-6 space-y-6">
          <div className="flex items-center gap-4">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium uppercase tracking-tight text-gates-text-brand">
                {t("dashboard.residential.title")}
              </p>
              <p className="text-sm capitalize text-gates-text-secondary">{todayLabel}</p>
            </div>
            <span
              aria-hidden
              className="flex size-11 items-center justify-center rounded-full bg-gates-surface shadow-gates-card"
            >
              <IconBell className="size-5 text-gates-text-primary" />
            </span>
            <Avatar name={session?.user?.email ?? "U"} size="sm" />
          </div>

          <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
            <div className="min-w-0 flex-1">
              <h1 className="text-[32px] font-medium leading-[40px] tracking-[-0.8px] text-gates-text-primary">
                {t("dashboard.hero.title")}
              </h1>
              <p className="text-base text-gates-text-secondary">{t("dashboard.hero.subtitle")}</p>
            </div>
            {canManage && (
              <Button size="xl" onClick={() => navigateTo("residents")}>
                + {t("dashboard.hero.inviteResident")}
              </Button>
            )}
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-4">
              <p className="text-sm font-semibold text-gates-text-primary">{t("dashboard.today.title")}</p>
              <div className="flex-1" />
              <p className="text-xs text-gates-text-secondary">{t("dashboard.today.updated")}</p>
            </div>
            <OperationalMetricsRow metrics={metrics ?? null} />
          </div>

          <AttentionCards
            metrics={metrics ?? null}
            unassignedUnits={unassignedUnits}
            onViewActivity={() => setActivityLogOpen(true)}
          />

          <div className="grid gap-6 lg:grid-cols-[1fr_1.6fr]">
            <div className="flex flex-col gap-5 rounded-gates-lg bg-gates-surface p-6 shadow-gates-card">
              <p className="text-xl font-semibold text-gates-text-primary">{t("dashboard.yourResidential.title")}</p>
              <div className="grid grid-cols-2 gap-4">
                <SummaryStat
                  className="bg-gates-canvas"
                  title={t("dashboard.yourResidential.units")}
                  value={String(metrics?.activeProperties ?? 0)}
                  detail={t("dashboard.yourResidential.unitsDetail")}
                />
                <SummaryStat
                  className="bg-gates-canvas"
                  title={t("dashboard.yourResidential.residents")}
                  value={String(metrics?.activeResidents ?? 0)}
                  detail={t("dashboard.yourResidential.residentsDetail")}
                />
              </div>
              <div className="flex flex-wrap gap-3">
                <Button variant="secondary" onClick={() => navigateTo("units")}>
                  {t("dashboard.yourResidential.viewUnits")}
                </Button>
                {canManage && (
                  <Button variant="secondary" onClick={() => setUnitManagerOpen(true)}>
                    + {t("dashboard.residential.addUnit")}
                  </Button>
                )}
              </div>
            </div>

            <RecentActivityCard residentialId={residentialId} onViewAll={() => setActivityLogOpen(true)} />
          </div>

          <div className="flex items-center justify-between gap-3 pt-2">
            <div className="text-lg font-semibold tracking-tight">{t("dashboard.management.title")}</div>
            <div className="flex flex-wrap items-center gap-2">
              {canManage && (
                <>
                  <Button variant="secondary" onClick={() => setUnitTypeManagerOpen(true)}>
                    {t("dashboard.residential.unitTypes")}
                  </Button>
                  <Button variant="secondary" onClick={() => setLocationManagerOpen(true)}>
                    {t("dashboard.residential.locations")}
                  </Button>
                  <Button variant="secondary" onClick={() => setAddonManagerOpen(true)}>
                    {t("dashboard.residential.addons")}
                  </Button>
                  <Button variant="secondary" onClick={() => setChargeManagerOpen(true)}>
                    {t("dashboard.residential.charges")}
                  </Button>
                  <Button variant="secondary" onClick={() => setServiceManagerOpen(true)}>
                    {t("dashboard.residential.services")}
                  </Button>
                  <Button variant="secondary" onClick={() => setProviderManagerOpen(true)}>
                    {t("dashboard.residential.providers")}
                  </Button>
                  <Button variant="secondary" onClick={() => setActivityLogOpen(true)}>
                    {t("dashboard.residential.activityLog")}
                  </Button>
                </>
              )}
              <Button variant="outline" onClick={handleRefresh} disabled={isLoading}>
                {t("common.refresh")}
              </Button>
            </div>
          </div>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>{t("common.units")}</CardTitle>
                <CardDescription>{t("dashboard.residential.units.description")}</CardDescription>
              </div>
              {canManage && <Button onClick={() => setUnitManagerOpen(true)}>{t("dashboard.residential.addUnit")}</Button>}
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
                <CardTitle>{t("common.users")}</CardTitle>
                <CardDescription>{t("dashboard.residential.users.description")}</CardDescription>
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
                        <TableHead>{t("common.email")}</TableHead>
                        <TableHead>{t("common.role")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(users ?? []).map((u) => (
                        <TableRow key={u.user_id}>
                          <TableCell className="text-sm">
                            {u.profiles?.email ?? t("settings.users.unknownEmail")}
                          </TableCell>
                          <TableCell>
                            <Badge variant={u.role === "admin" ? "default" : "secondary"}>{u.role}</Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                      {!users?.length ? (
                        <TableRow>
                          <TableCell colSpan={2} className="py-8 text-center text-muted-foreground">
                            {t("dashboard.residential.users.empty")}
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
                  <CardTitle>{t("dashboard.residential.amenities.title")}</CardTitle>
                  <CardDescription>{t("dashboard.residential.amenities.description")}</CardDescription>
                </div>
                {canManage && <Button onClick={openCreateAmenity}>{t("common.add")}</Button>}
              </CardHeader>
              <CardContent>
                {amenitiesError ? (
                  <Alert variant="destructive" className="mb-4">
                    <AlertDescription>{amenitiesError.message}</AlertDescription>
                  </Alert>
                ) : null}
                {amenitiesLoading ? (
                  <TableSkeleton rows={3} columns={3} />
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[56px]" />
                        <TableHead>{t("common.name")}</TableHead>
                        <TableHead className="w-[100px] text-right">{t("common.active")}</TableHead>
                        <TableHead className="w-[60px] text-right">{t("common.edit")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(amenities ?? []).map((a) => (
                        <TableRow key={a.id}>
                          <TableCell>
                            {amenityThumbnails[a.id] ? (
                              <img
                                src={amenityThumbnails[a.id]}
                                alt=""
                                className="h-9 w-9 rounded-md object-cover"
                              />
                            ) : (
                              <div className="h-9 w-9 rounded-md bg-muted" />
                            )}
                          </TableCell>
                          <TableCell className="font-medium">{a.name}</TableCell>
                          <TableCell className="text-right">
                            <Switch
                              checked={a.is_active}
                              onCheckedChange={() => handleToggleAmenityActive(a.id, a.is_active)}
                              disabled={!canManage}
                            />
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => openEditAmenity(a.id)}
                              disabled={!canManage}
                            >
                              <EditIcon />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                      {!amenities?.length ? (
                        <TableRow>
                          <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                            {t("dashboard.residential.amenities.empty")}
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

      <AmenityFormSheet
        open={amenityFormOpen}
        onOpenChange={setAmenityFormOpen}
        residentialId={residentialId}
        amenityId={editingAmenityId}
        onSaved={refetchAmenities}
      />
      <ServiceManager open={serviceManagerOpen} onOpenChange={setServiceManagerOpen} residentialId={residentialId} />
      <ProviderManager open={providerManagerOpen} onOpenChange={setProviderManagerOpen} residentialId={residentialId} />

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
