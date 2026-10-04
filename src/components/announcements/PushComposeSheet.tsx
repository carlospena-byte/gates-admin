/**
 * Right-side sheet for composing a push notification: title, message, where
 * the tap lands (deeplink destination), audience, and send-now / schedule.
 * Includes a phone-style preview so the admin sees what residents will get.
 */

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { DatePicker } from "@/components/ui/date-picker";
import { TimePicker } from "@/components/ui/time-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Spinner } from "@/components/LoadingStates";
import { Checkbox } from "@/components/ui/checkbox";
import {
  LevelPicker,
  type LevelOption,
} from "@/components/announcements/LevelPicker";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { bulletinService, locationService, unitService } from "@/services";
import { normalizeForSearch } from "@/lib/utils";
import { useI18n } from "@/i18n/useI18n";
import {
  PUSH_BODY_MAX,
  PUSH_DESTINATIONS,
  PUSH_TITLE_MAX,
  type CreatePushNotificationInput,
  type PushAudienceKind,
  type PushDestination,
} from "@/types/pushNotification.types";
import type { BulletinWithAttachments } from "@/types/bulletin.types";

interface Fields {
  title: string;
  body: string;
  destination: PushDestination;
  bulletinId: string;
  audience: PushAudienceKind;
  unitIds: string[];
  locationIds: string[];
  when: "now" | "later";
  scheduledDate: string;
  scheduledTime: string;
}

const EMPTY: Fields = {
  title: "",
  body: "",
  destination: "home",
  bulletinId: "",
  audience: "everyone",
  unitIds: [],
  locationIds: [],
  when: "now",
  scheduledDate: "",
  scheduledTime: "09:00",
};

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h3>
      {children}
    </section>
  );
}

interface PushComposeSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  residentialId: string;
  createdBy: string | null;
  isSubmitting: boolean;
  onSubmit: (
    input: CreatePushNotificationInput,
    sendNow: boolean,
  ) => Promise<boolean>;
}

