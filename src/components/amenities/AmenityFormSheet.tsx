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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
  amenityBookingLimitService,
  amenityImageService,
  amenityServiceService,
  servicesService,
} from "@/services";
import { useI18n } from "@/i18n/useI18n";
import type {
  AmenityBookingLimitRule,
  AmenityServiceSelection,
  BookingLimitPeriod,
  Service,
} from "@/types/amenities.types";

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

const BOOKING_DURATIONS = [30, 60, 90, 120, 180];

const PERIODS: BookingLimitPeriod[] = ["day", "week", "month"];

const NONE = "__none__";

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
  const [availableDays, setAvailableDays] = useState<string[]>([]);
  const [openingTime, setOpeningTime] = useState("");
  const [closingTime, setClosingTime] = useState("");
  const [requiresPayment, setRequiresPayment] = useState(false);
  const [price, setPrice] = useState("");
  const [paymentMethods, setPaymentMethods] = useState<string[]>([]);
  const [bookingDurationMinutes, setBookingDurationMinutes] = useState<string>(NONE);
  const [hasBookingLimit, setHasBookingLimit] = useState(false);
  const [bookingLimits, setBookingLimits] = useState<AmenityBookingLimitRule[]>([]);
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
    setAvailableDays([]);
    setOpeningTime("");
    setClosingTime("");
    setRequiresPayment(false);
    setPrice("");
    setPaymentMethods([]);
    setBookingDurationMinutes(NONE);
    setHasBookingLimit(false);
    setBookingLimits([]);
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
        setAvailableDays(amenity.available_days);
        setOpeningTime(toTimeInputValue(amenity.opening_time));
        setClosingTime(toTimeInputValue(amenity.closing_time));
        setRequiresPayment(amenity.requires_payment);
        setPrice(amenity.price != null ? String(amenity.price) : "");
        setPaymentMethods(amenity.payment_methods);
        setBookingDurationMinutes(
          amenity.booking_duration_minutes != null ? String(amenity.booking_duration_minutes) : NONE,
        );
        setHasBookingLimit(amenity.amenity_booking_limits.length > 0);
        setBookingLimits(
          amenity.amenity_booking_limits.map((l) => ({ maxCount: l.max_count, period: l.period })),
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

  const toggleDay = (code: string) => {
    setAvailableDays((prev) => (prev.includes(code) ? prev.filter((d) => d !== code) : [...prev, code]));
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

    const scalarFields = {
      name: name.trim(),
      description: description || null,
      is_active: isActive,
      capacity: capacity.trim() ? Number(capacity) : null,
      requires_booking: requiresBooking,
      terms: terms || null,
      opening_time: requiresBooking && openingTime ? openingTime : null,
      closing_time: requiresBooking && closingTime ? closingTime : null,
      available_days: requiresBooking ? availableDays : [],
      requires_payment: requiresBooking && requiresPayment,
      price: requiresBooking && requiresPayment && price.trim() ? Number(price) : null,
      payment_methods: requiresBooking && requiresPayment ? paymentMethods : [],
      booking_duration_minutes:
        requiresBooking && bookingDurationMinutes !== NONE ? Number(bookingDurationMinutes) : null,
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
          <SheetHeader className="border-b px-6 py-4">
            <SheetTitle>{isEditMode ? t("amenities.form.title.edit") : t("amenities.form.title.create")}</SheetTitle>
            <SheetDescription>{t("amenities.form.description")}</SheetDescription>
          </SheetHeader>

          {isLoading ? (
            <div className="flex flex-1 items-center justify-center">
              <Spinner />
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto px-6 py-4">
              <Tabs defaultValue="general" className="space-y-4">
                <TabsList>
                  <TabsTrigger value="general">{t("amenities.form.tabs.general")}</TabsTrigger>
                  <TabsTrigger value="services">
                    {t("amenities.form.tabs.services")}{featuredCount > 0 ? ` (${featuredCount})` : ""}
                  </TabsTrigger>
                  <TabsTrigger value="booking">{t("amenities.form.tabs.booking")}</TabsTrigger>
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
                      <div className="space-y-1.5">
                        <p className="text-xs font-medium text-muted-foreground">{t("amenities.form.availableDays.label")}</p>
                        <div className="flex gap-2">
                          {DAYS.map((day) => (
                            <button
                              key={day.code}
                              type="button"
                              disabled={isSubmitting}
                              onClick={() => toggleDay(day.code)}
                              className={`flex h-9 w-9 items-center justify-center rounded-full border text-sm font-medium disabled:cursor-not-allowed disabled:opacity-45 ${
                                availableDays.includes(day.code)
                                  ? "border-primary bg-primary text-primary-foreground"
                                  : "border-input bg-gates-surface text-muted-foreground"
                              }`}
                            >
                              {t(`amenities.form.day.${day.code}` as Parameters<typeof t>[0])}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-2">
                        <Input
                          label={t("amenities.form.openingTime.label")}
                          type="time"
                          value={openingTime}
                          onChange={(e) => setOpeningTime(e.target.value)}
                          disabled={isSubmitting}
                        />
                        <Input
                          label={t("amenities.form.closingTime.label")}
                          type="time"
                          value={closingTime}
                          onChange={(e) => setClosingTime(e.target.value)}
                          disabled={isSubmitting}
                        />
                      </div>

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

                      <Select value={bookingDurationMinutes} onValueChange={setBookingDurationMinutes} disabled={isSubmitting}>
                        <SelectTrigger label={t("amenities.form.bookingDuration.label")}>
                          <SelectValue placeholder={t("amenities.form.selectPlaceholder")} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={NONE}>{t("amenities.form.noLimit")}</SelectItem>
                          {BOOKING_DURATIONS.map((minutes) => (
                            <SelectItem key={minutes} value={String(minutes)}>
                              {t("amenities.form.minutes", { count: minutes })}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

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
                                size="icon"
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

                <TabsContent value="terms">
                  <Textarea
                    label={t("amenities.form.terms.label")}
                    value={terms}
                    onChange={(e) => setTerms(e.target.value)}
                    disabled={isSubmitting}
                    className="min-h-[240px]"
                  />
                </TabsContent>
              </Tabs>
            </div>
          )}

          <SheetFooter className="border-t px-6 py-4">
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
