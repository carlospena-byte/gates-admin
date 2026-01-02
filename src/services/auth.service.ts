import { requireSupabase } from "../lib/supabaseClient";
import type { Session, User } from "@supabase/supabase-js";
import { ApiError, type ApiResult } from "./api.service";

// ============================================================================
// Types
// ============================================================================

export interface SignInWithOtpParams {
  email: string;
  shouldCreateUser?: boolean;
  data?: {
    first_name?: string;
    last_name?: string;
    phone?: string;
  };
}

export interface VerifyOtpParams {
  email: string;
  token: string;
}

// ============================================================================
// Helper Functions
// ============================================================================

function success<T>(data: T): ApiResult<T> {
  return { success: true, data };
}

function failure<T>(error: ApiError): ApiResult<T> {
  return { success: false, error };
}

function handleSupabaseError(error: unknown, context: string): ApiError {
  if (error instanceof Error) {
    return new ApiError(`${context}: ${error.message}`, undefined, error);
  }
  return new ApiError(`${context}: Unknown error`, undefined, error);
}

// ============================================================================
// Auth Service
// ============================================================================

export const authService = {
  /**
   * Get the current session
   */
  async getSession(): Promise<ApiResult<Session | null>> {
    try {
      const supabase = requireSupabase();
      const { data, error } = await supabase.auth.getSession();

      if (error) throw error;
      return success(data.session);
    } catch (error) {
      return failure(handleSupabaseError(error, "Failed to get session"));
    }
  },

  /**
   * Get the current user
   */
  async getUser(): Promise<ApiResult<User | null>> {
    try {
      const supabase = requireSupabase();
      const { data, error } = await supabase.auth.getUser();

      if (error) throw error;
      return success(data.user);
    } catch (error) {
      return failure(handleSupabaseError(error, "Failed to get user"));
    }
  },

  /**
   * Send OTP to email
   */
  async signInWithOtp(params: SignInWithOtpParams): Promise<ApiResult<void>> {
    try {
      const supabase = requireSupabase();
      const { error } = await supabase.auth.signInWithOtp({
        email: params.email,
        options: {
          shouldCreateUser: params.shouldCreateUser ?? true,
          data: params.data,
        },
      });

      if (error) throw error;
      return success(undefined);
    } catch (error) {
      return failure(handleSupabaseError(error, "Failed to send OTP"));
    }
  },

  /**
   * Verify OTP and sign in
   */
  async verifyOtp(params: VerifyOtpParams): Promise<ApiResult<Session>> {
    try {
      const supabase = requireSupabase();
      const { data, error } = await supabase.auth.verifyOtp({
        email: params.email,
        token: params.token,
        type: "email",
      });

      if (error) throw error;
      if (!data.session) {
        throw new Error("No session returned after OTP verification");
      }

      return success(data.session);
    } catch (error) {
      return failure(handleSupabaseError(error, "Failed to verify OTP"));
    }
  },

  /**
   * Sign out
   */
  async signOut(): Promise<ApiResult<void>> {
    try {
      const supabase = requireSupabase();
      const { error } = await supabase.auth.signOut();

      // In local development with seeded users, signOut might return 403
      // This is expected and we should still clear the local session
      if (error && error.message && !error.message.includes('403')) {
        throw error;
      }

      // Even if there's a 403 error, we successfully signed out locally
      return success(undefined);
    } catch (error) {
      return failure(handleSupabaseError(error, "Failed to sign out"));
    }
  },

  /**
   * Subscribe to auth state changes
   */
  onAuthStateChange(callback: (session: Session | null) => void) {
    const supabase = requireSupabase();
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      callback(session);
    });
    return subscription;
  },
};
