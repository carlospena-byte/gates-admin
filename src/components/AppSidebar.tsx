import { useState, type ComponentType } from "react";
import {
  IconAlertTriangle,
  IconBuildings,
  IconCalendarEvent,
  IconLayoutDashboard,
  IconLogout,
  IconMenu2,
  IconSettings,
  IconUser,
  IconUserCheck,
  IconUsers,
  type IconProps,
} from "@tabler/icons-react";

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
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { useI18n } from "@/i18n/useI18n";
import type { Locale } from "@/i18n/messages";
import { getCurrentRoute, isSettingsRoute, ROUTES } from "@/config/routes";

interface AppSidebarProps {
  /** User email to display (optional) */
  userEmail?: string;
  /** User name to display (optional) */
  userName?: string;
  /** User role/title (optional) */
  userRole?: string;
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
  icon: ComponentType<IconProps>;
  active: boolean;
}

const BrandMark = () => (
  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-600/20">
    <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
      />
    </svg>
  </div>
);

interface SidebarBodyProps {
  showUserMenu: boolean;
  navItems: NavItem[];
  locale: Locale;
  onLocaleChange: (locale: Locale) => void;
  labelEn: string;
  labelEs: string;
  userEmail?: string;
  userRole: string;
  displayName: string;
  initials: string;
  onProfile?: () => void;
  onSettings?: () => void;
  onSignOut?: () => void;
  onNavigate?: () => void;
}

function SidebarBody({
  showUserMenu,
  navItems,
  locale,
  onLocaleChange,
  labelEn,
  labelEs,
  userEmail,
  userRole,
  displayName,
  initials,
  onProfile,
  onSettings,
  onSignOut,
  onNavigate,
}: SidebarBodyProps) {
  return (
    <>
      <SidebarHeader>
        <div className="flex items-center gap-3">
          <BrandMark />
          <div>
            <h1 className="text-lg font-bold tracking-tight">Gates Admin</h1>
            <p className="text-xs text-muted-foreground">Residential Management</p>
          </div>
        </div>
      </SidebarHeader>

      {showUserMenu && (
        <SidebarContent>
          <SidebarMenu>
            {navItems.map((item) => (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton asChild isActive={item.active} onClick={onNavigate}>
                  <a href={item.href}>
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </a>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarContent>
      )}

      <SidebarFooter>
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

        {showUserMenu && userEmail && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 dark:hover:bg-white/10">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-orange-500 to-orange-600 text-white">
                  <span className="text-sm font-semibold">{initials}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium leading-none">{displayName}</p>
                  <p className="mt-1 truncate text-xs text-muted-foreground">{userEmail}</p>
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-72" align="end" side="top" sideOffset={8}>
              <div className="flex items-center gap-3 px-2 py-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-orange-500 to-orange-600 text-white">
                  <span className="text-lg font-semibold">{initials}</span>
                </div>
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">{displayName}</p>
                  <p className="text-xs text-muted-foreground">Senior Software Engineer • {userRole}</p>
                </div>
              </div>

              <DropdownMenuSeparator />

              {onProfile && (
                <DropdownMenuItem className="cursor-pointer py-2.5" onClick={onProfile}>
                  <IconUser className="mr-3 h-4 w-4" />
                  <span>My Profile</span>
                </DropdownMenuItem>
              )}

              {onSettings && (
                <DropdownMenuItem className="cursor-pointer py-2.5" onClick={onSettings}>
                  <IconSettings className="mr-3 h-4 w-4" />
                  <span>Settings</span>
                </DropdownMenuItem>
              )}

              <DropdownMenuSeparator />

              {onSignOut && (
                <DropdownMenuItem
                  className="cursor-pointer py-2.5 text-red-600 focus:text-red-600 dark:text-red-400 dark:focus:text-red-400"
                  onClick={onSignOut}
                >
                  <IconLogout className="mr-3 h-4 w-4" />
                  <span>Log out</span>
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
  onSignOut,
  onProfile,
  onSettings,
  showUserMenu = false,
}: AppSidebarProps) {
  const { locale, setLocale, t } = useI18n();
  const [mobileOpen, setMobileOpen] = useState(false);
  const currentRoute = getCurrentRoute();

  const getInitials = () => {
    if (userName) {
      return userName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    }
    if (userEmail) {
      return userEmail.charAt(0).toUpperCase();
    }
    return "U";
  };

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

  const navItems: NavItem[] = [
    { label: "Dashboard", href: "#residential", icon: IconLayoutDashboard, active: currentRoute === "residential" },
    { label: "Units", href: "#units", icon: IconBuildings, active: currentRoute === "units" },
    { label: "Residents", href: "#residents", icon: IconUsers, active: currentRoute === "residents" },
    { label: "Visitors", href: "#visitors", icon: IconUserCheck, active: currentRoute === "visitors" },
    { label: "Incidents", href: "#incidents", icon: IconAlertTriangle, active: currentRoute === "incidents" },
    { label: "Reservations", href: "#reservations", icon: IconCalendarEvent, active: currentRoute === "reservations" },
    { label: "Settings", href: ROUTES.settingsUnitTypes.hash, icon: IconSettings, active: isSettingsRoute(currentRoute) },
  ];

  const sharedProps = {
    showUserMenu,
    navItems,
    locale,
    onLocaleChange: setLocale,
    labelEn: t("language.en"),
    labelEs: t("language.es"),
    userEmail,
    userRole,
    displayName: getDisplayName(),
    initials: getInitials(),
    onProfile,
    onSettings,
    onSignOut,
  };

  return (
    <>
      {/* Mobile top bar */}
      <div className="sticky top-0 z-40 flex h-14 items-center justify-between gap-3 border-b border-border/20 bg-background/70 px-4 backdrop-blur-md supports-[backdrop-filter]:bg-background/40 lg:hidden">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-blue-700 text-white">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
              />
            </svg>
          </div>
          <span className="text-sm font-bold tracking-tight">Gates Admin</span>
        </div>
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

      {/* Desktop fixed sidebar */}
      <Sidebar className="fixed inset-y-0 left-0 z-30 hidden lg:flex">
        <SidebarBody {...sharedProps} />
      </Sidebar>
    </>
  );
}
