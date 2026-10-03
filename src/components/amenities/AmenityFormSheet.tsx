/**
 * Create/edit sheet for an amenity — replaces the old inline Dialog in
 * ResidentialDashboardPage. One page with tabs (General / Servicios /
 * Reservaciones / Condiciones) instead of the mobile flow's 5-step wizard,
 * since web has the width for it.
 *
 * Images and service selections are edited as local drafts (same
 * "commit on submit" spirit as AddAddonSheet) and only hit Supabase when
 * the form is actually saved.
 */

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { IconPlus, IconX } from "@tabler/icons-react";
import { TimePicker } from "@/components/ui/time-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { Spinner } from "@/components/LoadingStates";
import { AmenityImageGallery, type GalleryImageDraft } from "@/components/amenities/AmenityImageGallery";
import { AmenityServicesPicker } from "@/components/amenities/AmenityServicesPicker";
import {
  amenitiesService,
  amenityBlackoutService,
  amenityBookingLimitService,
  amenityImageService,
  amenityServiceService,
  servicesService,
} from "@/services";
import { useI18n } from "@/i18n/useI18n";
import type {
  AmenityBlackoutRule,
  AmenityBookingLimitRule,
  AmenityScheduleBlock,
  AmenityServiceSelection,
  BookingLimitPeriod,
  Service,
} from "@/types/amenities.types";
import { DatePicker } from "@/components/ui/date-picker";

const DAYS: { code: string }[] = [
  { code: "mon" },
  { code: "tue" },
  { code: "wed" },
  { code: "thu" },
  { code: "fri" },
  { code: "sat" },
  { code: "sun" },
];

const PAYMENT_METHODS: { value: string }[] = [
  { value: "cash" },
  { value: "card" },
  { value: "transfer" },
];

const PERIODS: BookingLimitPeriod[] = ["day", "week", "month"];

function emptyScheduleBlock(): AmenityScheduleBlock {
  return { days: [], openTime: "", closeTime: "" };
}

function emptyBlackoutRule(): AmenityBlackoutRule {
  return { startDate: "", endDate: "", reason: "" };
}

interface AmenityFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  residentialId: string;
  amenityId?: string | null;
  onSaved: () => void;
}

function toTimeInputValue(value: string | null): string {
  return value ? value.slice(0, 5) : "";
}

// Newer amenities have `schedule` filled in; older ones only have the flat
// opening_time/closing_time/available_days columns — fall back to a single
// block built from those so editing an old amenity doesn't lose its hours.
function scheduleFromAmenity(amenity: {
  schedule: AmenityScheduleBlock[];
  available_days: string[];
  opening_time: string | null;
  closing_time: string | null;
}): AmenityScheduleBlock[] {
  if (amenity.schedule.length > 0) {
    return amenity.schedule.map((block) => ({
      days: block.days,
      openTime: toTimeInputValue(block.openTime),
      closeTime: toTimeInputValue(block.closeTime),
    }));
  }
  if (amenity.available_days.length > 0) {
    return [
      {
        days: amenity.available_days,
        openTime: toTimeInputValue(amenity.opening_time),
        closeTime: toTimeInputValue(amenity.closing_time),
      },
    ];
  }
  return [];
}

