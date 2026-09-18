/**
 * Centered "nothing here yet" placeholder for a section card — an icon in a
 * soft circle, a bold headline, and a lighter supporting line. Shared by
 * Residents, Rentals and Extra charges so empty states look consistent.
 */

import type { ComponentType } from "react";

interface SectionEmptyStateProps {
  icon: ComponentType<{ className?: string }>;
  title: string;
  description: string;
}

export function SectionEmptyState({ icon: Icon, title, description }: SectionEmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-3 py-8 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
        <Icon className="h-6 w-6 text-muted-foreground" />
      </span>
      <div className="space-y-1">
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}
