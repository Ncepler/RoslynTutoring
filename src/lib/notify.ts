import "server-only";
import { isPreview } from "@/lib/env";
import { sendEmail } from "@/lib/email/send";
import { createServiceClient } from "@/lib/supabase/service";

export type AdminNotice = {
  subject: string;
  html: string;
  text: string;
};

/**
 * Tells all four founders about something. This is the only way the app
 * reaches admins, so the channel can change in one place: today it's email
 * through Resend; SMS can be added here if a provider is picked.
 */
export async function notifyAdmins(notice: AdminNotice): Promise<void> {
  const to = await adminEmails();
  if (to.length === 0) {
    console.info(`[notifyAdmins] no admin emails configured: ${notice.subject}`);
    return;
  }
  await sendEmail({ to, ...notice });
}

async function adminEmails(): Promise<string[]> {
  const fallback = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean);
  if (isPreview) return fallback;
  try {
    const db = createServiceClient();
    const { data, error } = await db.from("tutor_private").select("email, tutors!inner(active)").eq("tutors.active", true);
    if (error) throw error;
    const emails = (data ?? []).map((r: { email: string }) => r.email);
    return emails.length > 0 ? emails : fallback;
  } catch (err) {
    console.error("[notifyAdmins] couldn't load admin emails", err);
    return fallback;
  }
}
