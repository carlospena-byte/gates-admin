import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { auditLogService } from "@/services";
import type { AuditLogWithActor } from "@/types/audit.types";

export function useActivityLogData(residentialId: string, open: boolean) {
  const [logs, setLogs] = useState<AuditLogWithActor[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const reload = useCallback(async () => {
    setIsLoading(true);
    const result = await auditLogService.listByResidential(residentialId);
    setIsLoading(false);

    if (result.success) {
      setLogs(result.data);
    } else {
      toast.error(result.error.message);
    }
  }, [residentialId]);

  useEffect(() => {
    if (!open) return;
    void reload();
  }, [open, reload]);

  return { logs, isLoading, reload };
}
