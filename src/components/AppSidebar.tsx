import { useState, type ComponentType } from "react";
import {
  IconAlertTriangle,
  IconBuildings,
  IconCalendarEvent,
  IconHome,
  IconLayoutSidebarLeftCollapse,
  IconLogout,
  IconMenu2,
  IconSettings,
  IconSpeakerphone,
  IconUser,
  IconUserCheck,
  IconUsers,
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
import { useI18n } from "@/i18n/useI18n";
import type { Locale, MessageKey } from "@/i18n/messages";
import { getCurrentRoute, isRouteAllowedForRole, isSettingsRoute, ROUTES, type RouteType } from "@/config/routes";
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
}

/** `label: null` renders as an ungrouped section (just Dashboard, at the top). */
interface NavGroup {
  label: string | null;
  items: NavItem[];
}

const BrandMark = () => (
  <p className="text-2xl font-semibold tracking-[-0.8px] text-gates-text-brand">GATES</p>
);

interface SidebarBodyProps {
  showUserMenu: boolean;
  navGroups: NavGroup[];
  residentialName?: string | null;
  roleLabel: string;
  isSettingsActive: boolean;
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
}

function SidebarBody({
  showUserMenu,
  navGroups,
  residentialName,
  roleLabel,
  isSettingsActive,
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
}: SidebarBodyProps) {
  const { t } = useI18n();
  return (
    <>
      <SidebarHeader>
        <div className="flex items-center justify-between gap-1">
          <BrandMark />
          <span
            aria-hidden
            className="flex size-11 shrink-0 items-center justify-center rounded-full bg-gates-subtle"
          >
            <IconLayoutSidebarLeftCollapse className="h-5 w-5 text-gates-text-primary" />
          </span>
        </div>
      </SidebarHeader>

      {residentialName && (
        <div className="mx-2 flex flex-col gap-1 rounded-2xl bg-gates-subtle p-4">
          <p className="text-xs font-medium uppercase tracking-tight text-gates-text-brand">{residentialName}</p>
          <p className="text-sm font-semibold text-gates-text-primary">{roleLabel}</p>
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
                        {item.label}
                      </a>
                    </SidebarMenuButton>
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

        {showUserMenu && (
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
                  <p className="text-xs text-muted-foreground">Senior Software Engineer • {userRole}</p>
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

export function AppSidebar({
  userEmail,
  userName,
  userRole = "Engineering",
  residentialId,
  role,
  onSignOut,
  onProfile,
  onSettings,
  showUserMenu = false,
}: AppSidebarProps) {
  const { locale, setLocale, t } = useI18n();
  const [mobileOpen, setMobileOpen] = useState(false);
  const currentRoute = getCurrentRoute();

  const { data: residential } = useQuery(
    () => residentialService.getById(residentialId as string),
    { enabled: Boolean(residentialId) },
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

  const allNavGroups: NavGroup[] = [
    {
      label: null,
      items: [
        { label: t("appSidebar.nav.home"), href: "#residential", route: "residential", icon: IconHome, active: currentRoute === "residential" },
      ],
    },
    {
      label: t("appSidebar.group.community"),
      items: [
        { label: t("appSidebar.nav.units"), href: "#units", route: "units", icon: IconBuildings, active: currentRoute === "units" },
        { label: t("appSidebar.nav.residents"), href: "#residents", route: "residents", icon: IconUsers, active: currentRoute === "residents" },
        { label: t("appSidebar.nav.visitors"), href: "#visitors", route: "visitors", icon: IconUserCheck, active: currentRoute === "visitors" },
        { label: t("appSidebar.nav.reservations"), href: "#reservations", route: "reservations", icon: IconCalendarEvent, active: currentRoute === "reservations" },
      ],
    },
    {
      label: t("appSidebar.group.operations"),
      items: [
        { label: t("appSidebar.nav.incidents"), href: "#incidents", route: "incidents", icon: IconAlertTriangle, active: currentRoute === "incidents" },
        { label: t("appSidebar.nav.announcements"), href: "#announcements", route: "announcements", icon: IconSpeakerphone, active: currentRoute === "announcements" },
      ],
    },
  ];

  const navGroups: NavGroup[] = allNavGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => !role || isRouteAllowedForRole(item.route, role)),
    }))
    .filter((group) => group.items.length > 0);

  const sharedProps = {
    showUserMenu,
    navGroups,
    residentialName: residential?.name,
    roleLabel,
    isSettingsActive: isSettingsRoute(currentRoute),
    locale,
    onLocaleChange: setLocale,
    labelEn: t("language.en"),
    labelEs: t("language.es"),
    userEmail,
    userRole,
    displayName: getDisplayName(),
    onProfile,
    onSettings,
    onSignOut,
  };

  return (
    <>
      {/* Mobile top bar */}
      <div className="sticky top-0 z-40 flex h-14 items-center justify-between gap-3 border-b border-border/20 bg-background/70 px-4 backdrop-blur-md supports-[backdrop-filter]:bg-background/40 lg:hidden">
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
      <Sidebar className="fixed inset-y-4 left-4 z-30 hidden w-60 rounded-[2rem] border-none bg-gates-surface shadow-gates-card lg:flex">
        <SidebarBody {...sharedProps} />
      </Sidebar>
    </>
  );
}
