import type { MessageKey } from "@/i18n/messages";
import type { VisitorStatus, VisitType } from "@/types/visitor.types";

export const STATUS_LABEL_KEYS: Record<VisitorStatus, MessageKey> = {
  pending_registration: "visitors.status.pendingRegistration",
  scheduled: "visitors.status.scheduled",
  active: "visitors.status.active",
  inside: "visitors.status.inside",
  completed: "visitors.status.completed",
  cancelled: "visitors.status.cancelled",
  rejected: "visitors.status.rejected",
  expired: "visitors.status.expired",
};

export const VISIT_TYPE_LABEL_KEYS: Record<VisitType, MessageKey> = {
  frequent: "visitors.type.frequent",
  delivery: "visitors.type.delivery",
  fastlane: "visitors.type.fastlane",
};
