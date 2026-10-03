/**
 * Bulletins page — write, publish and manage resident-facing bulletins
 * (title + rich text + images + PDFs). Owner/admin only, like Announcements.
 */

import { useState } from "react";
import { IconRefresh } from "@tabler/icons-react";
import { AppSidebar } from "@/components/AppSidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BulletinFormSheet } from "@/components/bulletins/BulletinFormSheet";
import { BulletinTable } from "@/components/bulletins/BulletinTable";
import { authService } from "@/services";
import { useSession } from "@/state/useSession";
import { canManageResidential } from "@/state/useAccess";
import { useBulletinManagerData } from "@/hooks/useBulletinManagerData";
import { useI18n } from "@/i18n/useI18n";
import { useCreateIntent } from "@/lib/createIntent";
import { SectionTabs } from "@/components/SectionTabs";
import type { ResidentialRole } from "@/types/database.types";
import type { BulletinWithAttachments } from "@/types/bulletin.types";

export function BulletinsPage({ residentialId, role }: { residentialId: string; role: ResidentialRole }) {
  const { t } = useI18n();
  const { session } = useSession();
  const canManage = canManageResidential(role);
  const [sheetOpen, setSheetOpen] = useState(false);
  useCreateIntent("bulletin", () => setSheetOpen(true));
  const [editing, setEditing] = useState<BulletinWithAttachments | null>(null);

  const { bulletins, isLoading, isSubmitting, reload, saveBulletin, setStatus, deleteBulletin } =
    useBulletinManagerData(residentialId, session?.user?.id ?? null);

  const openCreate = () => {
    setEditing(null);
    setSheetOpen(true);
  };

  const openEdit = (bulletin: BulletinWithAttachments) => {
    setEditing(bulletin);
    setSheetOpen(true);
  };

  return (
    <div className="min-h-screen">
      <AppSidebar userEmail={session?.user?.email} residentialId={residentialId} role={role} onSignOut={() => authService.signOut()} showUserMenu />

      <div className="lg:pl-64">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
          <SectionTabs section="communications" role={role} />
          <Card>
            <CardHeader className="flex flex-col gap-3 space-y-0 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle>{t("bulletins.page.title")}</CardTitle>
                <CardDescription>{t("bulletins.page.description")}</CardDescription>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="icon" aria-label={t("common.refresh")} onClick={reload} disabled={isLoading}>
                  <IconRefresh className="h-4 w-4" />
                </Button>
                {canManage && <Button onClick={openCreate}>{t("bulletins.page.newBulletin")}</Button>}
              </div>
            </CardHeader>
            <CardContent>
              <BulletinTable
                bulletins={bulletins}
                isLoading={isLoading}
                isSubmitting={isSubmitting}
                canManage={canManage}
                onEdit={openEdit}
                onPublish={(id) => void setStatus(id, "published")}
                onUnpublish={(id) => void setStatus(id, "draft")}
                onDelete={deleteBulletin}
              />
            </CardContent>
          </Card>
        </div>
      </div>

      <BulletinFormSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        bulletin={editing}
        isSubmitting={isSubmitting}
        onSave={(values) => saveBulletin(editing, values)}
      />
    </div>
  );
}
