import { beforeEach, describe, expect, it, vi } from "vitest";

const mockFrom = vi.fn();

vi.mock("@/lib/supabaseClient", () => ({
  requireSupabase: () => ({ from: mockFrom }),
}));

// Imported after the mock so createCrudService picks up the mocked client.
const { createCrudService } = await import("./createCrudService");

interface Row {
  id: string;
  residential_id: string;
  name: string;
  is_active: boolean;
}

/**
 * A minimal fake Supabase query builder: every chainable method returns
 * itself and records its call, `.single()` and awaiting the chain directly
 * (used by `list`, which never calls `.single()`) both resolve to the same
 * configured `{data, error}` result — matching how the real
 * PostgrestBuilder is thenable. Loosely typed on purpose: standing in for
 * Supabase's own fluent builder type isn't worth reproducing here, same
 * "any is fine for this one boundary" call the codebase already makes in
 * createCrudService.ts itself.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function createChain(result: { data: unknown; error: unknown }): any {
  const chain = {
    select: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    order: vi.fn(() => chain),
    insert: vi.fn(() => chain),
    update: vi.fn(() => chain),
    delete: vi.fn(() => chain),
    single: vi.fn(() => Promise.resolve(result)),
    then: (onFulfilled: (v: typeof result) => unknown, onRejected?: (e: unknown) => unknown) =>
      Promise.resolve(result).then(onFulfilled, onRejected),
  };
  return chain;
}

beforeEach(() => {
  mockFrom.mockReset();
});

describe("createCrudService", () => {
  const service = createCrudService<Row, Partial<Row>, Partial<Row>>("units", {
    orderBy: "name",
    parentColumn: "residential_id",
  });

  it("list() queries the right table, filtered and ordered", async () => {
    const rows: Row[] = [{ id: "1", residential_id: "r1", name: "101", is_active: true }];
    const chain = createChain({ data: rows, error: null });
    mockFrom.mockReturnValue(chain);

    const result = await service.list("r1");

    expect(mockFrom).toHaveBeenCalledWith("units");
    expect(chain.select).toHaveBeenCalledWith("*");
    expect(chain.eq).toHaveBeenCalledWith("residential_id", "r1");
    expect(chain.order).toHaveBeenCalledWith("name");
    expect(result).toEqual({ success: true, data: rows });
  });

  it("list() returns an empty array (not null) when data is null", async () => {
    mockFrom.mockReturnValue(createChain({ data: null, error: null }));
    const result = await service.list("r1");
    expect(result).toEqual({ success: true, data: [] });
  });

  it("create() inserts and selects the single created row", async () => {
    const row: Row = { id: "1", residential_id: "r1", name: "101", is_active: true };
    const chain = createChain({ data: row, error: null });
    mockFrom.mockReturnValue(chain);

    const result = await service.create({ residential_id: "r1", name: "101" });

    expect(chain.insert).toHaveBeenCalledWith([{ residential_id: "r1", name: "101" }]);
    expect(chain.single).toHaveBeenCalled();
    expect(result).toEqual({ success: true, data: row });
  });

  it("update() updates by id and returns a failed ApiResult on error", async () => {
    const pgError = { message: "not found", code: "PGRST116" };
    mockFrom.mockReturnValue(createChain({ data: null, error: pgError }));

    const result = await service.update("1", { name: "102" });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("PGRST116");
      expect(result.error.message).toContain("Failed to update units");
    }
  });

  it("delete() calls delete().eq('id', id)", async () => {
    const chain = createChain({ data: null, error: null });
    mockFrom.mockReturnValue(chain);

    const result = await service.delete("1");

    expect(chain.delete).toHaveBeenCalled();
    expect(chain.eq).toHaveBeenCalledWith("id", "1");
    expect(result).toEqual({ success: true, data: undefined });
  });

  it("toggleActive() flips is_active via update()", async () => {
    const row: Row = { id: "1", residential_id: "r1", name: "101", is_active: true };
    const chain = createChain({ data: row, error: null });
    mockFrom.mockReturnValue(chain);

    await service.toggleActive("1", false);

    expect(chain.update).toHaveBeenCalledWith({ is_active: true });
  });
});
