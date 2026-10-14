/**
 * Status pill that opens a grouped menu of statuses; picking one moves the
 * incident. Read-only pill when the user can't change status.
 */

import { IconChevronDown } from "@tabler/icons-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { StatusBadge } from "@/components/ui/status-badge";
import { useI18n } from "@/i18n/useI18n";
import type { MessageKey } from "@/i18n/messages";
import type { IncidentStatus } from "@/types/incident.types";
import {
  STATUS_LABEL_KEYS,
  STATUS_TONES,
} from "@/components/incidents/incidentMeta";

const STATUS_GROUPS: { label: MessageKey; statuses: IncidentStatus[] }[] = [
  { label: "incidents.statusGroup.notStarted", statuses: ["new"] },
  { label: "incidents.statusGroup.active", statuses: ["in_progress"] },
  { label: "incidents.statusGroup.done", statuses: ["resolved"] },
  { label: "incidents.statusGroup.closed", statuses: ["closed"] },
];

interface IncidentStatusMenuProps {
  status: IncidentStatus;
  editable: boolean;
  disabled?: boolean;
  onChange: (status: IncidentStatus) => void;
}

export function IncidentStatusMenu({
  status,
  editable,
  disabled,
  onChange,
}: IncidentStatusMenuProps) {
  const { t } = useI18n();
  const badge = (
    <StatusBadge tone={STATUS_TONES[status]}>
      {t(STATUS_LABEL_KEYS[status])}
    </StatusBadge>
  );
  if (!editable) return badge;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        disabled={disabled}
        aria-label={t("common.status")}
        className="inline-flex items-center gap-0.5 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
      >
        {badge}
        <IconChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-52">
        <DropdownMenuRadioGroup
          value={status}
          onValueChange={(v) => onChange(v as IncidentStatus)}
        >
          {STATUS_GROUPS.map((group, index) => (
            <DropdownMenuGroup key={group.label}>
              {index > 0 && <DropdownMenuSeparator />}
              <DropdownMenuLabel className="text-xs font-medium text-muted-foreground">
                {t(group.label)}
              </DropdownMenuLabel>
              {group.statuses.map((s) => (
                <DropdownMenuRadioItem key={s} value={s}>
                  <StatusBadge tone={STATUS_TONES[s]}>
                    {t(STATUS_LABEL_KEYS[s])}
                  </StatusBadge>
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuGroup>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
