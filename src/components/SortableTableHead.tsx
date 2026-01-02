/**
 * Sortable Table Head Component
 */

import { TableHead } from "@/components/ui/table";
import { type SortOrder } from "@/hooks/usePaginatedSortedData";

interface SortableTableHeadProps<T> {
  field: T;
  currentSortField: T;
  sortOrder: SortOrder;
  onSort: (field: T) => void;
  children: React.ReactNode;
  className?: string;
}

export function SortableTableHead<T extends string>({
  field,
  currentSortField,
  sortOrder,
  onSort,
  children,
  className,
}: SortableTableHeadProps<T>) {
  const isActive = currentSortField === field;

  return (
    <TableHead
      className={`cursor-pointer hover:bg-muted/50 ${className || ""}`}
      onClick={() => onSort(field)}
    >
      <div className="flex items-center gap-1">
        {children}
        {isActive && <span className="text-xs">{sortOrder === "asc" ? "↑" : "↓"}</span>}
      </div>
    </TableHead>
  );
}
