import { useEffect, useState } from "react";

import type { Session } from "@supabase/supabase-js";

import { supabase } from "@/lib/supabaseClient";

export function useSession({ enabled = true }: { enabled?: boolean } = {}) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!enabled) return;
    if (!supabase) return;

    let isMounted = true;

    supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (!isMounted) return;
        if (error) {
          setSession(null);
          return;
        }
        setSession(data.session);
      })
      .finally(() => {
        if (!isMounted) return;
        setIsLoading(false);
      });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setIsLoading(false);
    });

    return () => {
      isMounted = false;
      subscription.subscription.unsubscribe();
    };
  }, [enabled]);

  return { session, isLoading };
}

