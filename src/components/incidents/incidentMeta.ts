import type { StatusTone } from "@/components/ui/status-badge";
import type { MessageKey } from "@/i18n/messages";
import type { IncidentPriority, IncidentStatus } from "@/types/incident.types";

export type IncidentView = "table" | "cards";

export const PRIORITY_LABEL_KEYS: Record<IncidentPriority, MessageKey> = {
  low: "incidents.priority.low",
  medium: "incidents.priority.medium",
  high: "incidents.priority.high",
  urgent: "incidents.priority.urgent",
};

export const STATUS_LABEL_KEYS: Record<IncidentStatus, MessageKey> = {
  new: "incidents.status.new",
  in_progress: "incidents.status.inProgress",
  resolved: "incidents.status.resolved",
  closed: "incidents.status.closed",
  cancelled: "incidents.status.cancelled",
};

export const PRIORITY_TONES: Record<IncidentPriority, StatusTone> = {
  low: "neutral",
  medium: "info",
  high: "warning",
  urgent: "error",
};

export const STATUS_TONES: Record<IncidentStatus, StatusTone> = {
  new: "info",
  in_progress: "warning",
  resolved: "success",
  closed: "neutral",
  cancelled: "neutral",
};

/** Plain-text preview of the HTML description written in the resident app. */
export function descriptionSnippet(html: string | null | undefined) {
  if (!html) return "";
  return (
    new DOMParser()
      .parseFromString(html, "text/html")
      .body.textContent?.trim() ?? ""
  );
}
