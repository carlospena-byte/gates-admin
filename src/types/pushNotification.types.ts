/**
 * Push notification ("Comunicados") types. Hand-written, same style as bulletin.types.ts.
 */

export type PushDestination =
  | "home"
  | "bulletins"
  | "bulletin"
  | "amenities"
  | "billing"
  | "incident_report"
  | "new_visit"
  | "profile";

export const PUSH_DESTINATIONS: PushDestination[] = [
  "home",
  "bulletins",
  "bulletin",
  "amenities",
  "billing",
  "incident_report",
  "new_visit",
  "profile",
];

export type PushAudienceKind = "everyone" | "admins" | "units";
export type PushStatus = "scheduled" | "sending" | "sent" | "failed";

export interface PushNotification {
  id: string;
  residential_id: string;
  title: string;
  body: string;
  destination: PushDestination;
  bulletin_id: string | null;
  audience: PushAudienceKind;
  unit_ids: string[];
  location_ids: string[];
  status: PushStatus;
  scheduled_at: string;
  sent_at: string | null;
  recipients: number;
  sent_count: number;
  failed_count: number;
  error: string | null;
  created_by: string | null;
  created_at: string;
}

export type PushNotificationWithAuthor = PushNotification & {
  profiles: { email: string | null } | null;
};

export interface CreatePushNotificationInput {
  residentialId: string;
  title: string;
  body: string;
  destination: PushDestination;
  bulletinId: string | null;
  audience: PushAudienceKind;
  unitIds: string[];
  locationIds: string[];
  /** ISO timestamp; "now" for an immediate send. */
  scheduledAt: string;
  createdBy: string | null;
}

/** What phones actually show before truncating (iOS lock screen ~1 line title, ~4 lines body). */
export const PUSH_TITLE_MAX = 50;
export const PUSH_BODY_MAX = 178;
