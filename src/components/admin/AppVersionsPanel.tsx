/**
 * Platform-admin panel for app releases. iOS and Android are managed in
 * separate tabs and never share rows. A release is either optional (the app
 * shows "update available" with a Continue button) or forced (the app blocks
 * until the user updates from the store). The app compares its installed
 * version against the active releases of its own platform.
 */

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Spinner } from "@/components/LoadingStates";
import { confirmDeleteToast } from "@/lib/confirmDeleteToast";
import { appSettingsService, type AppPlatform } from "@/services";
import { parseVersion } from "@/services/appSettingsService";
import type { AppVersion } from "@/types/database.types";
import { useI18n } from "@/i18n/useI18n";

const STORE_URL_PLACEHOLDER: Record<AppPlatform, string> = {
  ios: "https://apps.apple.com/app/id…",
  android: "https://play.google.com/store/apps/details?id=app.vecinoo.app",
};

interface FormState {
  version: string;
  isForced: boolean;
  title: string;
  message: string;
  storeUrl: string;
}

const emptyForm = (platform: AppPlatform): FormState => ({
  version: "",
  isForced: false,
  title: "",
  message: "",
  storeUrl: platform === "android" ? STORE_URL_PLACEHOLDER.android : "",
});

function PlatformVersions({ platform }: { platform: AppPlatform }) {
  const { t } = useI18n();
  const [versions, setVersions] = useState<AppVersion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm(platform));
  const [editingId, setEditingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    const result = await appSettingsService.listVersions(platform);
    if (result.success) setVersions(result.data);
    else toast.error(result.error.message);
    setIsLoading(false);
  }, [platform]);

  useEffect(() => {
    void load();
  }, [load]);

  const reset = () => {
    setForm(emptyForm(platform));
    setEditingId(null);
  };

  const startEditing = (row: AppVersion) => {
    setEditingId(row.id);
    setForm({
      version: row.version,
      isForced: row.is_forced,
      title: row.title ?? "",
      message: row.message ?? "",
      storeUrl: row.store_url,
    });
  };

  const validate = (): boolean => {
    if (!parseVersion(form.version)) {
      toast.error(t("platformAdmin.appSettings.versions.invalidVersion"));
      return false;
    }
    if (!/^https?:\/\//i.test(form.storeUrl.trim())) {
      toast.error(t("platformAdmin.appSettings.versions.invalidUrl"));
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setIsSubmitting(true);
    const fields = {
      version: form.version.trim(),
      is_forced: form.isForced,
      title: form.title.trim() || null,
      message: form.message.trim() || null,
      store_url: form.storeUrl.trim(),
    };
    const result = editingId
      ? await appSettingsService.updateVersion(editingId, fields)
      : await appSettingsService.createVersion({ ...fields, platform });
    setIsSubmitting(false);
    if (!result.success) {
      const duplicate = result.error.code === "23505";
      toast.error(duplicate ? t("platformAdmin.appSettings.versions.duplicate") : result.error.message);
      return;
    }
    toast.success(t(editingId ? "platformAdmin.appSettings.versions.updated" : "platformAdmin.appSettings.versions.created"));
    reset();
    await load();
  };

  const handleToggleActive = async (row: AppVersion) => {
    const result = await appSettingsService.updateVersion(row.id, { is_active: !row.is_active });
    if (!result.success) {
      toast.error(result.error.message);
      return;
    }
    await load();
  };

  const handleDelete = (row: AppVersion) => {
    confirmDeleteToast(row.version, async () => {
      const result = await appSettingsService.deleteVersion(row.id);
      if (!result.success) {
        toast.error(result.error.message);
        return;
      }
      if (editingId === row.id) reset();
      await load();
    });
  };

  return (
    <div className="space-y-4 pt-4">
      <div className="space-y-3 rounded-lg border bg-card p-4">
        <h3 className="text-sm font-semibold text-foreground">
          {editingId
            ? t("platformAdmin.appSettings.versions.editTitle", { platform: t(`platformAdmin.appSettings.platform.${platform}`) })
            : t("platformAdmin.appSettings.versions.newTitle", { platform: t(`platformAdmin.appSettings.platform.${platform}`) })}
        </h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <Input
            label={t("platformAdmin.appSettings.versions.version")}
            placeholder="1.2.0"
            value={form.version}
            onChange={(e) => setForm({ ...form, version: e.target.value })}
            disabled={isSubmitting}
          />
          <Input
            label={t("platformAdmin.appSettings.versions.storeUrl")}
            placeholder={STORE_URL_PLACEHOLDER[platform]}
            value={form.storeUrl}
            onChange={(e) => setForm({ ...form, storeUrl: e.target.value })}
            disabled={isSubmitting}
          />
        </div>
        <Input
          label={t("platformAdmin.appSettings.versions.titleLabel")}
          placeholder={t("platformAdmin.appSettings.versions.titlePlaceholder")}
          value={form.title}
          maxLength={80}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          disabled={isSubmitting}
        />
        <Textarea
          label={t("platformAdmin.appSettings.versions.messageLabel")}
          placeholder={t("platformAdmin.appSettings.versions.messagePlaceholder")}
          value={form.message}
          maxLength={300}
          rows={2}
          onChange={(e) => setForm({ ...form, message: e.target.value })}
          disabled={isSubmitting}
        />
        <div className="flex items-center justify-between gap-4 rounded-md border px-3 py-2">
          <div>
            <span className="text-sm font-medium text-foreground">{t("platformAdmin.appSettings.versions.forced")}</span>
            <p className="text-xs text-muted-foreground">{t("platformAdmin.appSettings.versions.forcedHelp")}</p>
          </div>
          <Switch
            checked={form.isForced}
            onCheckedChange={(checked) => setForm({ ...form, isForced: checked })}
            disabled={isSubmitting}
            aria-label={t("platformAdmin.appSettings.versions.forced")}
          />
        </div>
        <div className="flex justify-end gap-2">
          {editingId ? (
            <Button variant="outline" onClick={reset} disabled={isSubmitting}>
              {t("common.cancel")}
            </Button>
          ) : null}
          <Button onClick={() => void handleSubmit()} disabled={isSubmitting || !form.version.trim() || !form.storeUrl.trim()}>
            {isSubmitting ? <Spinner size="sm" /> : editingId ? t("common.save") : t("common.add")}
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <Spinner />
        </div>
      ) : versions.length === 0 ? (
        <div className="py-8 text-center text-sm text-muted-foreground">{t("platformAdmin.appSettings.versions.empty")}</div>
      ) : (
        <div className="divide-y rounded-lg border bg-card">
          {versions.map((row) => (
            <div key={row.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
              <div className="min-w-[8rem] flex-1">
                <span className="block text-sm font-medium text-foreground">v{row.version}</span>
                {row.message ? <span className="block truncate text-xs text-muted-foreground">{row.message}</span> : null}
              </div>
              <Badge
                className={
                  row.is_forced
                    ? "bg-gates-danger-bg text-gates-danger hover:bg-gates-danger-bg"
                    : "bg-gates-subtle text-gates-text-secondary hover:bg-gates-subtle"
                }
              >
                {row.is_forced
                  ? t("platformAdmin.appSettings.versions.badgeForced")
                  : t("platformAdmin.appSettings.versions.badgeOptional")}
              </Badge>
              <Badge
                className={
                  row.is_active
                    ? "bg-gates-success-bg text-gates-success hover:bg-gates-success-bg"
                    : "bg-gates-subtle text-gates-text-secondary hover:bg-gates-subtle"
                }
              >
                {row.is_active ? t("common.active") : t("common.inactive")}
              </Badge>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" variant="ghost" disabled={isSubmitting}>
                    ···
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => startEditing(row)}>{t("common.edit")}</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => void handleToggleActive(row)}>
                    {row.is_active ? t("common.setInactive") : t("common.setActive")}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={() => handleDelete(row)}
                  >
                    {t("common.delete")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function AppVersionsPanel() {
  const { t } = useI18n();
  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">{t("platformAdmin.appSettings.versions.help")}</p>
      <Tabs defaultValue="ios">
        <TabsList>
          <TabsTrigger value="ios">{t("platformAdmin.appSettings.platform.ios")}</TabsTrigger>
          <TabsTrigger value="android">{t("platformAdmin.appSettings.platform.android")}</TabsTrigger>
        </TabsList>
        <TabsContent value="ios">
          <PlatformVersions platform="ios" />
        </TabsContent>
        <TabsContent value="android">
          <PlatformVersions platform="android" />
        </TabsContent>
      </Tabs>
    </div>
  );
}
