import { useState, useSyncExternalStore, type ComponentType } from "react";
import {
  IconBuildings,
  IconCategory,
  IconHistory,
  IconHome,
  IconLayoutSidebarLeftCollapse,
  IconLayoutSidebarLeftExpand,
  IconLogout,
  IconMenu2,
  IconSearch,
  IconSettings,
  IconDeviceMobile,
  IconShieldLock,
  IconTicket,
  IconTruckDelivery,
  IconUser,
  type IconProps,
} from "@tabler/icons-react";

import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { CommandPalette } from "@/components/CommandPalette";
import { CreateMenu } from "@/components/CreateMenu";
import { NAV_SECTIONS, getAllowedSectionRoutes, isSectionActive } from "@/config/sections";
import { usePendingCounts } from "@/hooks/usePendingCounts";
import { useI18n } from "@/i18n/useI18n";
import type { Locale, MessageKey } from "@/i18n/messages";
import {
  getCurrentRoute,
  isPlatformRoute,
  isRouteAllowedForRole,
  isSettingsRoute,
  ROUTES,
  type RouteType,
} from "@/config/routes";
import { residentialService } from "@/services";
import { useQuery } from "@/hooks";
import type { ResidentialRole } from "@/types/database.types";
import { cn } from "@/lib/utils";

interface AppSidebarProps {
  /** User email to display (optional) */
  userEmail?: string;
  /** User name to display (optional) */
  userName?: string;
  /** User role/title (optional) */
  userRole?: string;
  /** Residential id, used to show the residential's name in the sidebar (optional) */
  residentialId?: string;
  /** Residential role, used to filter which nav items are shown (optional) */
  role?: ResidentialRole;
  /** Renders the Platform Admin nav group instead of the residential one, and hides the residential-scoped settings shortcut (optional) */
  isPlatformAdmin?: boolean;
  /** Callback when sign out is clicked (optional) */
  onSignOut?: () => void;
  /** Callback when profile is clicked (optional) */
  onProfile?: () => void;
  /** Callback when settings is clicked (optional) */
  onSettings?: () => void;
  /** Show navigation links and user menu */
  showUserMenu?: boolean;
}

interface NavItem {
  label: string;
  href: string;
  route: RouteType;
  icon: ComponentType<IconProps>;
  active: boolean;
  /** Pending-work count shown as a pill; hidden when 0/undefined. */
  badge?: number;
  /** Sibling pages of the section, listed under the item while it is active. */
  children?: { href: string; label: string; active: boolean }[];
}

/** `label: null` renders as an ungrouped section (just Dashboard, at the top). */
interface NavGroup {
  label: string | null;
  items: NavItem[];
}

const COLLAPSED_KEY = "gates.sidebarCollapsed";
const collapseListeners = new Set<() => void>();

function readCollapsed(): boolean {
  try {
    return localStorage.getItem(COLLAPSED_KEY) === "1";
  } catch {
    return false;
  }
}

/** Desktop sidebar collapse, persisted. Page content padding follows via html[data-sidebar-collapsed] (index.css). */
function setCollapsed(next: boolean) {
  try {
    localStorage.setItem(COLLAPSED_KEY, next ? "1" : "0");
  } catch {
    /* storage unavailable: collapse for this session only */
  }
  if (next) document.documentElement.setAttribute("data-sidebar-collapsed", "");
  else document.documentElement.removeAttribute("data-sidebar-collapsed");
  collapseListeners.forEach((listener) => listener());
}

if (typeof document !== "undefined" && readCollapsed()) {
  document.documentElement.setAttribute("data-sidebar-collapsed", "");
}

function useSidebarCollapsed(): boolean {
  return useSyncExternalStore(
    (listener) => {
      collapseListeners.add(listener);
      return () => collapseListeners.delete(listener);
    },
    () => document.documentElement.hasAttribute("data-sidebar-collapsed"),
    () => false,
  );
}

const BrandMark = () => (
  <p className="text-2xl font-semibold tracking-[-0.8px] text-gates-text-brand">VECINOO</p>
);

