/**
 * Priority pill that opens a menu of priorities; picking one updates the
 * incident. Read-only pill when the user can't change priority.
 */

import { IconChevronDown } from "@tabler/icons-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { StatusBadge } from "@/components/ui/status-badge";
import { useI18n } from "@/i18n/useI18n";
import type { IncidentPriority } from "@/types/incident.types";
import {
  PRIORITY_LABEL_KEYS,
  PRIORITY_TONES,
} from "@/components/incidents/incidentMeta";

const PRIORITIES: IncidentPriority[] = ["low", "medium", "high", "urgent"];

interface IncidentPriorityMenuProps {
  priority: IncidentPriority;
  editable: boolean;
  disabled?: boolean;
  onChange: (priority: IncidentPriority) => void;
}

export function IncidentPriorityMenu({
  priority,
  editable,
  disabled,
  onChange,
}: IncidentPriorityMenuProps) {
  const { t } = useI18n();
  const badge = (
    <StatusBadge tone={PRIORITY_TONES[priority]} hideDot>
      {t(PRIORITY_LABEL_KEYS[priority])}
    </StatusBadge>
  );
  if (!editable) return badge;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        disabled={disabled}
        aria-label={t("incidents.table.priority")}
        className="inline-flex items-center gap-0.5 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
      >
        {badge}
        <IconChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-44">
        <DropdownMenuRadioGroup
          value={priority}
          onValueChange={(v) => onChange(v as IncidentPriority)}
        >
          {PRIORITIES.map((p) => (
            <DropdownMenuRadioItem key={p} value={p}>
              <StatusBadge tone={PRIORITY_TONES[p]} hideDot>
                {t(PRIORITY_LABEL_KEYS[p])}
              </StatusBadge>
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
