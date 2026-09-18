/**
 * Best-effort icon per addon type, matched by keyword against the addon
 * type's name (there's no dedicated icon field on addon_types). Falls back
 * to a generic tag icon for anything unrecognized.
 */

import { IconBox, IconCar, IconLock, IconMotorbike, IconPaw, IconTag } from "@tabler/icons-react";
import type { ComponentType } from "react";

type IconComponent = ComponentType<{ className?: string }>;

const KEYWORD_ICONS: [RegExp, IconComponent][] = [
  [/moto|bike/i, IconMotorbike],
  [/park/i, IconCar],
  [/stor|bodega/i, IconBox],
  [/locker|casillero/i, IconLock],
  [/pet|mascota/i, IconPaw],
];

export function getAddonTypeIcon(typeName?: string | null): IconComponent {
  const match = typeName ? KEYWORD_ICONS.find(([pattern]) => pattern.test(typeName)) : undefined;
  return match ? match[1] : IconTag;
}
