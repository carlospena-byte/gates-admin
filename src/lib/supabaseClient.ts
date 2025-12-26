import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as
  | string
  | undefined;

export const supabase =
  supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null;

if (import.meta.env.DEV && !supabase) {
  // eslint-disable-next-line no-console
  console.warn(
    "Supabase not configured: set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (see .env.example)",
  );
}
