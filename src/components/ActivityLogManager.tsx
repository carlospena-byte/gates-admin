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

interface ActivityLogManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  residentialId: string;
}

export function ActivityLogManager({ open, onOpenChange, residentialId }: ActivityLogManagerProps) {
  const { logs, isLoading } = useActivityLogData(residentialId, open);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-4xl overflow-y-auto"
        onInteractOutside={(e) => e.preventDefault()}
      >
        <SheetHeader>
          <SheetTitle>Activity Log</SheetTitle>
          <SheetDescription>Who created, updated, or deleted what — across this residential</SheetDescription>
        </SheetHeader>

        <div className="py-6">
          <ActivityLogTable logs={logs} isLoading={isLoading} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
