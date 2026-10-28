/**
 * Which integrations are configured. Anything missing degrades gracefully:
 * no Supabase means preview mode with sample data, no Resend means emails are
 * logged instead of sent, and so on. See .env.example.
 */

export const env = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  supabasePublishableKey:
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
};

/** True when Supabase isn't connected. The site runs on sample data and saves nothing. */
export const isPreview = !env.supabaseUrl || !env.supabasePublishableKey;
