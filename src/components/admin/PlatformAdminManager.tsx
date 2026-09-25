/**
 * Platform-admin panel for managing who has platform_admin access — list,
 * add by email (find_profile_id_by_email RPC, same lookup UserRoleManager
 * uses), remove. platform_admins has no role tiers (flat allow-list), so
 * unlike UserRoleManager there's no role selector.
 */

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Spinner } from "@/components/LoadingStates";
import { DeleteIcon } from "@/components/icons";
import { confirmDeleteToast } from "@/lib/confirmDeleteToast";
import { platformAdminService, type PlatformAdminWithProfile } from "@/services";
import { useI18n } from "@/i18n/useI18n";

export function PlatformAdminManager({ currentUserId }: { currentUserId?: string }) {
  const { t } = useI18n();
  const [admins, setAdmins] = useState<PlatformAdminWithProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [email, setEmail] = useState("");

  const load = async () => {
    setIsLoading(true);
    const result = await platformAdminService.list();
    if (result.success) {
      setAdmins(result.data);
    } else {
      toast.error(result.error.message);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    void load();
  }, []);

  const handleAdd = async () => {
    if (!email.trim()) return;
    setIsSubmitting(true);
    const result = await platformAdminService.addByEmail(email.trim());
    setIsSubmitting(false);

    if (!result.success) {
      toast.error(result.error.message);
      return;
    }
    if (!result.data) {
      toast.error(t("platformAdmin.admins.noAccountFound"));
      return;
    }

    toast.success(t("platformAdmin.admins.added"));
    setEmail("");
    await load();
  };

  const handleRemove = (userId: string, adminEmail: string) => {
    confirmDeleteToast(adminEmail, async () => {
      const result = await platformAdminService.remove(userId);
      if (!result.success) {
        toast.error(result.error.message);
        return;
      }
      await load();
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-end gap-2">
        <Input
          label={t("platformAdmin.admins.addByEmail.label")}
          type="email"
          placeholder={t("platformAdmin.admins.addByEmail.placeholder")}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={isSubmitting}
          className="flex-1"
        />
        <Button onClick={handleAdd} disabled={isSubmitting || !email.trim()}>
          {isSubmitting ? <Spinner size="sm" /> : t("common.add")}
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <Spinner />
        </div>
      ) : admins.length === 0 ? (
        <div className="py-8 text-center text-sm text-muted-foreground">{t("platformAdmin.admins.empty")}</div>
      ) : (
        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("common.email")}</TableHead>
                <TableHead className="text-right">{t("common.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {admins.map((admin) => {
                const isSelf = admin.user_id === currentUserId;
                return (
                  <TableRow key={admin.user_id}>
                    <TableCell className="text-sm">
                      {admin.profiles?.email ?? t("settings.users.unknownEmail")}
                      {isSelf ? (
                        <span className="ml-2 text-xs text-muted-foreground">
                          {t("platformAdmin.admins.you")}
                        </span>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={isSubmitting || isSelf}
                        title={isSelf ? t("platformAdmin.admins.cannotRemoveSelf") : undefined}
                        onClick={() =>
                          handleRemove(admin.user_id, admin.profiles?.email ?? t("settings.users.unnamedMember"))
                        }
                      >
                        <DeleteIcon />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
