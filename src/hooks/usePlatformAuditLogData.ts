import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { auditLogService } from "@/services";
import type { AuditLogWithActor } from "@/types/audit.types";

export function usePlatformAuditLogData() {
  const [logs, setLogs] = useState<AuditLogWithActor[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const reload = useCallback(async () => {
    setIsLoading(true);
    const result = await auditLogService.listPlatform();
    setIsLoading(false);

    if (result.success) {
      setLogs(result.data);
    } else {
      toast.error(result.error.message);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { logs, isLoading, reload };
}
