import { useEffect, useState } from "react";
import { IconRefresh } from "@tabler/icons-react";
import { toast } from "sonner";

import { AppSidebar } from "@/components/AppSidebar";
import { SectionTabs } from "@/components/SectionTabs";
import { TableSkeleton } from "@/components/LoadingStates";
import { AmenityFormSheet } from "@/components/amenities/AmenityFormSheet";
import { ServiceManager } from "@/components/amenities/ServiceManager";
import { DeleteIcon, EditIcon } from "@/components/icons";
import { ProviderManager } from "@/components/providers/ProviderManager";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useQuery } from "@/hooks";
import { useI18n } from "@/i18n/useI18n";
import { confirmDeleteToast } from "@/lib/confirmDeleteToast";
import { useCreateIntent } from "@/lib/createIntent";
import { amenitiesService, amenityImageService, authService } from "@/services";
import { canManageResidential } from "@/state/useAccess";
import { useSession } from "@/state/useSession";
import type { ResidentialRole } from "@/types/database.types";

export function AmenitiesPage({ residentialId, role }: { residentialId: string; role: ResidentialRole }) {
  const { t } = useI18n();
  const { session } = useSession();
  const canManage = canManageResidential(role);

  const {
    data: amenities,
    isLoading,
    error,
    refetch,
  } = useQuery(() => amenitiesService.listByResidential(residentialId));

  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [serviceManagerOpen, setServiceManagerOpen] = useState(false);
  const [providerManagerOpen, setProviderManagerOpen] = useState(false);
  const [thumbnails, setThumbnails] = useState<Record<string, string>>({});

  const openCreate = () => {
    setEditingId(null);
    setFormOpen(true);
  };
  useCreateIntent("amenity", openCreate);

  useEffect(() => {
    if (!amenities?.length) {
      setThumbnails({});
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
      setThumbnails(Object.fromEntries(entries.filter(([, url]) => url)) as Record<string, string>);
    })();

    return () => {
      cancelled = true;
    };
  }, [amenities, residentialId]);

  const handleToggleActive = async (id: string, currentActive: boolean) => {
    const result = await amenitiesService.update(id, { is_active: !currentActive });
    if (result.success) await refetch();
  };

  const handleDelete = (id: string, name: string) => {
    confirmDeleteToast(
      name,
      async () => {
        const result = await amenitiesService.delete(id);
        if (result.success) await refetch();
        else toast.error(result.error.message);
      },
      t("dashboard.residential.amenities.deleteWarning"),
    );
  };

  return (
    <div className="min-h-screen">
      <AppSidebar userEmail={session?.user?.email} residentialId={residentialId} role={role} onSignOut={() => authService.signOut()} showUserMenu />

      <div className="lg:pl-64">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
          <SectionTabs section="operations" role={role} />
          <Card>
            <CardHeader className="flex flex-col gap-3 space-y-0 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle>{t("dashboard.residential.amenities.title")}</CardTitle>
                <CardDescription>{t("dashboard.residential.amenities.description")}</CardDescription>
              </div>
              <div className="flex flex-wrap justify-end gap-2">
                <Button variant="outline" size="icon" aria-label={t("common.refresh")} onClick={() => void refetch()} disabled={isLoading}>
                  <IconRefresh className="h-4 w-4" />
                </Button>
                {canManage && (
                  <>
                    <Button variant="secondary" onClick={() => setServiceManagerOpen(true)}>
                      {t("dashboard.residential.services")}
                    </Button>
                    <Button variant="secondary" onClick={() => setProviderManagerOpen(true)}>
                      {t("dashboard.residential.providers")}
                    </Button>
                    <Button onClick={openCreate}>{t("common.add")}</Button>
                  </>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {error ? (
                <Alert variant="destructive" className="mb-4">
                  <AlertDescription>{error.message}</AlertDescription>
                </Alert>
              ) : null}
              {isLoading ? (
                <TableSkeleton rows={4} columns={4} />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[56px]" />
                      <TableHead>{t("common.name")}</TableHead>
                      <TableHead className="w-[100px] text-right">{t("common.active")}</TableHead>
                      <TableHead className="w-[110px] text-right">{t("common.edit")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(amenities ?? []).map((a) => (
                      <TableRow key={a.id}>
                        <TableCell>
                          {thumbnails[a.id] ? (
                            <img src={thumbnails[a.id]} alt="" className="h-9 w-9 rounded-md object-cover" />
                          ) : (
                            <div className="h-9 w-9 rounded-md bg-muted" />
                          )}
                        </TableCell>
                        <TableCell className="font-medium">{a.name}</TableCell>
                        <TableCell className="text-right">
                          <Switch
                            checked={a.is_active}
                            onCheckedChange={() => handleToggleActive(a.id, a.is_active)}
                            disabled={!canManage}
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setEditingId(a.id);
                              setFormOpen(true);
                            }}
                            disabled={!canManage}
                          >
                            <EditIcon />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => handleDelete(a.id, a.name)} disabled={!canManage}>
                            <DeleteIcon />
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

      <AmenityFormSheet
        open={formOpen}
        onOpenChange={setFormOpen}
        residentialId={residentialId}
        amenityId={editingId}
        onSaved={refetch}
      />
      <ServiceManager open={serviceManagerOpen} onOpenChange={setServiceManagerOpen} residentialId={residentialId} />
      <ProviderManager open={providerManagerOpen} onOpenChange={setProviderManagerOpen} residentialId={residentialId} />
    </div>
  );
}
