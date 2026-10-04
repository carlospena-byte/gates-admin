/**
 * "Comunicados" page — a dedicated push notification composer + history.
 * Every notification carries a deeplink destination the mobile app opens on
 * tap. Only owner/admin manage this module.
 */

import { useState } from "react";
import { IconRefresh } from "@tabler/icons-react";
import { AppSidebar } from "@/components/AppSidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PushComposeSheet } from "@/components/announcements/PushComposeSheet";
import { PushNotificationTable } from "@/components/announcements/PushNotificationTable";
import { authService } from "@/services";
import { useSession } from "@/state/useSession";
import { canManageResidential } from "@/state/useAccess";
import { usePushNotificationManagerData } from "@/hooks/usePushNotificationManagerData";
import { useI18n } from "@/i18n/useI18n";
import { useCreateIntent } from "@/lib/createIntent";
import { SectionTabs } from "@/components/SectionTabs";
import type { ResidentialRole } from "@/types/database.types";

export function AnnouncementsPage({ residentialId, role }: { residentialId: string; role: ResidentialRole }) {
  const { t } = useI18n();
  const { session } = useSession();
  const canManage = canManageResidential(role);
  const [sheetOpen, setSheetOpen] = useState(false);
  useCreateIntent("announcement", () => setSheetOpen(true));

  const { notifications, isLoading, isSubmitting, reload, create, sendExisting, resend, deleteNotification } =
    usePushNotificationManagerData(residentialId);

  return (
    <div className="min-h-screen">
      <AppSidebar userEmail={session?.user?.email} residentialId={residentialId} role={role} onSignOut={() => authService.signOut()} showUserMenu />

      <div className="lg:pl-64">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
          <SectionTabs section="communications" role={role} />
          <Card>
            <CardHeader className="flex flex-col gap-3 space-y-0 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle>{t("announcements.page.title")}</CardTitle>
                <CardDescription>{t("announcements.page.description")}</CardDescription>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="icon" aria-label={t("common.refresh")} onClick={reload} disabled={isLoading}>
                  <IconRefresh className="h-4 w-4" />
                </Button>
                {canManage && <Button onClick={() => setSheetOpen(true)}>{t("announcements.page.new")}</Button>}
              </div>
            </CardHeader>
            <CardContent>
              <PushNotificationTable
                notifications={notifications}
                isLoading={isLoading}
                isSubmitting={isSubmitting}
                canManage={canManage}
                onSendNow={sendExisting}
                onResend={(n) => resend(n, session?.user?.id ?? null)}
                onDelete={deleteNotification}
              />
            </CardContent>
          </Card>
        </div>
      </div>

      <PushComposeSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        residentialId={residentialId}
        createdBy={session?.user?.id ?? null}
        isSubmitting={isSubmitting}
        onSubmit={create}
      />
    </div>
  );
}
