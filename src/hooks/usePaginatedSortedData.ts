/**
 * Reusable hook for paginated and sorted data
 */

import { useMemo, useState } from "react";

export type SortOrder = "asc" | "desc";

interface UsePaginatedSortedDataOptions<T, K extends keyof T> {
  data: T[];
  defaultSortField: K;
  defaultSortOrder?: SortOrder;
  itemsPerPage?: number;
}

export function usePaginatedSortedData<T, K extends keyof T>({
  data,
  defaultSortField,
  defaultSortOrder = "asc",
  itemsPerPage = 10,
}: UsePaginatedSortedDataOptions<T, K>) {
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState<K>(defaultSortField);
  const [sortOrder, setSortOrder] = useState<SortOrder>(defaultSortOrder);

  function compareValues(a: unknown, b: unknown) {
    if (a === b) return 0;
    if (a === null || a === undefined) return -1;
    if (b === null || b === undefined) return 1;

    if (typeof a === "boolean" && typeof b === "boolean") {
      return Number(a) - Number(b);
    }

    if (typeof a === "number" && typeof b === "number") {
      return a - b;
    }

    if (typeof a === "string" && typeof b === "string") {
      return a.localeCompare(b);
    }

    return String(a).localeCompare(String(b));
  }

  // Sorting logic
  const sortedData = useMemo(() => {
    return [...data].sort((a, b) => {
      const direction = sortOrder === "asc" ? 1 : -1;
      const order = compareValues(a[sortField], b[sortField]);
      return direction * order;
    });
  }, [data, sortField, sortOrder]);

  // Pagination logic
  const totalItems = sortedData.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedData = sortedData.slice(startIndex, endIndex);

  const handleSort = (field: K) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  const resetPage = () => setCurrentPage(1);

  return {
    // Data
    paginatedData,
    totalItems,
    totalPages,
    startIndex,
    endIndex,

    // Sorting
    sortField,
    sortOrder,
    handleSort,

    // Pagination
    currentPage,
    setCurrentPage,
    resetPage,
  };
}
