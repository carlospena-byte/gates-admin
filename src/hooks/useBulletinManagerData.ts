/**
 * Data fetching and mutations for the Bulletins page. Same shape as
 * useAnnouncementManagerData.ts, plus attachment reconciliation and the
 * publish-time push notification.
 */

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { bulletinAttachmentService, bulletinService } from "@/services";
import { useI18n } from "@/i18n/useI18n";
import type { BulletinFormValues } from "@/components/bulletins/BulletinFormSheet";
import type { BulletinWithAttachments } from "@/types/bulletin.types";

export function useBulletinManagerData(residentialId: string, userId: string | null) {
  const { t } = useI18n();
  const [bulletins, setBulletins] = useState<BulletinWithAttachments[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const reload = useCallback(async () => {
    setIsLoading(true);
    const result = await bulletinService.list(residentialId);
    setIsLoading(false);

    if (result.success) {
      setBulletins(result.data);
    } else {
      toast.error(result.error.message);
    }
  }, [residentialId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const notifyResidents = useCallback(
    async (bulletinId: string) => {
      const result = await bulletinService.notify(bulletinId);
      if (!result.success) {
        toast.error(t("bulletins.toast.notifyFailed"));
        return;
      }
      if (result.data.alreadyNotified) return;
      toast.success(t("bulletins.toast.notified", { count: result.data.sent }));
    },
    [t],
  );

  /** Creates or updates the bulletin, reconciles its attachments, then optionally publishes + notifies. */
  const saveBulletin = useCallback(
    async (existing: BulletinWithAttachments | null, values: BulletinFormValues): Promise<boolean> => {
      setIsSubmitting(true);
      const description = values.description.trim() && values.description !== "<p></p>" ? values.description : null;

      let bulletinId = existing?.id ?? null;
      if (bulletinId) {
        const result = await bulletinService.update(bulletinId, { title: values.title, description });
        if (!result.success) {
          toast.error(result.error.message);
          setIsSubmitting(false);
          return false;
        }
      } else {
        const result = await bulletinService.create({ residentialId, title: values.title, description, createdBy: userId });
        if (!result.success) {
          toast.error(result.error.message);
          setIsSubmitting(false);
          return false;
        }
        bulletinId = result.data.id;
      }

      for (const removed of values.removedAttachments) {
        if (!removed.existing) continue;
        const result = await bulletinAttachmentService.delete(removed.existing);
        if (!result.success) toast.error(result.error.message);
      }

      // sort_order is the position within its kind; existing rows keep theirs.
      let uploadFailed = false;
      for (const kind of ["image", "pdf"] as const) {
        const ofKind = values.attachments.filter((a) => a.kind === kind);
        for (let i = 0; i < ofKind.length; i++) {
          const draft = ofKind[i];
          if (!draft.file) continue;
          const result = await bulletinAttachmentService.upload({
            bulletinId,
            residentialId,
            file: draft.file,
            kind,
            sortOrder: i,
          });
          if (!result.success) {
            uploadFailed = true;
            toast.error(result.error.message);
          }
        }
      }

      // Don't publish a bulletin that lost files on the way — the admin
      // would be announcing something incomplete. It stays a draft/as-is.
      const shouldPublish = values.publish && !uploadFailed;
      if (shouldPublish && existing?.status !== "published") {
        const result = await bulletinService.setStatus(bulletinId, "published");
        if (!result.success) {
          toast.error(result.error.message);
          setIsSubmitting(false);
          await reload();
          return false;
        }
        if (values.notify) await notifyResidents(bulletinId);
      }

      setIsSubmitting(false);
      await reload();

      if (uploadFailed) return false;
      toast.success(
        shouldPublish && existing?.status !== "published"
          ? t("bulletins.toast.published")
          : existing
            ? t("bulletins.toast.updated")
            : t("bulletins.toast.draftSaved"),
      );
      return true;
    },
    [residentialId, userId, reload, notifyResidents, t],
  );

  const setStatus = useCallback(
    async (id: string, status: "draft" | "published") => {
      setIsSubmitting(true);
      const result = await bulletinService.setStatus(id, status);
      setIsSubmitting(false);

      if (!result.success) {
        toast.error(result.error.message);
        return;
      }
      toast.success(status === "published" ? t("bulletins.toast.published") : t("bulletins.toast.unpublished"));
      // Publishing from the list notifies too; the edge function is
      // one-shot per bulletin, so republishing never pushes twice.
      if (status === "published") await notifyResidents(id);
      await reload();
    },
    [reload, t, notifyResidents],
  );

  const deleteBulletin = useCallback(
    async (bulletin: BulletinWithAttachments): Promise<boolean> => {
      setIsSubmitting(true);
      const result = await bulletinService.delete(
        bulletin.id,
        bulletin.bulletin_attachments.map((a) => a.storage_path),
      );
      setIsSubmitting(false);

      if (!result.success) {
        toast.error(result.error.message);
        return false;
      }
      toast.success(t("bulletins.toast.deleted"));
      await reload();
      return true;
    },
    [reload, t],
  );

  return { bulletins, isLoading, isSubmitting, reload, saveBulletin, setStatus, deleteBulletin };
}
