/**
 * Guard (security role) version of the Visits screen. Optimised for finding a
 * visit fast and logging entry/exit: unified search, three primary tabs,
 * single-column cards on phones, and on tablets a compact icon rail with wide
 * rows and a side panel that keeps the list in view. Data and mutations come
 * from VisitorsPage / useVisitorManagerData — this file is presentation only.
 */

import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  IconAdjustmentsHorizontal,
  IconDots,
  IconPlus,
  IconQrcode,
  IconSearch,
  IconX,
} from "@tabler/icons-react";
import { AppSidebar } from "@/components/AppSidebar";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EmptyState } from "@/components/ui/empty-state";
import { ImageViewerDialog } from "@/components/ui/image-viewer-dialog";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useQuery } from "@/hooks/useQuery";
import type { MessageKey } from "@/i18n/messages";
import { useI18n } from "@/i18n/useI18n";
import { fromIso, toIso } from "@/lib/date-iso";
import { cn } from "@/lib/utils";
import { residentialService, visitorService, type UnitWithOwner } from "@/services";
import type { ResidentialRole } from "@/types/database.types";
import type { Location } from "@/types/unit-wizard.types";
import type { VisitorWithInviter } from "@/types/visitor.types";
import { VisitDetail } from "./VisitDetail";
import { VisitFilters } from "./VisitFilters";
import { VisitItem } from "./VisitItem";
import { QrScannerDialog } from "./QrScannerDialog";
import { parseAccessCode, qrVerdict, type QrVerdict } from "./qrAccess";
import { countActiveFilters, EMPTY_FILTERS, unitInfo, type SecurityFilters } from "./securityVisits";
import { useMediaQuery } from "./useMediaQuery";

export type SecurityTab = "today" | "inside" | "upcoming" | "history" | "frequent";

export interface SecurityBuckets {
  today: VisitorWithInviter[];
  inside: VisitorWithInviter[];
  upcoming: VisitorWithInviter[];
  history: VisitorWithInviter[];
  frequent: VisitorWithInviter[];
}

interface SecurityVisitorsViewProps {
  residentialId: string;
  userEmail?: string | null;
  buckets: SecurityBuckets;
  units: UnitWithOwner[];
  locations: Location[];
  staffRoles: Map<string, ResidentialRole>;
  isLoading: boolean;
  isSubmitting: boolean;
  canCreate: boolean;
  canCheckInOut: boolean;
  search: string;
  onSearchChange: (value: string) => void;
  filters: SecurityFilters;
  onFiltersChange: (value: SecurityFilters) => void;
  historyRange: { from: Date; to: Date };
  onHistoryRangeChange: (range: { from: Date; to: Date }) => void;
  onNew: () => void;
  onCheckIn: (id: string) => void | Promise<void>;
  onCheckOut: (id: string) => void | Promise<void>;
  onUploadIdPhoto: (id: string, file: File) => Promise<boolean>;
  onSignOut: () => void;
}

/** Outcome of reading a QR: a visit that can enter, or why the QR is rejected. */
type ScanResult =
  | { kind: "unknown" }
  | { kind: "rejected"; verdict: Exclude<QrVerdict, "ok">; visitor: VisitorWithInviter }
  | { kind: "ok"; visitor: VisitorWithInviter };

type Panel = { kind: "detail"; id: string } | { kind: "filters" } | null;

