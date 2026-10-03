/**
 * Bulletin list — same usePaginatedSortedData + SortableTableHead +
 * Pagination scaffolding as AnnouncementTable.
 */

import { IconFileTypePdf, IconPhoto } from "@tabler/icons-react";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Spinner } from "@/components/LoadingStates";
import { Pagination } from "@/components/Pagination";
import { SortableTableHead } from "@/components/SortableTableHead";
import { DeleteIcon } from "@/components/icons";
import { confirmDeleteToast } from "@/lib/confirmDeleteToast";
import { usePaginatedSortedData } from "@/hooks/usePaginatedSortedData";
import { useI18n } from "@/i18n/useI18n";
import type { BulletinWithAttachments } from "@/types/bulletin.types";

interface BulletinTableProps {
  bulletins: BulletinWithAttachments[];
  isLoading: boolean;
  isSubmitting: boolean;
  canManage: boolean;
  onEdit: (bulletin: BulletinWithAttachments) => void;
  onPublish: (id: string) => void;
  onUnpublish: (id: string) => void;
  onDelete: (bulletin: BulletinWithAttachments) => Promise<boolean>;
}

export function BulletinTable({
  bulletins,
  isLoading,
  isSubmitting,
  canManage,
  onEdit,
  onPublish,
  onUnpublish,
  onDelete,
}: BulletinTableProps) {
  const { t } = useI18n();
  const {
    paginatedData,
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
    data: bulletins,
    defaultSortField: "created_at" as keyof BulletinWithAttachments,
    defaultSortOrder: "desc",
    itemsPerPage: 10,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Spinner />
      </div>
    );
  }

  if (bulletins.length === 0) {
    return <div className="py-8 text-center text-sm text-muted-foreground">{t("bulletins.table.empty")}</div>;
  }

  return (
    <div className="space-y-2">
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <SortableTableHead field="title" currentSortField={sortField} sortOrder={sortOrder} onSort={handleSort}>
                {t("bulletins.table.title")}
              </SortableTableHead>
              <TableHead>{t("bulletins.table.attachments")}</TableHead>
              <SortableTableHead
                field="published_at"
                currentSortField={sortField}
                sortOrder={sortOrder}
                onSort={handleSort}
              >
                {t("bulletins.table.publishedAt")}
              </SortableTableHead>
              <TableHead>{t("common.status")}</TableHead>
              <TableHead className="text-right">{t("common.actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedData.map((bulletin) => {
              const imageCount = bulletin.bulletin_attachments.filter((a) => a.kind === "image").length;
              const pdfCount = bulletin.bulletin_attachments.filter((a) => a.kind === "pdf").length;
              return (
                <TableRow key={bulletin.id}>
                  <TableCell className="font-medium">{bulletin.title}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    <div className="flex items-center gap-3">
                      <span className="inline-flex items-center gap-1">
                        <IconPhoto className="h-4 w-4" aria-hidden />
                        {imageCount}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <IconFileTypePdf className="h-4 w-4" aria-hidden />
                        {pdfCount}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {bulletin.published_at ? new Date(bulletin.published_at).toLocaleString() : "—"}
                  </TableCell>
                  <TableCell>
                    <StatusBadge tone={bulletin.status === "published" ? "success" : "neutral"}>
                      {bulletin.status === "published" ? t("bulletins.status.published") : t("bulletins.status.draft")}
                    </StatusBadge>
                  </TableCell>
                  <TableCell className="text-right">
                    {canManage && (
                      <div className="flex justify-end gap-1">
                        <Button size="sm" variant="outline" disabled={isSubmitting} onClick={() => onEdit(bulletin)}>
                          {t("common.edit")}
                        </Button>
                        {bulletin.status === "draft" ? (
                          <Button size="sm" variant="outline" disabled={isSubmitting} onClick={() => onPublish(bulletin.id)}>
                            {t("bulletins.table.publish")}
                          </Button>
                        ) : (
                          <Button size="sm" variant="outline" disabled={isSubmitting} onClick={() => onUnpublish(bulletin.id)}>
                            {t("bulletins.table.unpublish")}
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          aria-label={t("common.delete")}
                          disabled={isSubmitting}
                          onClick={() => confirmDeleteToast(bulletin.title, () => void onDelete(bulletin))}
                        >
                          <DeleteIcon />
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
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
