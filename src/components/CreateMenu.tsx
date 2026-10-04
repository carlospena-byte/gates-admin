import { IconPlus } from "@tabler/icons-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getQuickActionsForRole } from "@/config/quickActions";
import { useI18n } from "@/i18n/useI18n";
import { requestCreate } from "@/lib/createIntent";
import type { ResidentialRole } from "@/types/database.types";

/** Global "+ Create" menu: opens the right creation sheet from any screen. */
export function CreateMenu({ role, onSelect }: { role?: ResidentialRole; onSelect?: () => void }) {
  const { t } = useI18n();
  const actions = getQuickActionsForRole(role);
  if (actions.length === 0) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button className="w-full justify-start gap-2">
          <IconPlus className="h-5 w-5" />
          {t("quick.create")}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        {actions.map((action) => (
          <DropdownMenuItem
            key={action.intent}
            className="cursor-pointer py-2.5"
            onClick={() => {
              onSelect?.();
              requestCreate(action.intent);
            }}
          >
            {t(action.labelKey)}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
