import { useI18n } from "@/i18n/useI18n";
import type { MessageKey } from "@/i18n/messages";
import { isStandingFrequent } from "@/lib/standingVisit";
import type { VisitorWithInviter } from "@/types/visitor.types";
import { visitWindow } from "./securityVisits";

/** Window text for a visit; standing frequent visits read as their recurrence instead. */
export function useVisitWhen() {
  const { t, locale } = useI18n();
  return (visitor: VisitorWithInviter): string => {
    if (isStandingFrequent(visitor)) {
      if (visitor.recurrence === "custom") {
        return (visitor.recurrence_days ?? []).map((d) => t(`visitors.frequent.day.${d}` as MessageKey)).join(", ");
      }
      return t(`visitors.frequent.recurrence.${visitor.recurrence}` as MessageKey);
    }
    return visitWindow(visitor.valid_from, visitor.valid_until, locale);
  };
}
