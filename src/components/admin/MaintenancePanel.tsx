/**
 * Platform-admin panel for maintenance mode. While enabled, the mobile app
 * (iOS and Android) shows a full-screen "under maintenance" view with the
 * title/message set here; it re-checks on launch and whenever it returns
 * to the foreground.
 */

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Spinner } from "@/components/LoadingStates";
import { appSettingsService } from "@/services";
import type { AppConfig } from "@/types/database.types";
import { useI18n } from "@/i18n/useI18n";

export function MaintenancePanel() {
  const { t } = useI18n();
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");

  const apply = (row: AppConfig) => {
    setConfig(row);
    setTitle(row.maintenance_title ?? "");
    setMessage(row.maintenance_message ?? "");
  };

  useEffect(() => {
    void (async () => {
      const result = await appSettingsService.getConfig();
      if (result.success) apply(result.data);
      else toast.error(result.error.message);
      setIsLoading(false);
    })();
  }, []);

  const save = async (enabled: boolean, successKey: "maintenance.saved" | "maintenance.enabledToast" | "maintenance.disabledToast") => {
    if (!config) return;
    setIsSaving(true);
    const result = await appSettingsService.updateMaintenance(config.id, {
      maintenance_enabled: enabled,
      maintenance_title: title.trim() || null,
      maintenance_message: message.trim() || null,
    });
    setIsSaving(false);
    if (!result.success) {
      toast.error(result.error.message);
      return;
    }
    apply(result.data);
    toast.success(t(`platformAdmin.appSettings.${successKey}`));
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Spinner />
      </div>
    );
  }
  if (!config) return null;

  const enabled = config.maintenance_enabled;
  const dirty = title !== (config.maintenance_title ?? "") || message !== (config.maintenance_message ?? "");

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4 rounded-lg border bg-card px-4 py-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-foreground">{t("platformAdmin.appSettings.maintenance.toggle")}</span>
            <Badge
              className={
                enabled
                  ? "bg-gates-danger-bg text-gates-danger hover:bg-gates-danger-bg"
                  : "bg-gates-success-bg text-gates-success hover:bg-gates-success-bg"
              }
            >
              {enabled ? t("platformAdmin.appSettings.maintenance.on") : t("platformAdmin.appSettings.maintenance.off")}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">{t("platformAdmin.appSettings.maintenance.toggleHelp")}</p>
        </div>
        <Switch
          checked={enabled}
          disabled={isSaving}
          aria-label={t("platformAdmin.appSettings.maintenance.toggle")}
          onCheckedChange={(next) => void save(next, next ? "maintenance.enabledToast" : "maintenance.disabledToast")}
        />
      </div>

      <Input
        label={t("platformAdmin.appSettings.maintenance.titleLabel")}
        value={title}
        maxLength={80}
        placeholder={t("platformAdmin.appSettings.maintenance.titlePlaceholder")}
        onChange={(e) => setTitle(e.target.value)}
        disabled={isSaving}
      />
      <Textarea
        label={t("platformAdmin.appSettings.maintenance.messageLabel")}
        value={message}
        maxLength={300}
        rows={3}
        placeholder={t("platformAdmin.appSettings.maintenance.messagePlaceholder")}
        onChange={(e) => setMessage(e.target.value)}
        disabled={isSaving}
      />
      <div className="flex justify-end">
        <Button onClick={() => void save(enabled, "maintenance.saved")} disabled={isSaving || !dirty}>
          {isSaving ? <Spinner size="sm" /> : t("common.save")}
        </Button>
      </div>
    </div>
  );
}
