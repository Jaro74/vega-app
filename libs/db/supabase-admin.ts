import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Cliente admin (service role) para las tablas del experimento Vega.
// Deliberadamente distinto de libs/supabase/{client,server}.ts: aquellos
// usan la anon key ligada a cookies de sesion para el Supabase Auth del
// boilerplate (dashboard). Este cliente usa la service role key y solo
// se ejecuta server-side: el import de "server-only" hace que el build
// falle si algun componente cliente lo importa por error.
let cachedClient: SupabaseClient | null = null;

export function getSupabaseAdminClient(): SupabaseClient {
  if (cachedClient) return cachedClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY no configuradas. " +
        "Son obligatorias cuando EXPERIMENT_DB_DRIVER=supabase."
    );
  }

  cachedClient = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cachedClient;
}
