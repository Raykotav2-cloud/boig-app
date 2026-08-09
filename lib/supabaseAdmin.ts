import { createClient } from "@supabase/supabase-js";

// Server-only client. NEVER import this in a "use client" component —
// it uses the secret service role key, which must stay on the server.
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);