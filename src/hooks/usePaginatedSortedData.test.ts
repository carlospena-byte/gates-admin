import { describe, expect, it } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { usePaginatedSortedData } from "./usePaginatedSortedData";

interface Row {
  id: string;
  name: string;
  amount: number;
}

const ROWS: Row[] = [
  { id: "1", name: "Charlie", amount: 30 },
  { id: "2", name: "Alice", amount: 10 },
  { id: "3", name: "Bob", amount: 20 },
];

describe("usePaginatedSortedData", () => {
  it("sorts ascending by the default sort field", () => {
    const { result } = renderHook(() =>
      usePaginatedSortedData({ data: ROWS, defaultSortField: "name" }),
    );

    expect(result.current.paginatedData.map((r) => r.name)).toEqual(["Alice", "Bob", "Charlie"]);
    expect(result.current.sortOrder).toBe("asc");
  });

  it("toggles sort order when sorting the same field twice", () => {
    const { result } = renderHook(() =>
      usePaginatedSortedData({ data: ROWS, defaultSortField: "name" }),
    );

    act(() => result.current.handleSort("name"));
    expect(result.current.sortOrder).toBe("desc");
    expect(result.current.paginatedData.map((r) => r.name)).toEqual(["Charlie", "Bob", "Alice"]);

    act(() => result.current.handleSort("name"));
    expect(result.current.sortOrder).toBe("asc");
  });

  it("resets to ascending when switching to a different field", () => {
    const { result } = renderHook(() =>
      usePaginatedSortedData({ data: ROWS, defaultSortField: "name" as keyof Row }),
    );

    act(() => result.current.handleSort("name")); // now desc on name
    act(() => result.current.handleSort("amount")); // switch field

    expect(result.current.sortField).toBe("amount");
    expect(result.current.sortOrder).toBe("asc");
    expect(result.current.paginatedData.map((r) => r.amount)).toEqual([10, 20, 30]);
  });

  it("paginates according to itemsPerPage", () => {
    const { result } = renderHook(() =>
      usePaginatedSortedData({ data: ROWS, defaultSortField: "name", itemsPerPage: 2 }),
    );

    expect(result.current.totalPages).toBe(2);
    expect(result.current.paginatedData).toHaveLength(2);

    act(() => result.current.setCurrentPage(2));
    expect(result.current.paginatedData.map((r) => r.name)).toEqual(["Charlie"]);
  });

  it("resetPage returns to page 1", () => {
    const { result } = renderHook(() =>
      usePaginatedSortedData({ data: ROWS, defaultSortField: "name", itemsPerPage: 2 }),
    );

    act(() => result.current.setCurrentPage(2));
    expect(result.current.currentPage).toBe(2);

    act(() => result.current.resetPage());
    expect(result.current.currentPage).toBe(1);
  });
});
