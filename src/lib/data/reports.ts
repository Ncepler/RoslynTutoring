import "server-only";
import type { ReportInput } from "@/lib/booking/validation";
import { adminReport } from "@/lib/email/templates";
import { isPreview } from "@/lib/env";
import { notifyAdmins } from "@/lib/notify";
import { createServiceClient } from "@/lib/supabase/service";

const TOPIC_LABEL: Record<ReportInput["topic"], string> = {
  booking: "Booking",
  payment: "Payment",
  session: "A session",
  safety: "Safety concern",
  website: "The website",
  other: "Something else",
};

/** Saves a "Report a problem" submission and tells every admin. */
export async function submitReport(input: ReportInput): Promise<void> {
  const topic = TOPIC_LABEL[input.topic];
  if (!isPreview) {
    const db = createServiceClient();
    const { error } = await db.from("reports").insert({
      name: input.name || null,
      email: input.email || null,
      topic: input.topic,
      message: input.message,
      page: input.page || null,
    });
    if (error) throw error;
  }
  await notifyAdmins(adminReport({ ...input, topic }));
}

export { TOPIC_LABEL };
