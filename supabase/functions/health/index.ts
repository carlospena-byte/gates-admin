import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

serve(() => {
  return Response.json({ ok: true, service: "health" });
});