export function AmenityFormSheet({ open, onOpenChange, residentialId, amenityId, onSaved }: AmenityFormSheetProps) {
  const { t } = useI18n();
  const isEditMode = Boolean(amenityId);

  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [catalog, setCatalog] = useState<Service[]>([]);

  const [isActive, setIsActive] = useState(true);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [capacity, setCapacity] = useState("");
  const [images, setImages] = useState<GalleryImageDraft[]>([]);
  const [originalImageIds, setOriginalImageIds] = useState<string[]>([]);

  const [serviceSelections, setServiceSelections] = useState<AmenityServiceSelection[]>([]);

  const [requiresBooking, setRequiresBooking] = useState(false);
  const [scheduleBlocks, setScheduleBlocks] = useState<AmenityScheduleBlock[]>([]);
  const [requiresPayment, setRequiresPayment] = useState(false);
  const [price, setPrice] = useState("");
  const [paymentMethods, setPaymentMethods] = useState<string[]>([]);
  const [bookingDurationHours, setBookingDurationHours] = useState("");
  const [hasBookingLimit, setHasBookingLimit] = useState(false);
  const [bookingLimits, setBookingLimits] = useState<AmenityBookingLimitRule[]>([]);
  const [blackouts, setBlackouts] = useState<AmenityBlackoutRule[]>([]);
  const [requiresCleaning, setRequiresCleaning] = useState(false);
  const [cleanupMinutes, setCleanupMinutes] = useState("");

  const [terms, setTerms] = useState("");

  const resetForm = () => {
    setIsActive(true);
    setName("");
    setDescription("");
    setCapacity("");
    setImages([]);
    setOriginalImageIds([]);
    setServiceSelections([]);
    setRequiresBooking(false);
    setScheduleBlocks([]);
    setRequiresPayment(false);
    setPrice("");
    setPaymentMethods([]);
    setBookingDurationHours("");
    setHasBookingLimit(false);
    setBookingLimits([]);
    setBlackouts([]);
    setRequiresCleaning(false);
    setCleanupMinutes("");
    setTerms("");
  };

  useEffect(() => {
    if (!open) return;

    let cancelled = false;

    const load = async () => {
      setIsLoading(true);

      const catalogResult = await servicesService.list(residentialId);
      if (!cancelled && catalogResult.success) setCatalog(catalogResult.data);

      if (amenityId) {
        const result = await amenitiesService.getByIdWithDetails(amenityId);
        if (cancelled) return;

        if (!result.success || !result.data) {
          toast.error(result.success ? t("amenities.form.error.notFound") : result.error.message);
          setIsLoading(false);
          return;
        }

        const amenity = result.data;
        setIsActive(amenity.is_active);
        setName(amenity.name);
        setDescription(amenity.description ?? "");
        setCapacity(amenity.capacity != null ? String(amenity.capacity) : "");
        setRequiresBooking(amenity.requires_booking);
        setScheduleBlocks(scheduleFromAmenity(amenity));
        setRequiresPayment(amenity.requires_payment);
        setPrice(amenity.price != null ? String(amenity.price) : "");
        setPaymentMethods(amenity.payment_methods);
        setBookingDurationHours(
          amenity.booking_duration_minutes != null ? String(amenity.booking_duration_minutes / 60) : "",
        );
        setHasBookingLimit(amenity.amenity_booking_limits.length > 0);
        setBookingLimits(
          amenity.amenity_booking_limits.map((l) => ({ maxCount: l.max_count, period: l.period })),
        );
        setBlackouts(
          [...amenity.amenity_blackouts]
            .sort((a, b) => a.start_date.localeCompare(b.start_date))
            .map((b) => ({ startDate: b.start_date, endDate: b.end_date, reason: b.reason ?? "" })),
        );
        setRequiresCleaning(amenity.requires_cleaning);
        setCleanupMinutes(amenity.cleanup_minutes != null ? String(amenity.cleanup_minutes) : "");
        setTerms(amenity.terms ?? "");
        setServiceSelections(
          amenity.amenity_services.map((s) => ({ serviceId: s.service_id, isFeatured: s.is_featured })),
        );

        const sortedImages = [...amenity.amenity_images].sort((a, b) => a.sort_order - b.sort_order);
        setOriginalImageIds(sortedImages.map((img) => img.id));
        const signedUrls = await Promise.all(
          sortedImages.map((img) => amenityImageService.getSignedUrl(img.storage_path)),
        );
        if (cancelled) return;
        setImages(
          sortedImages.map((img, i) => ({
            id: img.id,
            previewUrl: signedUrls[i].success ? signedUrls[i].data : "",
            isPrimary: img.is_primary,
          })),
        );
      } else {
        resetForm();
      }

      setIsLoading(false);
    };

    void load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, amenityId, residentialId]);

  const addScheduleBlock = () => {
    setScheduleBlocks((prev) => [...prev, emptyScheduleBlock()]);
  };

  const updateScheduleBlock = (index: number, patch: Partial<AmenityScheduleBlock>) => {
    setScheduleBlocks((prev) => prev.map((block, i) => (i === index ? { ...block, ...patch } : block)));
  };

  const removeScheduleBlock = (index: number) => {
    setScheduleBlocks((prev) => prev.filter((_, i) => i !== index));
  };

  const toggleScheduleBlockDay = (index: number, code: string) => {
    setScheduleBlocks((prev) =>
      prev.map((block, i) =>
        i === index
          ? { ...block, days: block.days.includes(code) ? block.days.filter((d) => d !== code) : [...block.days, code] }
          : block,
      ),
    );
  };

  const togglePaymentMethod = (value: string) => {
    setPaymentMethods((prev) => (prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]));
  };

  const addBookingLimit = () => {
    setBookingLimits((prev) => [...prev, { maxCount: 1, period: "day" }]);
  };

  const updateBookingLimit = (index: number, patch: Partial<AmenityBookingLimitRule>) => {
    setBookingLimits((prev) => prev.map((rule, i) => (i === index ? { ...rule, ...patch } : rule)));
  };

  const removeBookingLimit = (index: number) => {
    setBookingLimits((prev) => prev.filter((_, i) => i !== index));
  };

  const effectiveBookingLimits = hasBookingLimit ? bookingLimits : [];

  const addBlackout = () => {
    setBlackouts((prev) => [...prev, emptyBlackoutRule()]);
  };

  const updateBlackout = (index: number, patch: Partial<AmenityBlackoutRule>) => {
    setBlackouts((prev) => prev.map((rule, i) => (i === index ? { ...rule, ...patch } : rule)));
  };

  const removeBlackout = (index: number) => {
    setBlackouts((prev) => prev.filter((_, i) => i !== index));
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && !isSubmitting) resetForm();
    onOpenChange(nextOpen);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error(t("amenities.form.error.nameRequired"));
      return;
    }

    setIsSubmitting(true);

    // Keep the old flat columns in sync (union of days, earliest open,
    // latest close) so anything still reading them, like gates-app, keeps
    // working even though hours can now differ per day group.
    const validScheduleBlocks = scheduleBlocks.filter(
      (block) => block.days.length > 0 && block.openTime && block.closeTime,
    );
    const allScheduleDays = Array.from(new Set(validScheduleBlocks.flatMap((block) => block.days)));
    const earliestOpen = validScheduleBlocks.map((block) => block.openTime).sort()[0] ?? null;
    const latestClose = validScheduleBlocks.map((block) => block.closeTime).sort().at(-1) ?? null;

    const scalarFields = {
      name: name.trim(),
      description: description || null,
      is_active: isActive,
      capacity: capacity.trim() ? Number(capacity) : null,
      requires_booking: requiresBooking,
      terms: terms || null,
      opening_time: requiresBooking ? earliestOpen : null,
      closing_time: requiresBooking ? latestClose : null,
      available_days: requiresBooking ? allScheduleDays : [],
      schedule: requiresBooking ? validScheduleBlocks : [],
      requires_payment: requiresBooking && requiresPayment,
      price: requiresBooking && requiresPayment && price.trim() ? Number(price) : null,
      payment_methods: requiresBooking && requiresPayment ? paymentMethods : [],
      booking_duration_minutes:
        requiresBooking && bookingDurationHours.trim() ? Math.round(Number(bookingDurationHours) * 60) : null,
      requires_cleaning: requiresBooking && requiresCleaning,
      cleanup_minutes: requiresBooking && requiresCleaning && cleanupMinutes.trim() ? Number(cleanupMinutes) : null,
    };

    let currentAmenityId = amenityId ?? null;

    if (currentAmenityId) {
      const result = await amenitiesService.update(currentAmenityId, scalarFields);
      if (!result.success) {
        toast.error(result.error.message);
        setIsSubmitting(false);
        return;
      }
    } else {
      const result = await amenitiesService.create({ residential_id: residentialId, ...scalarFields });
      if (!result.success) {
        toast.error(result.error.message);
        setIsSubmitting(false);
        return;
      }
      currentAmenityId = result.data.id;
    }

    // Images: delete removed ones, upload new ones, then reconcile primary.
    const removedImageIds = originalImageIds.filter((id) => !images.some((img) => img.id === id));
    for (const id of removedImageIds) {
      await amenityImageService.delete(id);
    }

    let primaryId: string | null = null;
    for (let i = 0; i < images.length; i++) {
      const img = images[i];
      if (img.file) {
        const uploadResult = await amenityImageService.upload(currentAmenityId, residentialId, img.file, i);
        if (!uploadResult.success) {
          toast.error(uploadResult.error.message);
          continue;
        }
        if (img.isPrimary) primaryId = uploadResult.data.id;
      } else if (img.isPrimary) {
        primaryId = img.id;
      }
    }
    if (primaryId) {
      await amenityImageService.setPrimary(primaryId, currentAmenityId);
    }

    const servicesResult = await amenityServiceService.replaceForAmenity(currentAmenityId, serviceSelections);
    if (!servicesResult.success) toast.error(servicesResult.error.message);

    const limitsResult = await amenityBookingLimitService.replaceForAmenity(currentAmenityId, effectiveBookingLimits);
    if (!limitsResult.success) toast.error(limitsResult.error.message);

    const validBlackouts = requiresBooking
      ? blackouts.filter((b) => b.startDate && b.endDate && b.endDate >= b.startDate)
      : [];
    const blackoutsResult = await amenityBlackoutService.replaceForAmenity(
      currentAmenityId,
      residentialId,
      validBlackouts,
    );
    if (!blackoutsResult.success) toast.error(blackoutsResult.error.message);

    setIsSubmitting(false);
    toast.success(isEditMode ? t("amenities.form.success.updated") : t("amenities.form.success.created"));
    onSaved();
    handleOpenChange(false);
  };

  const isBusy = isLoading || isSubmitting;
  const featuredCount = useMemo(() => serviceSelections.filter((s) => s.isFeatured).length, [serviceSelections]);

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent side="right" className="flex h-full w-full flex-col gap-0 p-0 sm:max-w-[720px]">
          <SheetHeader className="border-b px-4 py-4 sm:px-6">
            <SheetTitle>{isEditMode ? t("amenities.form.title.edit") : t("amenities.form.title.create")}</SheetTitle>
            <SheetDescription>{t("amenities.form.description")}</SheetDescription>
          </SheetHeader>

          {isLoading ? (
            <div className="flex flex-1 items-center justify-center">
              <Spinner />
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6">
              <Tabs defaultValue="general" className="space-y-4">
                <TabsList>
                  <TabsTrigger value="general">{t("amenities.form.tabs.general")}</TabsTrigger>
                  <TabsTrigger value="services">
                    {t("amenities.form.tabs.services")}{featuredCount > 0 ? ` (${featuredCount})` : ""}
                  </TabsTrigger>
                  <TabsTrigger value="booking">{t("amenities.form.tabs.booking")}</TabsTrigger>
                  <TabsTrigger value="schedule">{t("amenities.form.tabs.schedule")}</TabsTrigger>
                  <TabsTrigger value="terms">{t("amenities.form.tabs.terms")}</TabsTrigger>
                </TabsList>

                <TabsContent value="general" className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{t("amenities.form.active.label")}</span>
                    <Switch checked={isActive} onCheckedChange={setIsActive} disabled={isSubmitting} />
                  </div>

                  <Input
                    label={t("common.name")}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={isSubmitting}
                  />

                  <div className="space-y-1.5">
                    <p className="text-xs font-medium text-muted-foreground">{t("common.description")}</p>
                    <RichTextEditor value={description} onChange={setDescription} disabled={isSubmitting} />
                  </div>

                  <Input
                    label={t("amenities.form.capacity.label")}
                    type="number"
                    min={1}
                    value={capacity}
                    onChange={(e) => setCapacity(e.target.value)}
                    disabled={isSubmitting}
                  />

                  <div className="space-y-1.5">
                    <p className="text-xs font-medium text-muted-foreground">{t("amenities.form.photos.label")}</p>
                    <AmenityImageGallery images={images} onChange={setImages} disabled={isSubmitting} />
                  </div>
                </TabsContent>

                <TabsContent value="services">
                  <AmenityServicesPicker
                    services={catalog}
                    selections={serviceSelections}
                    onChange={setServiceSelections}
                    disabled={isSubmitting}
                  />
                </TabsContent>

                <TabsContent value="booking" className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{t("amenities.form.requiresBooking.label")}</span>
                    <Switch checked={requiresBooking} onCheckedChange={setRequiresBooking} disabled={isSubmitting} />
                  </div>

                  {requiresBooking && (
                    <>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{t("amenities.form.requiresPayment.label")}</span>
                        <Switch checked={requiresPayment} onCheckedChange={setRequiresPayment} disabled={isSubmitting} />
                      </div>

                      {requiresPayment && (
                        <>
                          <Input
                            label={t("common.price")}
                            type="number"
                            min={0}
                            step="0.01"
                            value={price}
                            onChange={(e) => setPrice(e.target.value)}
                            disabled={isSubmitting}
                          />
                          <div className="space-y-1.5">
                            <p className="text-xs font-medium text-muted-foreground">{t("amenities.form.paymentMethods.label")}</p>
                            <div className="flex flex-col gap-2">
                              {PAYMENT_METHODS.map((method) => (
                                <Checkbox
                                  key={method.value}
                                  checked={paymentMethods.includes(method.value)}
                                  onCheckedChange={() => togglePaymentMethod(method.value)}
                                  disabled={isSubmitting}
                                  label={t(`amenities.form.payment.${method.value}` as Parameters<typeof t>[0])}
                                />
                              ))}
                            </div>
                          </div>
                        </>
                      )}

                      <Input
                        label={t("amenities.form.bookingDuration.label")}
                        type="number"
                        min={0}
                        step="0.5"
                        placeholder={t("amenities.form.noLimit")}
                        value={bookingDurationHours}
                        onChange={(e) => setBookingDurationHours(e.target.value)}
                        disabled={isSubmitting}
                      />

                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{t("amenities.form.hasBookingLimit.label")}</span>
                        <Switch checked={hasBookingLimit} onCheckedChange={setHasBookingLimit} disabled={isSubmitting} />
                      </div>

                      {hasBookingLimit && (
                        <div className="space-y-2">
                          {bookingLimits.map((rule, index) => (
                            <div key={index} className="flex items-center gap-2">
                              <Select
                                value={rule.period}
                                onValueChange={(v) => updateBookingLimit(index, { period: v as BookingLimitPeriod })}
                                disabled={isSubmitting}
                              >
                                <SelectTrigger className="flex-1">
                                  <SelectValue placeholder={t("amenities.form.selectPlaceholder")} />
                                </SelectTrigger>
                                <SelectContent>
                                  {PERIODS.map((period) => (
                                    <SelectItem key={period} value={period}>
                                      {t(`amenities.form.periodOption.${period}` as Parameters<typeof t>[0])}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <Input
                                type="number"
                                min={1}
                                value={rule.maxCount}
                                onChange={(e) => updateBookingLimit(index, { maxCount: Number(e.target.value) })}
                                disabled={isSubmitting}
                                className="w-20"
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon-sm"
                                onClick={() => removeBookingLimit(index)}
                                disabled={isSubmitting}
                              >
                                <IconX className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                          <Button type="button" variant="outline" size="sm" onClick={addBookingLimit} disabled={isSubmitting}>
                            <IconPlus className="h-4 w-4" />
                            <span className="ml-1">{t("amenities.form.addLimitRule")}</span>
                          </Button>
                        </div>
                      )}

                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{t("amenities.form.requiresCleaning.label")}</span>
                        <Switch checked={requiresCleaning} onCheckedChange={setRequiresCleaning} disabled={isSubmitting} />
                      </div>

                      {requiresCleaning && (
                        <Input
                          label={t("amenities.form.cleanupMinutes.label")}
                          type="number"
                          min={1}
                          value={cleanupMinutes}
                          onChange={(e) => setCleanupMinutes(e.target.value)}
                          disabled={isSubmitting}
                        />
                      )}
                    </>
                  )}
                </TabsContent>

                <TabsContent value="schedule" className="space-y-2">
                  {requiresBooking ? (
                    <>
                      <p className="text-xs font-medium text-muted-foreground">{t("amenities.form.schedule.label")}</p>
                      <p className="text-xs text-muted-foreground">{t("amenities.form.schedule.hint")}</p>

                      {scheduleBlocks.map((block, index) => (
                        <div key={index} className="space-y-2 rounded-lg border border-input p-3">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-muted-foreground">
                              {t("amenities.form.scheduleBlock.title", { number: index + 1 })}
                            </span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => removeScheduleBlock(index)}
                              disabled={isSubmitting}
                            >
                              <IconX className="h-4 w-4" />
                            </Button>
                          </div>

                          <div className="flex gap-2">
                            {DAYS.map((day) => (
                              <button
                                key={day.code}
                                type="button"
                                disabled={isSubmitting}
                                onClick={() => toggleScheduleBlockDay(index, day.code)}
                                className={`flex h-9 w-9 items-center justify-center rounded-full border text-sm font-medium disabled:cursor-not-allowed disabled:opacity-45 ${
                                  block.days.includes(day.code)
                                    ? "border-primary bg-primary text-primary-foreground"
                                    : "border-input bg-gates-surface text-muted-foreground"
                                }`}
                              >
                                {t(`amenities.form.day.${day.code}` as Parameters<typeof t>[0])}
                              </button>
                            ))}
                          </div>

                          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                            <TimePicker
                              label={t("amenities.form.openingTime.label")}
                              value={block.openTime}
                              onChange={(value) => updateScheduleBlock(index, { openTime: value })}
                              disabled={isSubmitting}
                            />
                            <TimePicker
                              label={t("amenities.form.closingTime.label")}
                              value={block.closeTime}
                              onChange={(value) => updateScheduleBlock(index, { closeTime: value })}
                              disabled={isSubmitting}
                            />
                          </div>
                        </div>
                      ))}

                      <Button type="button" variant="outline" size="sm" onClick={addScheduleBlock} disabled={isSubmitting}>
                        <IconPlus className="h-4 w-4" />
                        <span className="ml-1">{t("amenities.form.scheduleBlock.add")}</span>
                      </Button>

                      <div className="space-y-2 border-t pt-4">
                        <p className="text-xs font-medium text-muted-foreground">{t("amenities.form.blackouts.label")}</p>
                        <p className="text-xs text-muted-foreground">{t("amenities.form.blackouts.hint")}</p>

                        {blackouts.map((rule, index) => (
                          <div key={index} className="space-y-2 rounded-lg border border-input p-3">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-medium text-muted-foreground">
                                {t("amenities.form.blackout.title", { number: index + 1 })}
                              </span>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon-sm"
                                onClick={() => removeBlackout(index)}
                                disabled={isSubmitting}
                              >
                                <IconX className="h-4 w-4" />
                              </Button>
                            </div>

                            <DatePicker
                              mode="range"
                              label={`${t("amenities.form.blackout.startDate.label")} – ${t("amenities.form.blackout.endDate.label")}`}
                              value={{ from: rule.startDate, to: rule.endDate }}
                              onChange={(range) => updateBlackout(index, { startDate: range.from, endDate: range.to })}
                              disabled={isSubmitting}
                            />

                            <Input
                              label={t("amenities.form.blackout.reason.label")}
                              placeholder={t("amenities.form.blackout.reason.placeholder")}
                              value={rule.reason}
                              onChange={(e) => updateBlackout(index, { reason: e.target.value })}
                              disabled={isSubmitting}
                            />

                            {rule.startDate && rule.endDate && rule.endDate < rule.startDate ? (
                              <p className="text-sm text-destructive">{t("amenities.form.blackout.dateOrderError")}</p>
                            ) : null}
                          </div>
                        ))}

                        <Button type="button" variant="outline" size="sm" onClick={addBlackout} disabled={isSubmitting}>
                          <IconPlus className="h-4 w-4" />
                          <span className="ml-1">{t("amenities.form.blackout.add")}</span>
                        </Button>
                      </div>
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground">{t("amenities.form.schedule.requiresBookingHint")}</p>
                  )}
                </TabsContent>

                <TabsContent value="terms" className="space-y-1.5">
                  <p className="text-xs font-medium text-muted-foreground">{t("amenities.form.terms.label")}</p>
                  <RichTextEditor value={terms} onChange={setTerms} disabled={isSubmitting} />
                </TabsContent>
              </Tabs>
            </div>
          )}

          <SheetFooter className="border-t px-4 py-4 sm:px-6">
            <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={isSubmitting}>
              {t("common.cancel")}
            </Button>
            <Button onClick={handleSave} disabled={isBusy || !name.trim()}>
              {isSubmitting ? <Spinner size="sm" /> : t("common.save")}
            </Button>
          </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
