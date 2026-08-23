/**
 * Shared result type and error-handling helpers for the service layer.
 * Every service builds its responses through these primitives so error
 * handling stays in one place instead of being copy-pasted per method.
 */

export class ApiError extends Error {
  code?: string;
  details?: unknown;

  constructor(message: string, code?: string, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.details = details;
  }
}

export type ApiResult<T> =
  | { success: true; data: T }
  | { success: false; error: ApiError };

export function success<T>(data: T): ApiResult<T> {
  return { success: true, data };
}

export function failure<T>(error: ApiError): ApiResult<T> {
  return { success: false, error };
}

export function handleSupabaseError(error: unknown, context: string): ApiError {
  if (error instanceof Error) {
    return new ApiError(`${context}: ${error.message}`, undefined, error);
  }

  if (error && typeof error === "object") {
    const maybe = error as {
      message?: unknown;
      code?: unknown;
      details?: unknown;
      hint?: unknown;
      status?: unknown;
    };

    const message = typeof maybe.message === "string" ? maybe.message : "Unknown error";
    const code = typeof maybe.code === "string" ? maybe.code : undefined;
    const details = {
      details: maybe.details,
      hint: maybe.hint,
      status: maybe.status,
      raw: error,
    };

    return new ApiError(`${context}: ${message}`, code, details);
  }

  return new ApiError(`${context}: Unknown error`, undefined, error);
}

/**
 * Unwraps a Supabase `{ data, error }` response, throwing on error so it can
 * be caught by wrapResult(). Lets a single method chain several Supabase
 * calls (e.g. a query plus a follow-up lookup) while still ending up as one
 * ApiResult.
 */
export async function unwrap<T>(
  query: PromiseLike<{ data: T | null; error: unknown }>,
): Promise<T> {
  const { data, error } = await query;
  if (error) throw error;
  return data as T;
}

/**
 * Runs `fn`, converting a thrown error (including one raised by unwrap())
 * into a failed ApiResult instead of letting it propagate. This is the piece
 * that replaces the try/catch boilerplate repeated across every service method.
 */
export async function wrapResult<T>(
  context: string,
  fn: () => Promise<T>,
): Promise<ApiResult<T>> {
  try {
    return success(await fn());
  } catch (error) {
    return failure(handleSupabaseError(error, context));
  }
}