interface SidebarBodyProps {
  showUserMenu: boolean;
  navGroups: NavGroup[];
  residentialName?: string | null;
  roleLabel: string;
  isSettingsActive: boolean;
  showSettingsShortcut: boolean;
  locale: Locale;
  onLocaleChange: (locale: Locale) => void;
  labelEn: string;
  labelEs: string;
  userEmail?: string;
  userRole: string;
  displayName: string;
  onProfile?: () => void;
  onSettings?: () => void;
  onSignOut?: () => void;
  onNavigate?: () => void;
  /** Residential-scoped "+ Create" and ⌘K search entry points. */
  showQuickActions: boolean;
  role?: ResidentialRole;
  onOpenSearch: () => void;
  /** Desktop-only: shown when provided (hidden in the mobile drawer). */
  onCollapse?: () => void;
}

function SidebarBody({
  showUserMenu,
  navGroups,
  residentialName,
  roleLabel,
  isSettingsActive,
  showSettingsShortcut,
  locale,
  onLocaleChange,
  labelEn,
  labelEs,
  userEmail,
  userRole,
  displayName,
  onProfile,
  onSettings,
  onSignOut,
  onNavigate,
  showQuickActions,
  role,
  onOpenSearch,
  onCollapse,
}: SidebarBodyProps) {
  const { t } = useI18n();
  return (
    <>
      <SidebarHeader>
        <div className="flex items-center justify-between gap-1">
          <BrandMark />
          {onCollapse && (
            <button
              type="button"
              onClick={onCollapse}
              aria-label={t("appSidebar.collapse")}
              className="flex size-11 shrink-0 items-center justify-center rounded-full bg-gates-subtle transition-colors hover:bg-gates-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <IconLayoutSidebarLeftCollapse className="h-5 w-5 text-gates-text-primary" />
            </button>
          )}
        </div>
      </SidebarHeader>

      {residentialName && (
        <div className="mx-2 flex flex-col gap-1 rounded-2xl bg-gates-subtle p-4">
          <p className="text-xs font-medium uppercase tracking-tight text-gates-text-brand">{residentialName}</p>
          <p className="text-sm font-semibold text-gates-text-primary">{roleLabel}</p>
        </div>
      )}

      {showUserMenu && showQuickActions && (
        <div className="mx-2 mt-3 flex flex-col gap-2">
          <CreateMenu role={role} onSelect={onNavigate} />
          <button
            type="button"
            onClick={() => {
              onNavigate?.();
              onOpenSearch();
            }}
            className="flex h-10 w-full items-center gap-2 rounded-full bg-gates-subtle px-4 text-sm text-gates-text-secondary transition-colors hover:bg-gates-accent"
          >
            <IconSearch className="h-4 w-4" />
            <span className="flex-1 text-left">{t("palette.search")}</span>
            <kbd className="rounded bg-gates-surface px-1.5 py-0.5 text-[10px] font-medium">⌘K</kbd>
          </button>
        </div>
      )}

      {showUserMenu && (
        <SidebarContent className="space-y-5">
          {navGroups.map((group, index) => (
            <SidebarGroup key={group.label ?? `ungrouped-${index}`} className="px-0">
              {group.label && (
                <SidebarGroupLabel className="px-3 text-[12px] font-medium normal-case tracking-normal text-gates-text-secondary">
                  {group.label}
                </SidebarGroupLabel>
              )}
              <SidebarMenu>
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.href} className="px-0">
                    <SidebarMenuButton
                      asChild
                      isActive={item.active}
                      onClick={onNavigate}
                      className={cn(
                        "h-12 rounded-full px-3 text-sm font-semibold",
                        item.active
                          ? "bg-gates-brand text-gates-text-inverse hover:bg-gates-brand hover:text-gates-text-inverse"
                          : "text-gates-text-primary hover:bg-gates-subtle hover:text-gates-text-primary",
                      )}
                    >
                      <a href={item.href}>
                        <item.icon className="h-5 w-5" />
                        <span className="flex-1">{item.label}</span>
                        {item.badge ? (
                          <span
                            className={cn(
                              "min-w-5 rounded-full px-1.5 py-0.5 text-center text-[11px] font-semibold leading-none",
                              item.active ? "bg-gates-surface text-gates-text-brand" : "bg-gates-brand text-gates-text-inverse",
                            )}
                          >
                            {item.badge > 99 ? "99+" : item.badge}
                          </span>
                        ) : null}
                      </a>
                    </SidebarMenuButton>
                    {item.active && item.children && (
                      <ul className="ml-[22px] mt-1 space-y-1 border-l border-gates-border pl-3">
                        {item.children.map((child) => (
                          <li key={child.href}>
                            <a
                              href={child.href}
                              onClick={onNavigate}
                              aria-current={child.active ? "page" : undefined}
                              className={cn(
                                "flex h-10 items-center rounded-full px-4 text-sm font-semibold transition-colors",
                                child.active
                                  ? "bg-gates-accent text-gates-text-brand"
                                  : "text-gates-text-secondary hover:bg-gates-subtle hover:text-gates-text-primary",
                              )}
                            >
                              {child.label}
                            </a>
                          </li>
                        ))}
                      </ul>
                    )}
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroup>
          ))}
        </SidebarContent>
      )}

      <SidebarFooter className="border-t-0">
        <div className="flex items-center gap-1 rounded-lg border border-border/50 bg-background/50 p-1">
          <Button
            size="sm"
            variant="ghost"
            className={
              locale === "en"
                ? "h-7 flex-1 rounded-md bg-primary px-3 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
                : "h-7 flex-1 rounded-md px-3 text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
            }
            aria-label={labelEn}
            onClick={() => onLocaleChange("en")}
          >
            EN
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className={
              locale === "es"
                ? "h-7 flex-1 rounded-md bg-primary px-3 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
                : "h-7 flex-1 rounded-md px-3 text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
            }
            aria-label={labelEs}
            onClick={() => onLocaleChange("es")}
          >
            ES
          </Button>
        </div>

        {showUserMenu && showSettingsShortcut && (
          <a
            href={ROUTES.settingsUnitTypes.hash}
            className={cn(
              "flex h-12 items-center gap-3 rounded-full px-3 text-sm font-semibold",
              isSettingsActive
                ? "bg-gates-brand text-gates-text-inverse hover:bg-gates-brand hover:text-gates-text-inverse"
                : "text-gates-text-brand hover:bg-gates-subtle",
            )}
          >
            <IconSettings className="h-5 w-5" />
            {t("common.settings")}
          </a>
        )}

        {showUserMenu && userEmail && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex w-full items-center gap-3 rounded-full px-2 py-2 text-left transition-colors hover:bg-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 dark:hover:bg-white/10">
                <Avatar name={displayName} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold leading-none text-gates-text-primary">{displayName}</p>
                  <p className="mt-1 truncate text-xs text-gates-text-secondary">{userEmail}</p>
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-72" align="end" side="top" sideOffset={8}>
              <div className="flex items-center gap-3 px-2 py-3">
                <Avatar name={displayName} size="sm" />
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">{displayName}</p>
                  <p className="text-xs text-muted-foreground">{userRole}</p>
                </div>
              </div>

              <DropdownMenuSeparator />

              {onProfile && (
                <DropdownMenuItem className="cursor-pointer py-2.5" onClick={onProfile}>
                  <IconUser className="mr-3 h-4 w-4" />
                  <span>{t("appSidebar.myProfile")}</span>
                </DropdownMenuItem>
              )}

              {onSettings && (
                <DropdownMenuItem className="cursor-pointer py-2.5" onClick={onSettings}>
                  <IconSettings className="mr-3 h-4 w-4" />
                  <span>{t("common.settings")}</span>
                </DropdownMenuItem>
              )}

              <DropdownMenuSeparator />

              {onSignOut && (
                <DropdownMenuItem
                  className="cursor-pointer py-2.5 text-red-600 focus:text-red-600 dark:text-red-400 dark:focus:text-red-400"
                  onClick={onSignOut}
                >
                  <IconLogout className="mr-3 h-4 w-4" />
                  <span>{t("common.signOut")}</span>
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </SidebarFooter>
    </>
  );
}

interface SidebarRailProps {
  navGroups: NavGroup[];
  showUserMenu: boolean;
  showQuickActions: boolean;
  showSettingsShortcut: boolean;
  isSettingsActive: boolean;
  userEmail?: string;
  displayName: string;
  userRole: string;
  locale: Locale;
  onLocaleChange: (locale: Locale) => void;
  onOpenSearch: () => void;
  onExpand: () => void;
  onProfile?: () => void;
  onSettings?: () => void;
  onSignOut?: () => void;
}

const railButton =
  "relative flex size-11 shrink-0 items-center justify-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

/** Collapsed desktop sidebar: icon-only pill. Same destinations, labels move to tooltips. */
function SidebarRail({
  navGroups,
  showUserMenu,
  showQuickActions,
  showSettingsShortcut,
  isSettingsActive,
  userEmail,
  displayName,
  userRole,
  locale,
  onLocaleChange,
  onOpenSearch,
  onExpand,
  onProfile,
  onSettings,
  onSignOut,
}: SidebarRailProps) {
  const { t } = useI18n();
  return (
    <aside className="fixed inset-y-4 left-4 z-30 hidden w-[72px] flex-col items-center gap-3 rounded-[2rem] bg-gates-surface py-4 shadow-gates-card lg:flex">
      <button
        type="button"
        onClick={onExpand}
        aria-label={t("appSidebar.expand")}
        title={t("appSidebar.expand")}
        className={cn(railButton, "bg-gates-subtle hover:bg-gates-accent")}
      >
        <IconLayoutSidebarLeftExpand className="h-5 w-5 text-gates-text-primary" />
      </button>
      <div className="h-px w-8 bg-gates-border" />

      {showUserMenu && showQuickActions && (
        <button
          type="button"
          onClick={onOpenSearch}
          aria-label={t("palette.search")}
          title={t("palette.search")}
          className={cn(railButton, "text-gates-text-secondary hover:bg-gates-subtle")}
        >
          <IconSearch className="h-5 w-5" />
        </button>
      )}

      {showUserMenu && (
        <nav className="flex min-h-0 flex-1 flex-col items-center gap-1 overflow-y-auto">
          {navGroups.flatMap((group) => group.items).map((item) => (
            <a
              key={item.href}
              href={item.href}
              title={item.label}
              aria-label={item.label}
              aria-current={item.active ? "page" : undefined}
              className={cn(
                railButton,
                item.active
                  ? "bg-gates-brand text-gates-text-inverse"
                  : "text-gates-text-primary hover:bg-gates-subtle",
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.badge ? (
                <span className="absolute right-2 top-2 size-2 rounded-full bg-gates-error ring-2 ring-gates-surface" />
              ) : null}
            </a>
          ))}
        </nav>
      )}

      <div className="flex flex-col items-center gap-1">
        <button
          type="button"
          onClick={() => onLocaleChange(locale === "en" ? "es" : "en")}
          title={locale === "en" ? "Español" : "English"}
          className={cn(railButton, "text-xs font-semibold uppercase text-gates-text-secondary hover:bg-gates-subtle")}
        >
          {locale}
        </button>
        {showUserMenu && showSettingsShortcut && (
          <a
            href={ROUTES.settingsUnitTypes.hash}
            title={t("common.settings")}
            aria-label={t("common.settings")}
            className={cn(
              railButton,
              isSettingsActive ? "bg-gates-brand text-gates-text-inverse" : "text-gates-text-brand hover:bg-gates-subtle",
            )}
          >
            <IconSettings className="h-5 w-5" />
          </a>
        )}
        {showUserMenu && userEmail && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button type="button" title={displayName} className={cn(railButton, "hover:bg-gates-subtle")}>
                <Avatar name={displayName} size="sm" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-72" align="start" side="right" sideOffset={12}>
              <div className="flex items-center gap-3 px-2 py-3">
                <Avatar name={displayName} size="sm" />
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">{displayName}</p>
                  <p className="text-xs text-muted-foreground">{userRole}</p>
                </div>
              </div>
              <DropdownMenuSeparator />
              {onProfile && (
                <DropdownMenuItem className="cursor-pointer py-2.5" onClick={onProfile}>
                  <IconUser className="mr-3 h-4 w-4" />
                  <span>{t("appSidebar.myProfile")}</span>
                </DropdownMenuItem>
              )}
              {onSettings && (
                <DropdownMenuItem className="cursor-pointer py-2.5" onClick={onSettings}>
                  <IconSettings className="mr-3 h-4 w-4" />
                  <span>{t("common.settings")}</span>
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              {onSignOut && (
                <DropdownMenuItem
                  className="cursor-pointer py-2.5 text-red-600 focus:text-red-600 dark:text-red-400 dark:focus:text-red-400"
                  onClick={onSignOut}
                >
                  <IconLogout className="mr-3 h-4 w-4" />
                  <span>{t("common.signOut")}</span>
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </aside>
  );
}

export function AppSidebar({
  userEmail,
  userName,
  residentialId,
  role,
  isPlatformAdmin = false,
  onSignOut,
  onProfile,
  onSettings,
  showUserMenu = false,
}: AppSidebarProps) {
  const { locale, setLocale, t } = useI18n();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const collapsed = useSidebarCollapsed();
  const currentRoute = getCurrentRoute();

  const { data: residential } = useQuery(
    () => residentialService.getById(residentialId as string),
    { enabled: Boolean(residentialId) && !isPlatformAdmin },
  );

  const roleLabel = role ? t((`role.${role}`) as MessageKey) : t("appSidebar.tagline");

  const getDisplayName = () => {
    if (userName) return userName;
    if (userEmail) {
      const namePart = userEmail.split("@")[0];
      return namePart
        .split(/[._-]/)
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
    }
    return "User";
  };

  const platformNavGroups: NavGroup[] = [
    {
      label: null,
      items: [
        { label: t("appSidebar.nav.platformDashboard"), href: "#platform", route: "platform", icon: IconHome, active: currentRoute === "platform" },
      ],
    },
    {
      label: t("appSidebar.group.platform"),
      items: [
        { label: t("appSidebar.nav.platformResidentials"), href: "#platform/residentials", route: "platformResidentials", icon: IconBuildings, active: isPlatformRoute(currentRoute) && (currentRoute === "platformResidentials" || currentRoute === "platformResidentialDetail") },
        { label: t("appSidebar.nav.platformPlans"), href: "#platform/plans", route: "platformPlans", icon: IconTicket, active: currentRoute === "platformPlans" },
        { label: t("appSidebar.nav.platformProviders"), href: "#platform/providers", route: "platformProviders", icon: IconTruckDelivery, active: currentRoute === "platformProviders" },
        { label: t("appSidebar.nav.platformAmenitiesCatalog"), href: "#platform/amenities-catalog", route: "platformAmenitiesCatalog", icon: IconCategory, active: currentRoute === "platformAmenitiesCatalog" },
        { label: t("appSidebar.nav.platformAdmins"), href: "#platform/admins", route: "platformAdmins", icon: IconShieldLock, active: currentRoute === "platformAdmins" },
        { label: t("appSidebar.nav.platformAuditLog"), href: "#platform/audit-log", route: "platformAuditLog", icon: IconHistory, active: currentRoute === "platformAuditLog" },
        { label: t("appSidebar.nav.platformAppSettings"), href: "#platform/app-settings", route: "platformAppSettings", icon: IconDeviceMobile, active: currentRoute === "platformAppSettings" },
      ],
    },
  ];

  const { counts } = usePendingCounts(residentialId, Boolean(residentialId) && !isPlatformAdmin && showUserMenu);
  const badgeBySection: Record<string, number | undefined> = {
    billing: counts?.payments,
    operations: counts ? counts.incidents + counts.reservations : undefined,
  };

  const residentialNavGroups: NavGroup[] = [
    {
      label: null,
      items: NAV_SECTIONS.flatMap((section) => {
        const allowed = role ? getAllowedSectionRoutes(section, role) : section.routes;
        if (allowed.length === 0) return [];
        const target = allowed[0].route;
        return [
          {
            label: t(section.labelKey),
            href: ROUTES[target].hash,
            route: target,
            icon: section.icon,
            active: isSectionActive(section, currentRoute),
            badge: badgeBySection[section.id],
            children:
              allowed.length > 1
                ? allowed.map((entry) => ({
                    href: ROUTES[entry.route].hash,
                    label: t(entry.labelKey),
                    active: entry.route === currentRoute,
                  }))
                : undefined,
          },
        ];
      }),
    },
  ];

  const allNavGroups: NavGroup[] = isPlatformAdmin ? platformNavGroups : residentialNavGroups;

  const navGroups: NavGroup[] = allNavGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => isPlatformAdmin || !role || isRouteAllowedForRole(item.route, role)),
    }))
    .filter((group) => group.items.length > 0);

  const sharedProps = {
    showUserMenu,
    navGroups,
    residentialName: isPlatformAdmin ? null : residential?.name,
    roleLabel: isPlatformAdmin ? t("appSidebar.platformAdminTagline") : roleLabel,
    isSettingsActive: isSettingsRoute(currentRoute),
    showSettingsShortcut: !isPlatformAdmin,
    locale,
    onLocaleChange: setLocale,
    labelEn: t("language.en"),
    labelEs: t("language.es"),
    userEmail,
    userRole: roleLabel,
    displayName: getDisplayName(),
    onProfile,
    onSettings,
    onSignOut,
    showQuickActions: !isPlatformAdmin && Boolean(residentialId),
    role,
    onOpenSearch: () => setPaletteOpen(true),
  };

  return (
    <>
      {sharedProps.showQuickActions && showUserMenu && residentialId && (
        <CommandPalette
          residentialId={residentialId}
          role={role}
          open={paletteOpen}
          onOpenChange={setPaletteOpen}
        />
      )}
      {/* Mobile top bar */}
      <div className={"sticky top-0 z-40 flex h-14 items-center justify-between gap-3 border-b border-border/20 bg-background/70 px-4 backdrop-blur-md supports-[backdrop-filter]:bg-background/40 lg:hidden"}>
        <BrandMark />
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <Button size="icon" variant="ghost" aria-label="Open menu">
              <IconMenu2 className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72 p-0">
            <Sidebar className="w-full border-none">
              <SidebarBody {...sharedProps} onNavigate={() => setMobileOpen(false)} />
            </Sidebar>
          </SheetContent>
        </Sheet>
      </div>

      {/* Desktop floating sidebar card */}
      {collapsed ? (
        <SidebarRail
          navGroups={navGroups}
          showUserMenu={showUserMenu}
          showQuickActions={sharedProps.showQuickActions}
          showSettingsShortcut={sharedProps.showSettingsShortcut}
          isSettingsActive={sharedProps.isSettingsActive}
          userEmail={userEmail}
          displayName={sharedProps.displayName}
          userRole={roleLabel}
          locale={locale}
          onLocaleChange={setLocale}
          onOpenSearch={() => setPaletteOpen(true)}
          onExpand={() => setCollapsed(false)}
          onProfile={onProfile}
          onSettings={onSettings}
          onSignOut={onSignOut}
        />
      ) : (
        <Sidebar className="fixed inset-y-4 left-4 z-30 hidden w-60 rounded-[2rem] border-none bg-gates-surface shadow-gates-card lg:flex">
          <SidebarBody {...sharedProps} onCollapse={() => setCollapsed(true)} />
        </Sidebar>
      )}
    </>
  );
}
