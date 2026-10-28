import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";

let client: SupabaseClient | null = null;

/**
 * Service-role client. Bypasses RLS, so only use it in server routes that have
 * already validated their input: public booking requests, problem reports,
 * the Stripe webhook and the daily cron job.
 */
export function createServiceClient(): SupabaseClient {
  const key = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!env.supabaseUrl || !key) throw new Error("Supabase service key is not configured");
  client ??= createClient(env.supabaseUrl, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return client;
}

/** Anonymous client for public catalog reads. RLS limits it to public data. */
export function createPublicClient(): SupabaseClient {
  return createClient(env.supabaseUrl, env.supabasePublishableKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
