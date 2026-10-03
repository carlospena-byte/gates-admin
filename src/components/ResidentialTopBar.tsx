import { NotificationsBell } from "@/components/dashboard/NotificationsBell";
import { Avatar } from "@/components/ui/avatar";
import { useI18n } from "@/i18n/useI18n";
import type { ResidentialRole } from "@/types/database.types";

/**
 * Header shared by every residential screen: section label, today's date,
 * the notifications bell and the user's avatar. Desktop only — on mobile the
 * bell lives in AppSidebar's top bar.
 */
export function ResidentialTopBar({
  residentialId,
  role,
  userEmail,
}: {
  residentialId: string;
  role: ResidentialRole;
  userEmail?: string | null;
}) {
  const { locale, t } = useI18n();

  const rawToday = new Date().toLocaleDateString(locale === "es" ? "es-ES" : "en-US", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const todayLabel = rawToday.charAt(0).toUpperCase() + rawToday.slice(1);

  return (
    <div className="hidden lg:block lg:pl-64">
      <div className="mx-auto flex max-w-7xl items-center gap-4 px-6 pt-6">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium uppercase tracking-tight text-gates-text-brand">
            {t("dashboard.residential.title")}
          </p>
          <p className="text-sm text-gates-text-secondary">{todayLabel}</p>
        </div>
        <NotificationsBell residentialId={residentialId} role={role} />
        <Avatar name={userEmail ?? "U"} size="sm" />
      </div>
    </div>
  );
}
