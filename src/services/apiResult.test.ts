import { describe, expect, it } from "vitest";
import { ApiError, failure, handleSupabaseError, success, unwrap, wrapResult } from "./apiResult";

describe("success/failure", () => {
  it("success wraps data as a successful ApiResult", () => {
    expect(success({ id: "1" })).toEqual({ success: true, data: { id: "1" } });
  });

  it("failure wraps an ApiError as a failed ApiResult", () => {
    const error = new ApiError("boom");
    expect(failure(error)).toEqual({ success: false, error });
  });
});

describe("handleSupabaseError", () => {
  it("prefixes a plain Error's message with the context", () => {
    const result = handleSupabaseError(new Error("network down"), "Failed to list units");
    expect(result).toBeInstanceOf(ApiError);
    expect(result.message).toBe("Failed to list units: network down");
  });

  it("extracts message/code/details/hint from a Postgrest-shaped error object", () => {
    const pgError = { message: "duplicate key", code: "23505", details: "Key exists.", hint: null, status: 409 };
    const result = handleSupabaseError(pgError, "Failed to create unit");

    expect(result.message).toBe("Failed to create unit: duplicate key");
    expect(result.code).toBe("23505");
    expect(result.details).toMatchObject({ details: "Key exists.", hint: null, status: 409, raw: pgError });
  });

  it("falls back to a generic message for a non-object, non-Error value", () => {
    const result = handleSupabaseError("nope", "Failed to delete unit");
    expect(result.message).toBe("Failed to delete unit: Unknown error");
    expect(result.code).toBeUndefined();
  });
});

describe("unwrap", () => {
  it("resolves with data when the query has no error", async () => {
    const data = await unwrap(Promise.resolve({ data: [{ id: "1" }], error: null }));
    expect(data).toEqual([{ id: "1" }]);
  });

  it("throws the raw error when the query failed, for wrapResult to catch", async () => {
    const pgError = { message: "not found", code: "PGRST116" };
    await expect(unwrap(Promise.resolve({ data: null, error: pgError }))).rejects.toBe(pgError);
  });
});

describe("wrapResult", () => {
  it("returns a successful ApiResult when fn resolves", async () => {
    const result = await wrapResult("Failed to list units", async () => [{ id: "1" }]);
    expect(result).toEqual({ success: true, data: [{ id: "1" }] });
  });

  it("catches a thrown error (e.g. from unwrap) and returns a failed ApiResult", async () => {
    const result = await wrapResult("Failed to list units", () =>
      unwrap(Promise.resolve({ data: null, error: { message: "denied", code: "42501" } })),
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toBe("Failed to list units: denied");
      expect(result.error.code).toBe("42501");
    }
  });
});