export function SecurityVisitorsView(props: SecurityVisitorsViewProps) {
  const { buckets, units, locations, staffRoles, search, filters, canCheckInOut } = props;
  const { t } = useI18n();
  const [tab, setTab] = useState<SecurityTab>("today");
  const [panel, setPanel] = useState<Panel>(null);
  const [exitTarget, setExitTarget] = useState<VisitorWithInviter | null>(null);
  const [viewer, setViewer] = useState<{ src: string; title: string } | null>(null);
  const [scanOpen, setScanOpen] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const photoTarget = useRef<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const cameraInput = useRef<HTMLInputElement>(null);

  const isTablet = useMediaQuery("(min-width: 768px)");
  const isWide = useMediaQuery("(min-width: 1280px)");

  const { data: residential } = useQuery(() => residentialService.getById(props.residentialId), {
    enabled: Boolean(props.residentialId),
  });
  const list = buckets[tab];
  const activeFilters = countActiveFilters(filters);
  const hasCriteria = activeFilters > 0 || search.trim().length > 0;

  const selected = useMemo(() => {
    if (panel?.kind !== "detail") return null;
    return Object.values(buckets).flat().find((v) => v.id === panel.id) ?? null;
  }, [panel, buckets]);

  const clearAll = () => {
    props.onSearchChange("");
    props.onFiltersChange(EMPTY_FILTERS);
  };

  const pickPhoto = (id: string, source: "camera" | "file") => {
    photoTarget.current = id;
    (source === "camera" ? cameraInput : fileInput).current?.click();
  };

  const viewPhoto = async (visitor: VisitorWithInviter) => {
    if (!visitor.id_photo_path) return;
    const result = await visitorService.getIdPhotoUrl(visitor.id_photo_path);
    if (!result.success) {
      toast.error(result.error.message);
      return;
    }
    setViewer({ src: result.data, title: visitor.name ?? t("visitors.table.pendingRegistration") });
  };

  const onPhotoChosen = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const target = photoTarget.current;
    e.target.value = "";
    if (file && target) await props.onUploadIdPhoto(target, file);
  };

  const handleScan = async (raw: string) => {
    setScanOpen(false);
    const code = parseAccessCode(raw);
    const result = code ? await visitorService.getByAccessCode(code, props.residentialId) : null;
    if (result && !result.success) {
      toast.error(result.error.message);
      return;
    }
    const visitor = result?.data ?? null;
    if (!visitor) return setScanResult({ kind: "unknown" });
    const verdict = qrVerdict(visitor);
    setScanResult(verdict === "ok" ? { kind: "ok", visitor } : { kind: "rejected", verdict, visitor });
  };

  const admitScanned = async (id: string) => {
    setScanResult(null);
    await props.onCheckIn(id);
  };

  const confirmExit = async () => {
    if (!exitTarget) return;
    const id = exitTarget.id;
    setExitTarget(null);
    await props.onCheckOut(id);
  };

  const tabs: { id: SecurityTab; label: string }[] = [
    { id: "today", label: t("security.visits.tabs.today") },
    { id: "inside", label: t("security.visits.tabs.inside", { count: buckets.inside.length }) },
    { id: "upcoming", label: t("security.visits.tabs.upcoming") },
  ];
  const moreActive = tab === "history" || tab === "frequent";
  const tabTitle =
    tab === "history" ? t("visitors.tabs.historyPlain") : tab === "frequent" ? t("visitors.type.frequent") : null;

  const emptyKey: Record<SecurityTab, MessageKey> = {
    today: "visitors.empty.today",
    inside: "visitors.empty.inside",
    upcoming: "visitors.empty.upcoming",
    history: "visitors.empty.history",
    frequent: "visitors.empty.frequent",
  };

  const panelContent =
    panel?.kind === "filters" ? (
      <VisitFilters value={filters} resultCount={list.length} onChange={props.onFiltersChange} onDone={() => setPanel(null)} />
    ) : selected ? (
      <VisitDetail
        visitor={selected}
        unit={unitInfo(selected.unit_id, units, locations)}
        inviterRole={selected.invited_by ? staffRoles.get(selected.invited_by) : undefined}
        busy={props.isSubmitting}
        canCheckInOut={canCheckInOut}
        onEnter={() => void props.onCheckIn(selected.id)}
        onExit={() => setExitTarget(selected)}
        onPickPhoto={(source) => pickPhoto(selected.id, source)}
        onViewPhoto={() => void viewPhoto(selected)}
      />
    ) : null;
  const panelTitle = panel?.kind === "filters" ? t("security.visits.filters.title") : t("security.visits.detail.title");

  return (
    <div className="min-h-screen lg:pl-64">
      <AppSidebar userEmail={props.userEmail ?? undefined} residentialId={props.residentialId} role="security" onSignOut={props.onSignOut} showUserMenu />

      <div className="flex">
        <main className="min-w-0 flex-1 px-4 pb-6 pt-4 md:px-6">
          {/* Header */}
          <header className="mb-4">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <h1 className="text-2xl font-semibold text-gates-text-primary">{t("visitors.title")}</h1>
                {residential?.name && <p className="truncate text-sm text-gates-text-secondary">{residential.name}</p>}
              </div>
              <div className="flex shrink-0 items-center gap-2">
              {canCheckInOut && (
                <Button variant="outline" onClick={() => setScanOpen(true)}>
                  <IconQrcode aria-hidden />
                  {t("security.visits.scan.button")}
                </Button>
              )}
              {props.canCreate && (
                <Button onClick={props.onNew}>
                  <IconPlus aria-hidden />
                  {t("security.visits.new")}
                </Button>
              )}
              </div>
            </div>
          </header>

          {/* Search + filters */}
          <div className="flex gap-2">
            <div className="relative min-w-0 flex-1">
              <IconSearch className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-gates-text-secondary" aria-hidden />
              <input
                type="search"
                value={search}
                onChange={(e) => props.onSearchChange(e.target.value)}
                aria-label={t("security.visits.search.label")}
                placeholder={t("security.visits.search.placeholder")}
                className="h-12 w-full rounded-full border border-input bg-gates-surface pl-12 pr-4 text-base outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
            <Button
              variant={activeFilters > 0 ? "default" : "outline"}
              className="h-12 w-12 shrink-0 px-0 sm:w-auto sm:px-5"
              aria-label={t("security.visits.filters.button")}
              onClick={() => setPanel(panel?.kind === "filters" ? null : { kind: "filters" })}
            >
              <IconAdjustmentsHorizontal aria-hidden />
              <span className="hidden sm:inline">{t("security.visits.filters.button")}</span>
              {activeFilters > 0 && (
                <span className="flex size-5 items-center justify-center rounded-full bg-gates-surface text-xs font-bold text-gates-text-brand">
                  {activeFilters}
                </span>
              )}
            </Button>
          </div>

          {/* Active filter chips */}
          {activeFilters > 0 && (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {filters.type !== "all" && (
                <Chip label={t(`visitors.type.${filters.type}` as MessageKey)} onRemove={() => props.onFiltersChange({ ...filters, type: "all" })} />
              )}
              {filters.invitedBy.trim() && (
                <Chip label={t("security.visits.invitedBy", { name: filters.invitedBy.trim() })} onRemove={() => props.onFiltersChange({ ...filters, invitedBy: "" })} />
              )}
              {filters.doc !== "all" && (
                <Chip label={t(`security.visits.filters.doc.${filters.doc}` as MessageKey)} onRemove={() => props.onFiltersChange({ ...filters, doc: "all" })} />
              )}
              <button type="button" onClick={() => props.onFiltersChange(EMPTY_FILTERS)} className="min-h-11 px-2 text-sm font-semibold text-gates-text-brand underline-offset-4 hover:underline">
                {t("security.visits.filters.clear")}
              </button>
            </div>
          )}

          {/* Tabs */}
          <div role="tablist" aria-label={t("visitors.title")} className="mt-3 flex gap-1 rounded-full bg-gates-subtle p-1">
            {tabs.map((item) => (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={tab === item.id}
                onClick={() => setTab(item.id)}
                className={cn(
                  "min-h-11 min-w-0 flex-1 truncate rounded-full px-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  tab === item.id ? "bg-gates-surface text-gates-text-brand shadow-gates-card" : "text-gates-text-secondary",
                )}
              >
                {item.label}
              </button>
            ))}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  aria-label={t("security.visits.tabs.more")}
                  className={cn(
                    "flex min-h-11 w-12 shrink-0 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    moreActive ? "bg-gates-surface text-gates-text-brand shadow-gates-card" : "text-gates-text-secondary",
                  )}
                >
                  <IconDots className="size-5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem className="min-h-11" onClick={() => setTab("history")}>
                  {t("visitors.tabs.historyPlain")}
                </DropdownMenuItem>
                <DropdownMenuItem className="min-h-11" onClick={() => setTab("frequent")}>
                  {t("visitors.type.frequent")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {tabTitle && (
            <div className="mt-4 flex flex-wrap items-end justify-between gap-2">
              <h2 className="text-lg font-semibold text-gates-text-primary">{tabTitle}</h2>
              {tab === "history" && (
                <DatePicker
                  mode="range"
                  label={t("security.visits.history.range")}
                  value={{ from: toIso(props.historyRange.from), to: toIso(props.historyRange.to) }}
                  onChange={(range) => {
                    const from = fromIso(range.from);
                    const to = fromIso(range.to);
                    if (from && to) props.onHistoryRangeChange({ from, to });
                  }}
                  className="w-full sm:max-w-xs"
                />
              )}
            </div>
          )}

          {/* List */}
          <div className="mt-4 space-y-3" aria-live="polite">
            {props.isLoading ? (
              <EmptyState type="loading" title={t("security.visits.loading")} />
            ) : list.length === 0 ? (
              hasCriteria ? (
                <EmptyState
                  title={t("security.visits.noResults.title")}
                  description={t("security.visits.noResults.body")}
                  action={<Button variant="outline" onClick={clearAll}>{t("security.visits.noResults.clear")}</Button>}
                />
              ) : (
                <EmptyState title={t("security.visits.empty.title")} description={t(emptyKey[tab])} />
              )
            ) : (
              list.map((visitor) => (
                <VisitItem
                  key={visitor.id}
                  visitor={visitor}
                  unit={unitInfo(visitor.unit_id, units, locations)}
                  selected={panel?.kind === "detail" && panel.id === visitor.id}
                  busy={props.isSubmitting}
                  canCheckInOut={canCheckInOut}
                  onOpen={() => setPanel({ kind: "detail", id: visitor.id })}
                  onEnter={() => void props.onCheckIn(visitor.id)}
                  onExit={() => setExitTarget(visitor)}
                />
              ))
            )}
          </div>
        </main>

        {/* Inline side panel (wide tablets / landscape): keeps the list in context */}
        {isWide && panelContent && (
          <aside aria-label={panelTitle} className="sticky top-0 h-screen w-[380px] shrink-0 overflow-y-auto border-l border-gates-border bg-gates-canvas p-5">
            <div className="mb-4 flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold uppercase tracking-tight text-gates-text-secondary">{panelTitle}</h2>
              <Button variant="ghost" size="icon" aria-label={t("common.close")} onClick={() => setPanel(null)}>
                <IconX className="size-5" />
              </Button>
            </div>
            {panelContent}
          </aside>
        )}
      </div>

      {/* Overlay panel: bottom sheet on phones, side sheet on portrait tablets */}
      <Sheet open={!isWide && panelContent !== null} onOpenChange={(open) => !open && setPanel(null)}>
        <SheetContent
          side={isTablet ? "right" : "bottom"}
          className={cn(
            "overflow-y-auto",
            isTablet ? "w-[400px] max-w-full sm:max-w-[400px]" : "h-auto max-h-[88vh] rounded-t-gates-lg pb-[calc(1.5rem+env(safe-area-inset-bottom))]",
          )}
        >
          <SheetHeader className="mb-4 pr-10">
            <SheetTitle>{panelTitle}</SheetTitle>
            <SheetDescription className="sr-only">{panelTitle}</SheetDescription>
          </SheetHeader>
          {panelContent}
        </SheetContent>
      </Sheet>

      <QrScannerDialog open={scanOpen} onOpenChange={setScanOpen} onScan={(raw) => void handleScan(raw)} />

      {/* QR result: visit details with the entry action, or why the QR was rejected */}
      <Sheet open={scanResult !== null} onOpenChange={(open) => !open && setScanResult(null)}>
        <SheetContent side={isTablet ? "right" : "bottom"} className={cn("overflow-y-auto", isTablet ? "w-[400px] max-w-full sm:max-w-[400px]" : "h-auto max-h-[88vh] rounded-t-gates-lg pb-[calc(1.5rem+env(safe-area-inset-bottom))]")}>
          <SheetHeader className="mb-4 pr-10">
            <SheetTitle>{t("security.visits.scan.title")}</SheetTitle>
            <SheetDescription className="sr-only">{t("security.visits.scan.hint")}</SheetDescription>
          </SheetHeader>
          {scanResult?.kind === "ok" && (
            <VisitDetail
              visitor={scanResult.visitor}
              unit={unitInfo(scanResult.visitor.unit_id, units, locations)}
              inviterRole={scanResult.visitor.invited_by ? staffRoles.get(scanResult.visitor.invited_by) : undefined}
              busy={props.isSubmitting}
              canCheckInOut={canCheckInOut}
              onEnter={() => void admitScanned(scanResult.visitor.id)}
              onExit={() => undefined}
              onPickPhoto={(source) => pickPhoto(scanResult.visitor.id, source)}
              onViewPhoto={() => void viewPhoto(scanResult.visitor)}
            />
          )}
          {scanResult && scanResult.kind !== "ok" && (
            <div className="space-y-4">
              <p role="alert" className="rounded-gates-md bg-gates-subtle p-4 text-base font-semibold text-gates-text-primary">
                {t(`security.visits.scan.reject.${scanResult.kind === "unknown" ? "unknown" : scanResult.verdict}` as MessageKey, {
                  name: scanResult.kind === "rejected" ? (scanResult.visitor.name ?? t("visitors.table.pendingRegistration")) : "",
                })}
              </p>
              <Button className="w-full" variant="outline" onClick={() => setScanResult(null)}>
                {t("common.close")}
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Exit confirmation */}
      <Dialog open={exitTarget !== null} onOpenChange={(open) => !open && setExitTarget(null)}>
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("security.visits.confirm.title")}</DialogTitle>
            <DialogDescription>
              {t("security.visits.confirm.body", { name: exitTarget?.name ?? t("visitors.table.pendingRegistration") })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => setExitTarget(null)}>
              {t("common.cancel")}
            </Button>
            <Button disabled={props.isSubmitting} onClick={() => void confirmExit()}>
              {t("security.visits.confirm.submit")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <input ref={fileInput} type="file" accept="image/*" className="hidden" onChange={onPhotoChosen} />
      <input ref={cameraInput} type="file" accept="image/*" capture="environment" className="hidden" onChange={onPhotoChosen} />
      <ImageViewerDialog
        src={viewer?.src ?? null}
        title={viewer?.title ?? ""}
        onOpenChange={(open) => !open && setViewer(null)}
        labels={{
          zoomIn: t("incidents.viewer.zoomIn"),
          zoomOut: t("incidents.viewer.zoomOut"),
          reset: t("incidents.viewer.reset"),
          rotateLeft: t("incidents.viewer.rotateLeft"),
          rotateRight: t("incidents.viewer.rotateRight"),
          close: t("common.close"),
        }}
      />
    </div>
  );
}

function Chip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex min-h-9 items-center gap-1 rounded-full bg-gates-accent pl-3 pr-1 text-sm font-medium text-gates-text-brand">
      {label}
      <button type="button" onClick={onRemove} aria-label={`${label} ×`} className="flex size-8 items-center justify-center rounded-full hover:bg-gates-subtle">
        <IconX className="size-4" />
      </button>
    </span>
  );
}
