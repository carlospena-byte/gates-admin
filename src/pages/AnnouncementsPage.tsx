/**
 * Announcements page — draft, publish, and manage community-wide posts.
 * Only owner/admin manage this module (no security/member self-service,
 * unlike Visitors/Incidents — announcements are an admin communication
 * tool, not something any resident files).
 */

import { useState } from "react";
import { IconRefresh } from "@tabler/icons-react";
import { AppSidebar } from "@/components/AppSidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AddAnnouncementSheet, type NewAnnouncementFields } from "@/components/announcements/AddAnnouncementSheet";
import { AnnouncementTable } from "@/components/announcements/AnnouncementTable";
import { authService } from "@/services";
import { useSession } from "@/state/useSession";
import { canManageResidential } from "@/state/useAccess";
import { useAnnouncementManagerData, type AnnouncementFormPayload } from "@/hooks/useAnnouncementManagerData";
import { useI18n } from "@/i18n/useI18n";
import type { ResidentialRole } from "@/types/database.types";

export function AnnouncementsPage({ residentialId, role }: { residentialId: string; role: ResidentialRole }) {
  const { t } = useI18n();
  const { session } = useSession();
  const canManage = canManageResidential(role);
  const [sheetOpen, setSheetOpen] = useState(false);

  const { announcements, isLoading, isSubmitting, reload, createAnnouncement, publish, unpublish, deleteAnnouncement } =
    useAnnouncementManagerData(residentialId);

  const handleCreate = async (fields: NewAnnouncementFields): Promise<boolean> => {
    const payload: AnnouncementFormPayload = {
      title: fields.title.trim(),
      content: fields.content.trim(),
      category: fields.category.trim(),
      audience: fields.audience,
      publishAt: fields.publishAt ? new Date(fields.publishAt).toISOString() : null,
      createdBy: session?.user?.id ?? null,
    };
    return createAnnouncement(payload);
  };

  return (
    <div className="min-h-screen">
      <AppSidebar userEmail={session?.user?.email} residentialId={residentialId} role={role} onSignOut={() => authService.signOut()} showUserMenu />

      <div className="lg:pl-64">
        <div className="mx-auto max-w-7xl px-6 py-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>{t("announcements.page.title")}</CardTitle>
                <CardDescription>{t("announcements.page.description")}</CardDescription>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={reload} disabled={isLoading}>
                  <IconRefresh className="h-4 w-4" />
                </Button>
                {canManage && <Button onClick={() => setSheetOpen(true)}>{t("announcements.page.newAnnouncement")}</Button>}
              </div>
            </CardHeader>
            <CardContent>
              <AnnouncementTable
                announcements={announcements}
                isLoading={isLoading}
                isSubmitting={isSubmitting}
                canManage={canManage}
                onPublish={publish}
                onUnpublish={unpublish}
                onDelete={deleteAnnouncement}
              />
            </CardContent>
          </Card>
        </div>
      </div>

      <AddAnnouncementSheet open={sheetOpen} onOpenChange={setSheetOpen} isSubmitting={isSubmitting} onCreate={handleCreate} />
    </div>
  );
}
