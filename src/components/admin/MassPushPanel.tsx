/**
 * Platform-admin panel for mass push notifications: everyone with a
 * registered device, or the members of one or several residentials. Sends
 * go through the send-mass-push edge function (platform admins only) and
 * each one is kept in push_campaigns, shown below as history.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Spinner } from "@/components/LoadingStates";
import { appSettingsService, residentialService, type PushAudience } from "@/services";
import type { PushCampaign, Residential } from "@/types/database.types";
import { normalizeForSearch } from "@/lib/utils";
import { useI18n } from "@/i18n/useI18n";

const MAX_TITLE = 100;
const MAX_BODY = 500;

export function MassPushPanel() {
  const { t } = useI18n();
  const [audience, setAudience] = useState<PushAudience>("all");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [residentials, setResidentials] = useState<Residential[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [campaigns, setCampaigns] = useState<PushCampaign[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const loadCampaigns = useCallback(async () => {
    const result = await appSettingsService.listCampaigns();
    if (result.success) setCampaigns(result.data);
  }, []);

  useEffect(() => {
    void (async () => {
      const [res, camp] = await Promise.all([residentialService.list(), appSettingsService.listCampaigns()]);
      if (res.success) setResidentials(res.data);
      else toast.error(res.error.message);
      if (camp.success) setCampaigns(camp.data);
      setIsLoading(false);
    })();
  }, []);

  const filtered = useMemo(() => {
    const q = normalizeForSearch(search);
    return residentials.filter((r) => !q || normalizeForSearch(r.name).includes(q));
  }, [residentials, search]);

  const residentialNames = useMemo(() => new Map(residentials.map((r) => [r.id, r.name])), [residentials]);

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const canSend = title.trim() && body.trim() && (audience === "all" || selected.size > 0);

  const audienceSummary =
    audience === "all"
      ? t("platformAdmin.appSettings.push.audienceAll")
      : t("platformAdmin.appSettings.push.audienceSelected", { count: selected.size });

  const handleSend = async () => {
    setConfirmOpen(false);
    setIsSending(true);
    const result = await appSettingsService.sendMassPush({
      title: title.trim(),
      body: body.trim(),
      audience,
      residentialIds: audience === "residentials" ? [...selected] : [],
    });
    setIsSending(false);
    if (!result.success) {
      toast.error(result.error.message);
      return;
    }
    toast.success(
      t("platformAdmin.appSettings.push.sent", { sent: result.data.sent, failed: result.data.failed }),
    );
    setTitle("");
    setBody("");
    setSelected(new Set());
    await loadCampaigns();
  };

  const campaignAudience = (c: PushCampaign) =>
    c.audience === "all"
      ? t("platformAdmin.appSettings.push.audienceAll")
      : c.residential_ids.map((id) => residentialNames.get(id) ?? "—").join(", ");

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <div className="flex gap-2">
          <Button
            type="button"
            size="sm"
            variant={audience === "all" ? "default" : "outline"}
            onClick={() => setAudience("all")}
            disabled={isSending}
          >
            {t("platformAdmin.appSettings.push.audienceAllOption")}
          </Button>
          <Button
            type="button"
            size="sm"
            variant={audience === "residentials" ? "default" : "outline"}
            onClick={() => setAudience("residentials")}
            disabled={isSending}
          >
            {t("platformAdmin.appSettings.push.audienceResidentialsOption")}
          </Button>
        </div>

        {audience === "residentials" ? (
          <div className="space-y-2 rounded-lg border bg-card p-3">
            <Input
              label={t("common.search")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              disabled={isLoading}
            />
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{t("platformAdmin.appSettings.push.selectedCount", { count: selected.size })}</span>
              <div className="flex gap-3">
                <button
                  type="button"
                  className="underline"
                  onClick={() => setSelected(new Set([...selected, ...filtered.map((r) => r.id)]))}
                >
                  {t("platformAdmin.appSettings.push.selectAll")}
                </button>
                <button type="button" className="underline" onClick={() => setSelected(new Set())}>
                  {t("platformAdmin.appSettings.push.clear")}
                </button>
              </div>
            </div>
            <div className="max-h-56 divide-y overflow-y-auto rounded-md border">
              {isLoading ? (
                <div className="flex justify-center py-6">
                  <Spinner />
                </div>
              ) : filtered.length === 0 ? (
                <div className="py-6 text-center text-sm text-muted-foreground">
                  {t("platformAdmin.appSettings.push.noResidentials")}
                </div>
              ) : (
                filtered.map((r) => (
                  <div key={r.id} className="px-3 py-2">
                    <Checkbox checked={selected.has(r.id)} onCheckedChange={() => toggle(r.id)} label={r.name} />
                  </div>
                ))
              )}
            </div>
          </div>
        ) : null}

        <Input
          label={t("platformAdmin.appSettings.push.titleLabel")}
          value={title}
          maxLength={MAX_TITLE}
          onChange={(e) => setTitle(e.target.value)}
          disabled={isSending}
        />
        <Textarea
          label={t("platformAdmin.appSettings.push.bodyLabel")}
          value={body}
          maxLength={MAX_BODY}
          rows={3}
          onChange={(e) => setBody(e.target.value)}
          disabled={isSending}
        />
        <div className="flex justify-end">
          <Button onClick={() => setConfirmOpen(true)} disabled={isSending || !canSend}>
            {isSending ? <Spinner size="sm" /> : t("platformAdmin.appSettings.push.send")}
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-foreground">{t("platformAdmin.appSettings.push.history")}</h3>
        {campaigns.length === 0 ? (
          <div className="py-6 text-center text-sm text-muted-foreground">
            {t("platformAdmin.appSettings.push.historyEmpty")}
          </div>
        ) : (
          <div className="divide-y rounded-lg border bg-card">
            {campaigns.map((c) => (
              <div key={c.id} className="space-y-1 px-4 py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm font-medium text-foreground">{c.title}</span>
                  <span className="text-xs text-muted-foreground">{new Date(c.created_at).toLocaleString()}</span>
                </div>
                <p className="text-sm text-muted-foreground">{c.body}</p>
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <Badge className="bg-gates-subtle text-gates-text-secondary hover:bg-gates-subtle">
                    {campaignAudience(c)}
                  </Badge>
                  <span>{t("platformAdmin.appSettings.push.stats", { sent: c.sent, failed: c.failed })}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("platformAdmin.appSettings.push.confirmTitle")}</DialogTitle>
            <DialogDescription>
              {t("platformAdmin.appSettings.push.confirmBody", { audience: audienceSummary })}
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-md border bg-muted/40 p-3">
            <p className="text-sm font-medium text-foreground">{title}</p>
            <p className="text-sm text-muted-foreground">{body}</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button onClick={() => void handleSend()}>{t("platformAdmin.appSettings.push.confirmSend")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
