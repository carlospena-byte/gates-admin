/**
 * Push notification history — same usePaginatedSortedData + Pagination
 * scaffolding as the other tables.
 */

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Spinner } from "@/components/LoadingStates";
import { Pagination } from "@/components/Pagination";
import { DeleteIcon } from "@/components/icons";
import { confirmDeleteToast } from "@/lib/confirmDeleteToast";
import { usePaginatedSortedData } from "@/hooks/usePaginatedSortedData";
import { useI18n } from "@/i18n/useI18n";
import { cn } from "@/lib/utils";
import type {
  PushNotificationWithAuthor,
  PushStatus,
} from "@/types/pushNotification.types";

const STATUS_STYLES: Record<PushStatus, string> = {
  scheduled: "bg-blue-100 text-blue-700",
  sending: "bg-amber-100 text-amber-700",
  sent: "bg-green-100 text-green-700",
  failed: "bg-red-100 text-red-700",
};

interface PushNotificationTableProps {
  notifications: PushNotificationWithAuthor[];
  isLoading: boolean;
  isSubmitting: boolean;
  canManage: boolean;
  onSendNow: (id: string) => void;
  onResend: (notification: PushNotificationWithAuthor) => void;
  onDelete: (id: string) => Promise<boolean>;
}

export function PushNotificationTable({
  notifications,
  isLoading,
  isSubmitting,
  canManage,
  onSendNow,
  onResend,
  onDelete,
}: PushNotificationTableProps) {
  const { t } = useI18n();
  const {
    paginatedData,
    totalItems,
    totalPages,
    startIndex,
    endIndex,
    currentPage,
    setCurrentPage,
  } = usePaginatedSortedData({
    data: notifications,
    defaultSortField: "created_at" as keyof PushNotificationWithAuthor,
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

  if (notifications.length === 0) {
    return (
      <div className="py-8 text-center text-sm text-muted-foreground">
        {t("announcements.table.empty")}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("announcements.table.message")}</TableHead>
              <TableHead>{t("announcements.table.destination")}</TableHead>
              <TableHead>{t("announcements.table.audience")}</TableHead>
              <TableHead>{t("announcements.table.when")}</TableHead>
              <TableHead>{t("common.status")}</TableHead>
              <TableHead className="text-right">
                {t("common.actions")}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedData.map((n) => (
              <TableRow key={n.id}>
                <TableCell className="max-w-xs">
                  <p className="truncate font-medium">{n.title}</p>
                  <p className="truncate text-sm text-muted-foreground">
                    {n.body}
                  </p>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {t(`announcements.destination.${n.destination}`)}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {t(`announcements.audience.${n.audience}`)}
                  {n.audience === "units" && ` (${n.unit_ids.length})`}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {new Date(n.sent_at ?? n.scheduled_at).toLocaleString()}
                </TableCell>
                <TableCell>
                  <Badge
                    className={cn(
                      "border-transparent",
                      STATUS_STYLES[n.status],
                    )}
                  >
                    {t(`announcements.status.${n.status}`)}
                  </Badge>
                  {n.status === "sent" && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {t("announcements.table.devices", {
                        sent: n.sent_count,
                        total: n.sent_count + n.failed_count,
                      })}
                    </p>
                  )}
                  {n.status === "failed" && n.error && (
                    <p
                      className="mt-1 max-w-[12rem] truncate text-xs text-destructive"
                      title={n.error}
                    >
                      {n.error}
                    </p>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  {canManage && (
                    <div className="flex justify-end gap-1">
                      {n.status === "scheduled" && (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={isSubmitting}
                          onClick={() => onSendNow(n.id)}
                        >
                          {t("announcements.table.sendNow")}
                        </Button>
                      )}
                      {(n.status === "sent" || n.status === "failed") && (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={isSubmitting}
                          onClick={() => onResend(n)}
                        >
                          {t("announcements.table.resend")}
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={isSubmitting || n.status === "sending"}
                        onClick={() =>
                          confirmDeleteToast(n.title, async () => {
                            await onDelete(n.id);
                          })
                        }
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
