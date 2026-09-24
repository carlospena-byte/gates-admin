/**
 * Activity Log
 * Side sheet showing the audit trail (who created/updated/deleted what) for
 * a residential. Read-only: the underlying audit_logs rows are written by
 * the log_audit_event() DB trigger, never by the app.
 */

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ActivityLogTable } from "@/components/activityLog/ActivityLogTable";
import { useActivityLogData } from "@/hooks/useActivityLogData";
import { useI18n } from "@/i18n/useI18n";

interface ActivityLogManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  residentialId: string;
}

export function ActivityLogManager({ open, onOpenChange, residentialId }: ActivityLogManagerProps) {
  const { t } = useI18n();
  const { logs, isLoading } = useActivityLogData(residentialId, open);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-4xl overflow-y-auto"
        onInteractOutside={(e) => e.preventDefault()}
      >
        <SheetHeader>
          <SheetTitle>{t("activityLog.title")}</SheetTitle>
          <SheetDescription>{t("activityLog.description")}</SheetDescription>
        </SheetHeader>

        <div className="py-6">
          <ActivityLogTable logs={logs} isLoading={isLoading} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
