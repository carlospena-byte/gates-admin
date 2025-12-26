import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/lib/supabaseClient";

function App() {
  const [count, setCount] = useState(0);
  const [supabaseStatus, setSupabaseStatus] = useState<string>("");

  const isSupabaseConfigured = useMemo(() => Boolean(supabase), []);

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-2xl px-6 py-12">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">gates-admin</h1>
          <p className="text-sm text-muted-foreground">
            Vite + React + Supabase + shadcn/ui starter.
          </p>
        </div>

        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Starter</CardTitle>
            <CardDescription>
              Quick smoke checks for UI + Supabase wiring.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-center gap-3">
              <Button onClick={() => setCount((current) => current + 1)}>
                Count: {count}
              </Button>

              <Button
                variant="secondary"
                disabled={!isSupabaseConfigured}
                onClick={async () => {
                  if (!supabase) return;
                  const { data, error } = await supabase.auth.getSession();
                  if (error) setSupabaseStatus(`Error: ${error.message}`);
                  else
                    setSupabaseStatus(data.session ? "Session found" : "No session");
                }}
              >
                Check Supabase Session
              </Button>
            </div>

            <div className="mt-4 text-sm text-muted-foreground">
              {isSupabaseConfigured
                ? "Supabase configured via VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY."
                : "Supabase not configured yet. Copy .env.example → .env and fill the values."}
            </div>

            {supabaseStatus ? (
              <div className="mt-2 text-sm">{supabaseStatus}</div>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default App;
