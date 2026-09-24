/**
 * Announcement list — same usePaginatedSortedData + SortableTableHead +
 * Pagination scaffolding as every other table this session.
 */

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Spinner } from "@/components/LoadingStates";
import { Pagination } from "@/components/Pagination";
import { SortableTableHead } from "@/components/SortableTableHead";
import { DeleteIcon } from "@/components/icons";
import { confirmDeleteToast } from "@/lib/confirmDeleteToast";
import { usePaginatedSortedData } from "@/hooks/usePaginatedSortedData";
import { useI18n } from "@/i18n/useI18n";
import type { MessageKey } from "@/i18n/messages";
import { cn } from "@/lib/utils";
import type { AnnouncementWithAuthor } from "@/types/announcement.types";

const AUDIENCE_LABEL_KEYS: Record<string, MessageKey> = {
  everyone: "announcements.audience.everyone",
  admins: "announcements.audience.admins",
};

const STATUS_LABEL_KEYS: Record<string, MessageKey> = {
  draft: "announcements.status.draft",
  published: "announcements.status.published",
};

interface AnnouncementTableProps {
  announcements: AnnouncementWithAuthor[];
  isLoading: boolean;
  isSubmitting: boolean;
  canManage: boolean;
  onPublish: (id: string) => void;
  onUnpublish: (id: string) => void;
  onDelete: (id: string) => Promise<boolean>;
}

export function AnnouncementTable({
  announcements,
  isLoading,
  isSubmitting,
  canManage,
  onPublish,
  onUnpublish,
  onDelete,
}: AnnouncementTableProps) {
  const { t } = useI18n();
  const {
    paginatedData: paginatedAnnouncements,
    totalItems,
    totalPages,
    startIndex,
    endIndex,
    sortField,
    sortOrder,
    handleSort,
    currentPage,
    setCurrentPage,
  } = usePaginatedSortedData({
    data: announcements,
    defaultSortField: "created_at" as keyof AnnouncementWithAuthor,
    defaultSortOrder: "desc",
    itemsPerPage: 10,
  });

  const handleDelete = (id: string, title: string) => {
    confirmDeleteToast(title, async () => {
      await onDelete(id);
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Spinner />
      </div>
    );
  }

  if (announcements.length === 0) {
    return <div className="py-8 text-center text-sm text-muted-foreground">{t("announcements.table.empty")}</div>;
  }

  return (
    <div className="space-y-2">
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <SortableTableHead field="title" currentSortField={sortField} sortOrder={sortOrder} onSort={handleSort}>
                {t("announcements.table.title")}
              </SortableTableHead>
              <TableHead>{t("announcements.table.audience")}</TableHead>
              <TableHead>{t("announcements.table.author")}</TableHead>
              <TableHead>{t("announcements.table.publishAt")}</TableHead>
              <TableHead>{t("common.status")}</TableHead>
              <TableHead className="text-right">{t("common.actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedAnnouncements.map((announcement) => (
              <TableRow key={announcement.id}>
                <TableCell className="font-medium">{announcement.title}</TableCell>
                <TableCell className="text-sm text-muted-foreground capitalize">
                  {t(AUDIENCE_LABEL_KEYS[announcement.audience])}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{announcement.profiles?.email ?? "—"}</TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {announcement.publish_at
                    ? new Date(announcement.publish_at).toLocaleString()
                    : t("announcements.table.immediately")}
                </TableCell>
                <TableCell>
                  <Badge
                    className={cn(
                      "border-transparent capitalize",
                      announcement.status === "published"
                        ? "bg-green-100 text-green-700"
                        : "bg-secondary text-secondary-foreground",
                    )}
                  >
                    {t(STATUS_LABEL_KEYS[announcement.status])}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  {canManage && (
                    <div className="flex justify-end gap-1">
                      {announcement.status === "draft" ? (
                        <Button size="sm" variant="outline" disabled={isSubmitting} onClick={() => onPublish(announcement.id)}>
                          {t("announcements.table.publish")}
                        </Button>
                      ) : (
                        <Button size="sm" variant="outline" disabled={isSubmitting} onClick={() => onUnpublish(announcement.id)}>
                          {t("announcements.table.unpublish")}
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={isSubmitting}
                        onClick={() => handleDelete(announcement.id, announcement.title)}
                      >
                        <DeleteIcon />
                      </Button>
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={totalItems}
        startIndex={startIndex}
        endIndex={endIndex}
        onPageChange={setCurrentPage}
      />
    </div>
  );
}
