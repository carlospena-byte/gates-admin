import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useI18n } from "@/i18n/useI18n";

interface NavbarProps {
  /**
   * User email to display (optional)
   */
  userEmail?: string;
  /**
   * User name to display (optional)
   */
  userName?: string;
  /**
   * User role/title (optional)
   */
  userRole?: string;
  /**
   * Callback when sign out is clicked (optional)
   */
  onSignOut?: () => void;
  /**
   * Callback when profile is clicked (optional)
   */
  onProfile?: () => void;
  /**
   * Callback when settings is clicked (optional)
   */
  onSettings?: () => void;
  /**
   * Show user menu
   */
  showUserMenu?: boolean;
}

export function Navbar({
  userEmail,
  userName,
  userRole = "Engineering",
  onSignOut,
  onProfile,
  onSettings,
  showUserMenu = false
}: NavbarProps) {
  const { locale, setLocale, t } = useI18n();

  // Extract initials from email or name
  const getInitials = () => {
    if (userName) {
      return userName
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    }
    if (userEmail) {
      return userEmail.charAt(0).toUpperCase();
    }
    return 'U';
  };

  // Extract display name
  const getDisplayName = () => {
    if (userName) return userName;
    if (userEmail) {
      // Extract name from email (before @)
      const namePart = userEmail.split('@')[0];
      return namePart
        .split(/[._-]/)
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
    }
    return 'User';
  };

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-border/20 bg-background/70 backdrop-blur-md supports-[backdrop-filter]:bg-background/40">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo / Brand */}
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-600/20">
                <svg
                  className="h-6 w-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                  />
                </svg>
              </div>
              <div>
                <h1 className="text-lg font-bold tracking-tight">Gates Admin</h1>
                <p className="text-xs text-muted-foreground">Residential Management</p>
              </div>
            </div>

            {/* Navigation Links */}
            {showUserMenu && (
              <nav className="flex items-center gap-1">
                <a
                  href="#residential"
                  className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                >
                  Dashboard
                </a>
                <a
                  href="#units"
                  className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                >
                  Units
                </a>
              </nav>
            )}
          </div>

          {/* Right side - Language + User */}
          <div className="flex items-center gap-4">
            {/* Language Switcher */}
            <div className="flex items-center gap-1 rounded-lg border border-border/50 bg-background/50 p-1">
              <Button
                size="sm"
                variant="ghost"
                className={
                  locale === "en"
                    ? "h-7 rounded-md bg-primary px-3 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
                    : "h-7 rounded-md px-3 text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
                }
                aria-label={t("language.en")}
                onClick={() => setLocale("en")}
              >
                EN
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className={
                  locale === "es"
                    ? "h-7 rounded-md bg-primary px-3 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
                    : "h-7 rounded-md px-3 text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
                }
                aria-label={t("language.es")}
                onClick={() => setLocale("es")}
              >
                ES
              </Button>
            </div>

            {/* User Menu Dropdown */}
            {showUserMenu && userEmail && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="relative h-10 w-10 rounded-full bg-gradient-to-br from-orange-500 to-orange-600 p-0 hover:opacity-90 focus-visible:ring-2 focus-visible:ring-offset-2"
                  >
                    <span className="text-sm font-semibold text-white">
                      {getInitials()}
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-80" align="end" sideOffset={8}>
                  {/* User Info Header */}
                  <div className="flex items-center gap-3 px-2 py-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-orange-500 to-orange-600 text-white">
                      <span className="text-lg font-semibold">
                        {getInitials()}
                      </span>
                    </div>
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">{getDisplayName()}</p>
                      <p className="text-xs text-muted-foreground">
                        Senior Software Engineer • {userRole}
                      </p>
                    </div>
                  </div>

                  <DropdownMenuSeparator />

                  {/* Menu Items */}
                  {onProfile && (
                    <DropdownMenuItem
                      className="cursor-pointer py-2.5"
                      onClick={onProfile}
                    >
                      <svg
                        className="mr-3 h-4 w-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                        />
                      </svg>
                      <span>My Profile</span>
                    </DropdownMenuItem>
                  )}

                  {onSettings && (
                    <DropdownMenuItem
                      className="cursor-pointer py-2.5"
                      onClick={onSettings}
                    >
                      <svg
                        className="mr-3 h-4 w-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                      </svg>
                      <span>Settings</span>
                    </DropdownMenuItem>
                  )}

                  <DropdownMenuSeparator />

                  {onSignOut && (
                    <DropdownMenuItem
                      className="cursor-pointer py-2.5 text-red-600 focus:text-red-600 dark:text-red-400 dark:focus:text-red-400"
                      onClick={onSignOut}
                    >
                      <svg
                        className="mr-3 h-4 w-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                        />
                      </svg>
                      <span>Log out</span>
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
