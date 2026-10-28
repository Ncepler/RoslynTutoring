import "server-only";
import { Resend } from "resend";
import { site } from "@/config/site";

export type Attachment = { filename: string; content: string; contentType?: string };

export type Email = {
  to: string | string[];
  cc?: string | string[];
  replyTo?: string;
  subject: string;
  html: string;
  text: string;
  attachments?: Attachment[];
};

let resend: Resend | null = null;

export const emailConfigured = Boolean(process.env.RESEND_API_KEY);

/**
 * Sends one email through Resend. Without RESEND_API_KEY (local dev, preview)
 * it logs the email instead, so every flow still runs end to end.
 * Never throws: a failed email shouldn't undo a booking.
 */
export async function sendEmail(email: Email): Promise<{ ok: boolean }> {
  const to = unique(email.to);
  if (to.length === 0) return { ok: false };

  if (!emailConfigured) {
    console.info(`[email skipped: RESEND_API_KEY not set] to=${to.join(", ")} subject="${email.subject}"`);
    return { ok: true };
  }

  try {
    resend ??= new Resend(process.env.RESEND_API_KEY);
    const { error } = await resend.emails.send({
      from: process.env.EMAIL_FROM ?? `${site.name} <onboarding@resend.dev>`,
      to,
      cc: email.cc ? unique(email.cc).filter((a) => !to.includes(a)) : undefined,
      replyTo: email.replyTo ?? site.contactEmail,
      subject: email.subject,
      html: email.html,
      text: email.text,
      attachments: email.attachments?.map((a) => ({
        filename: a.filename,
        content: Buffer.from(a.content).toString("base64"),
        contentType: a.contentType,
      })),
    });
    if (error) {
      console.error("[email] Resend rejected the email", error);
      return { ok: false };
    }
    return { ok: true };
  } catch (err) {
    console.error("[email] failed to send", err);
    return { ok: false };
  }
}

function unique(value: string | string[]): string[] {
  const list = Array.isArray(value) ? value : [value];
  return [...new Set(list.map((v) => v.trim().toLowerCase()).filter(Boolean))];
}
