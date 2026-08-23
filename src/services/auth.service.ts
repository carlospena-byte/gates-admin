import { requireSupabase } from "../lib/supabaseClient";
import type { Session, User } from "@supabase/supabase-js";
import { wrapResult, type ApiResult } from "./apiResult";

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
// Auth Service
// ============================================================================

export const authService = {
  /**
   * Get the current session
   */
  getSession(): Promise<ApiResult<Session | null>> {
    return wrapResult("Failed to get session", async () => {
      const { data, error } = await requireSupabase().auth.getSession();
      if (error) throw error;
      return data.session;
    });
  },

  /**
   * Get the current user
   */
  getUser(): Promise<ApiResult<User | null>> {
    return wrapResult("Failed to get user", async () => {
      const { data, error } = await requireSupabase().auth.getUser();
      if (error) throw error;
      return data.user;
    });
  },

  /**
   * Send OTP to email
   */
  signInWithOtp(params: SignInWithOtpParams): Promise<ApiResult<void>> {
    return wrapResult("Failed to send OTP", async () => {
      const { error } = await requireSupabase().auth.signInWithOtp({
        email: params.email,
        options: {
          shouldCreateUser: params.shouldCreateUser ?? true,
          data: params.data,
        },
      });
      if (error) throw error;
    });
  },

  /**
   * Verify OTP and sign in
   */
  verifyOtp(params: VerifyOtpParams): Promise<ApiResult<Session>> {
    return wrapResult("Failed to verify OTP", async () => {
      const { data, error } = await requireSupabase().auth.verifyOtp({
        email: params.email,
        token: params.token,
        type: "email",
      });
      if (error) throw error;
      if (!data.session) {
        throw new Error("No session returned after OTP verification");
      }
      return data.session;
    });
  },

  /**
   * Sign out
   */
  signOut(): Promise<ApiResult<void>> {
    return wrapResult("Failed to sign out", async () => {
      const { error } = await requireSupabase().auth.signOut();

      // In local development with seeded users, signOut might return 403.
      // This is expected and we should still treat the session as cleared.
      if (error && error.message && !error.message.includes("403")) {
        throw error;
      }
    });
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
