/**
 * Data fetching and mutations for the Announcements page. Same shape as
 * useVisitorManagerData.ts.
 */

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { announcementService } from "@/services";
import type { AnnouncementWithAuthor, CreateAnnouncementDto } from "@/types/announcement.types";

export interface AnnouncementFormPayload {
  title: string;
  content: string;
  category: string;
  audience: "everyone" | "admins";
  publishAt: string | null;
  createdBy: string | null;
}

export function useAnnouncementManagerData(residentialId: string) {
  const [announcements, setAnnouncements] = useState<AnnouncementWithAuthor[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const reload = useCallback(async () => {
    setIsLoading(true);
    const result = await announcementService.list(residentialId);
    setIsLoading(false);

    if (result.success) {
      setAnnouncements(result.data);
    } else {
      toast.error(result.error.message);
    }
  }, [residentialId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const createAnnouncement = useCallback(
    async (payload: AnnouncementFormPayload): Promise<boolean> => {
      setIsSubmitting(true);

      const dto: CreateAnnouncementDto = {
        residential_id: residentialId,
        title: payload.title,
        content: payload.content || null,
        category: payload.category || null,
        audience: payload.audience,
        status: "draft",
        publish_at: payload.publishAt,
        created_by: payload.createdBy,
      };

      const result = await announcementService.create(dto);
      setIsSubmitting(false);

      if (!result.success) {
        toast.error(result.error.message);
        return false;
      }

      toast.success("Announcement created");
      await reload();
      return true;
    },
    [residentialId, reload],
  );

  const publish = useCallback(
    async (id: string) => {
      setIsSubmitting(true);
      const result = await announcementService.update(id, { status: "published" });
      setIsSubmitting(false);

      if (!result.success) {
        toast.error(result.error.message);
        return;
      }
      toast.success("Announcement published");
      await reload();
    },
    [reload],
  );

  const unpublish = useCallback(
    async (id: string) => {
      setIsSubmitting(true);
      const result = await announcementService.update(id, { status: "draft" });
      setIsSubmitting(false);

      if (!result.success) {
        toast.error(result.error.message);
        return;
      }
      await reload();
    },
    [reload],
  );

  const deleteAnnouncement = useCallback(
    async (id: string): Promise<boolean> => {
      setIsSubmitting(true);
      const result = await announcementService.delete(id);
      setIsSubmitting(false);

      if (!result.success) {
        toast.error(result.error.message);
        return false;
      }

      toast.success("Announcement deleted");
      await reload();
      return true;
    },
    [reload],
  );

  return { announcements, isLoading, isSubmitting, reload, createAnnouncement, publish, unpublish, deleteAnnouncement };
}