export function PushComposeSheet({
  open,
  onOpenChange,
  residentialId,
  createdBy,
  isSubmitting,
  onSubmit,
}: PushComposeSheetProps) {
  const { t } = useI18n();
  const [fields, setFields] = useState<Fields>(EMPTY);
  const [bulletins, setBulletins] = useState<BulletinWithAttachments[]>([]);
  const [units, setUnits] = useState<
    { id: string; name: string; locationId: string | null }[]
  >([]);
  const [levels, setLevels] = useState<LevelOption[]>([]);
  const [unitSearch, setUnitSearch] = useState("");
  const set = <K extends keyof Fields>(key: K, value: Fields[K]) =>
    setFields((prev) => ({ ...prev, [key]: value }));

  // Published bulletins feed the "a specific bulletin" destination.
  useEffect(() => {
    if (!open) return;
    void bulletinService.list(residentialId).then((result) => {
      if (result.success)
        setBulletins(result.data.filter((b) => b.status === "published"));
    });
    void locationService.list(residentialId).then((result) => {
      if (result.success) {
        setLevels(
          result.data.map((l) => ({
            id: l.id,
            name: l.name,
            type: l.type,
            parentId: l.parent_id ?? null,
          })),
        );
      }
    });
    void unitService.listByResidential(residentialId).then((result) => {
      if (result.success)
        setUnits(
          result.data.map((u) => ({
            id: u.id,
            name: u.name,
            locationId: u.location_id ?? null,
          })),
        );
    });
  }, [open, residentialId]);

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setFields(EMPTY);
      setUnitSearch("");
    }
    onOpenChange(next);
  };

  const needsBulletin = fields.destination === "bulletin";
  const canSubmit =
    fields.title.trim() &&
    fields.body.trim() &&
    (!needsBulletin || fields.bulletinId) &&
    (fields.audience !== "units" ||
      fields.unitIds.length + fields.locationIds.length > 0) &&
    (fields.when === "now" || fields.scheduledDate);

  const handleSubmit = async () => {
    if (!canSubmit) return;
    const sendNow = fields.when === "now";
    const scheduledAt = `${fields.scheduledDate}T${fields.scheduledTime || "09:00"}`;
    if (!sendNow && new Date(scheduledAt).getTime() <= Date.now()) {
      toast.error(t("announcements.toast.scheduleFuture"));
      return;
    }
    const ok = await onSubmit(
      {
        residentialId,
        title: fields.title.trim(),
        body: fields.body.trim(),
        destination: fields.destination,
        bulletinId: needsBulletin ? fields.bulletinId : null,
        audience: fields.audience,
        unitIds: fields.audience === "units" ? fields.unitIds : [],
        locationIds: fields.audience === "units" ? fields.locationIds : [],
        scheduledAt: sendNow
          ? new Date().toISOString()
          : new Date(scheduledAt).toISOString(),
        createdBy,
      },
      sendNow,
    );
    if (ok) handleOpenChange(false);
  };

  const audienceSelect = (
    <Select
      value={fields.audience}
      onValueChange={(v) => set("audience", v as PushAudienceKind)}
      disabled={isSubmitting}
    >
      <SelectTrigger label={t("announcements.form.audienceLabel")}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="everyone">
          {t("announcements.audience.everyone")}
        </SelectItem>
        <SelectItem value="admins">
          {t("announcements.audience.admins")}
        </SelectItem>
        <SelectItem value="units">
          {t("announcements.audience.units")}
        </SelectItem>
      </SelectContent>
    </Select>
  );

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent
        side="right"
        className="w-full overflow-y-auto sm:max-w-4xl"
      >
        <SheetHeader>
          <SheetTitle>{t("announcements.form.title")}</SheetTitle>
          <SheetDescription>
            {t("announcements.form.description")}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 py-6">
          <div className="space-y-4">
            <div className="grid items-start gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <Input
                  label={t("announcements.form.titleLabel")}
                  value={fields.title}
                  maxLength={PUSH_TITLE_MAX}
                  onChange={(e) => set("title", e.target.value)}
                  disabled={isSubmitting}
                />
                <p className="text-right text-xs text-muted-foreground">
                  {fields.title.length}/{PUSH_TITLE_MAX}
                </p>
              </div>
              <Select
                value={fields.when}
                onValueChange={(v) => set("when", v as Fields["when"])}
                disabled={isSubmitting}
              >
                <SelectTrigger label={t("announcements.form.whenLabel")}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="now">
                    {t("announcements.form.when.now")}
                  </SelectItem>
                  <SelectItem value="later">
                    {t("announcements.form.when.later")}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {fields.when === "later" && (
              <div className="grid gap-4 sm:grid-cols-2">
                <DatePicker
                  mode="single"
                  label={t("announcements.form.dateLabel")}
                  value={fields.scheduledDate}
                  onChange={(v) => set("scheduledDate", v)}
                  min={new Date().toLocaleDateString("sv")}
                  disabled={isSubmitting}
                />
                <TimePicker
                  label={t("announcements.form.timeLabel")}
                  value={fields.scheduledTime}
                  onChange={(v) => set("scheduledTime", v)}
                  disabled={isSubmitting}
                />
              </div>
            )}

            <div className="space-y-1">
              <Textarea
                label={t("announcements.form.bodyLabel")}
                value={fields.body}
                maxLength={PUSH_BODY_MAX}
                rows={2}
                className="min-h-[92px]"
                onChange={(e) => set("body", e.target.value)}
                disabled={isSubmitting}
              />
              <div className="flex justify-between gap-3 text-xs text-muted-foreground">
                <span>{t("announcements.form.limitHint")}</span>
                <span className="shrink-0">
                  {fields.body.length}/{PUSH_BODY_MAX}
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="grid items-start gap-4 sm:grid-cols-2">
              <Select
                value={fields.destination}
                onValueChange={(v) => set("destination", v as PushDestination)}
                disabled={isSubmitting}
              >
                <SelectTrigger label={t("announcements.form.destinationLabel")}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PUSH_DESTINATIONS.map((d) => (
                    <SelectItem key={d} value={d}>
                      {t(`announcements.destination.${d}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {needsBulletin ? (
                <div className="space-y-1">
                  <Select
                    value={fields.bulletinId}
                    onValueChange={(v) => set("bulletinId", v)}
                    disabled={isSubmitting}
                  >
                    <SelectTrigger
                      label={t("announcements.form.bulletinLabel")}
                    >
                      <SelectValue
                        placeholder={t(
                          "announcements.form.bulletinPlaceholder",
                        )}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {bulletins.map((b) => (
                        <SelectItem key={b.id} value={b.id}>
                          {b.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {bulletins.length === 0 && (
                    <p className="text-xs text-muted-foreground">
                      {t("announcements.form.noBulletins")}
                    </p>
                  )}
                </div>
              ) : (
                audienceSelect
              )}
            </div>

            {needsBulletin && (
              <div className="grid gap-4 sm:grid-cols-2">{audienceSelect}</div>
            )}

            {fields.audience === "units" && (
              <Tabs defaultValue="levels" className="space-y-3">
                <TabsList>
                  <TabsTrigger value="levels">
                    {t("announcements.form.tabLevels")}
                    {fields.locationIds.length > 0
                      ? ` (${fields.locationIds.length})`
                      : ""}
                  </TabsTrigger>
                  <TabsTrigger value="units">
                    {t("announcements.form.tabUnits")}
                    {fields.unitIds.length > 0
                      ? ` (${fields.unitIds.length})`
                      : ""}
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="levels" className="space-y-2">
                  <LevelPicker
                    levels={levels}
                    unitLocationIds={units.map((u) => u.locationId)}
                    selected={fields.locationIds}
                    onChange={(ids) => set("locationIds", ids)}
                    disabled={isSubmitting}
                  />
                  <p className="text-xs text-muted-foreground">
                    {t("announcements.form.levelsHint")}
                  </p>
                </TabsContent>

                <TabsContent value="units" className="space-y-2">
                  <Input
                    placeholder={t("announcements.form.unitSearch")}
                    value={unitSearch}
                    onChange={(e) => setUnitSearch(e.target.value)}
                    disabled={isSubmitting}
                  />
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>
                      {t("announcements.form.unitsSelected", {
                        count: fields.unitIds.length,
                      })}
                    </span>
                    <button
                      type="button"
                      className="underline"
                      onClick={() =>
                        set(
                          "unitIds",
                          fields.unitIds.length === units.length
                            ? []
                            : units.map((u) => u.id),
                        )
                      }
                    >
                      {t("announcements.form.unitsToggleAll")}
                    </button>
                  </div>
                  <div className="flex max-h-56 flex-col gap-2 overflow-y-auto">
                    {units
                      .filter((u) =>
                        normalizeForSearch(u.name).includes(
                          normalizeForSearch(unitSearch),
                        ),
                      )
                      .map((u) => (
                        <Checkbox
                          key={u.id}
                          checked={fields.unitIds.includes(u.id)}
                          onCheckedChange={(checked) =>
                            set(
                              "unitIds",
                              checked
                                ? [...fields.unitIds, u.id]
                                : fields.unitIds.filter((id) => id !== u.id),
                            )
                          }
                          disabled={isSubmitting}
                          label={u.name}
                        />
                      ))}
                  </div>
                </TabsContent>
              </Tabs>
            )}
          </div>

          <Section title={t("announcements.form.preview")}>
            <div className="rounded-2xl border bg-muted/50 p-3.5">
              <p className="mb-1 text-[11px] uppercase tracking-wide text-muted-foreground">
                Vecinoo · {t("announcements.form.previewNow")}
              </p>
              <p className="truncate text-sm font-semibold">
                {fields.title || t("announcements.form.titleLabel")}
              </p>
              <p className="line-clamp-4 text-sm text-muted-foreground">
                {fields.body || t("announcements.form.bodyLabel")}
              </p>
            </div>
          </Section>
        </div>

        <SheetFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isSubmitting}
          >
            {t("common.cancel")}
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || !canSubmit}>
            {isSubmitting ? (
              <Spinner size="sm" />
            ) : fields.when === "now" ? (
              t("announcements.form.send")
            ) : (
              t("announcements.form.schedule")
            )}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
