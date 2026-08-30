/**
 * Small icon set shared by the entity Manager components.
 * Thin wrappers around @tabler/icons-react, sized h-5 w-5 so they hold up
 * next to the h-6 w-11 Switch these tables pair them with.
 */

import {
  IconPlus,
  IconX,
  IconEdit,
  IconChevronDown,
  IconChevronRight,
  IconSettings,
} from "@tabler/icons-react";

export const PlusIcon = () => <IconPlus className="h-5 w-5" />;

export const DeleteIcon = () => <IconX className="h-5 w-5" />;

export const EditIcon = () => <IconEdit className="h-5 w-5" />;

export const ChevronDownIcon = () => <IconChevronDown className="h-5 w-5" />;

export const ChevronRightIcon = () => <IconChevronRight className="h-5 w-5" />;

export const SettingsIcon = () => <IconSettings className="h-5 w-5" />;
