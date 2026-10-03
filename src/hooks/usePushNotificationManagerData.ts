/**
 * Data fetching and mutations for the push notifications ("Comunicados") page.
 */

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { pushNotificationService } from "@/services";
import { useI18n } from "@/i18n/useI18n";
import type { CreatePushNotificationInput, PushNotificationWithAuthor } from "@/types/pushNotification.types";

export function usePushNotificationManagerData(residentialId: string) {
  const { t } = useI18n();
  const [notifications, setNotifications] = useState<PushNotificationWithAuthor[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const reload = useCallback(async () => {
    setIsLoading(true);
    const result = await pushNotificationService.list(residentialId);
    setIsLoading(false);
    if (result.success) {
      setNotifications(result.data);
    } else {
      toast.error(result.error.message);
    }
  }, [residentialId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const dispatch = useCallback(
    async (id: string): Promise<boolean> => {
      const sent = await pushNotificationService.send(id);
      if (!sent.success) {
        toast.error(sent.error.message);
        return false;
      }
      if (sent.data.sent === 0) toast.warning(t("announcements.toast.noRecipients"));
      else toast.success(t("announcements.toast.sent"));
      return true;
    },
    [t],
  );

  // `sendNow` inserts a due row and dispatches it; otherwise it just
  // schedules and the cron delivers it.
  const create = useCallback(
    async (input: CreatePushNotificationInput, sendNow: boolean): Promise<boolean> => {
      setIsSubmitting(true);
      const created = await pushNotificationService.create(input);
      if (!created.success) {
        setIsSubmitting(false);
        toast.error(created.error.message);
        return false;
      }
      if (sendNow) await dispatch(created.data.id);
      else toast.success(t("announcements.toast.scheduled"));
      setIsSubmitting(false);
      await reload();
      return true;
    },
    [dispatch, reload, t],
  );

  const sendExisting = useCallback(
    async (id: string) => {
      setIsSubmitting(true);
      await dispatch(id);
      setIsSubmitting(false);
      await reload();
    },
    [dispatch, reload],
  );

  // Resending copies the message into a fresh row (a sent row is history).
  const resend = useCallback(
    async (source: PushNotificationWithAuthor, createdBy: string | null) => {
      await create(
        {
          residentialId,
          title: source.title,
          body: source.body,
          destination: source.destination,
          bulletinId: source.bulletin_id,
          audience: source.audience,
          unitIds: source.unit_ids ?? [],
          locationIds: source.location_ids ?? [],
          scheduledAt: new Date().toISOString(),
          createdBy,
        },
        true,
      );
    },
    [create, residentialId],
  );

  const deleteNotification = useCallback(
    async (id: string): Promise<boolean> => {
      setIsSubmitting(true);
      const result = await pushNotificationService.delete(id);
      setIsSubmitting(false);
      if (!result.success) {
        toast.error(result.error.message);
        return false;
      }
      toast.success(t("announcements.toast.deleted"));
      await reload();
      return true;
    },
    [reload, t],
  );

  return { notifications, isLoading, isSubmitting, reload, create, sendExisting, resend, deleteNotification };
}
