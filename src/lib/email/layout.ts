import { site } from "@/config/site";

/** Escapes text for safe use inside email HTML. */
export function esc(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export type EmailBlock =
  | { type: "p"; text: string }
  | { type: "details"; rows: [string, string][] }
  | { type: "button"; label: string; href: string }
  | { type: "note"; text: string };

const INK = "#0b1526";
const MUTED = "#5b6577";
const LINE = "#e3e8f0";
const ACCENT = "#1a56f0";

/**
 * One plain, consistent layout for every email: wordmark, heading, blocks.
 * Inline styles only, because email clients ignore stylesheets.
 */
export function renderEmail(heading: string, blocks: EmailBlock[]): { html: string; text: string } {
  const body = blocks
    .map((b) => {
      switch (b.type) {
        case "p":
          return `<p style="margin:0 0 16px;font-size:16px;line-height:1.55;color:${INK}">${esc(b.text)}</p>`;
        case "note":
          return `<p style="margin:0 0 16px;font-size:14px;line-height:1.5;color:${MUTED}">${esc(b.text)}</p>`;
        case "button":
          return `<p style="margin:24px 0"><a href="${esc(b.href)}" style="display:inline-block;background:${ACCENT};color:#ffffff;text-decoration:none;font-weight:600;font-size:16px;padding:12px 22px;border-radius:999px">${esc(b.label)}</a></p>`;
        case "details":
          return `<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;margin:8px 0 20px;border-top:1px solid ${LINE}">${b.rows
            .map(
              ([k, v]) =>
                `<tr><td style="padding:10px 0;border-bottom:1px solid ${LINE};font-size:14px;color:${MUTED};width:38%;vertical-align:top">${esc(k)}</td><td style="padding:10px 0;border-bottom:1px solid ${LINE};font-size:15px;color:${INK};vertical-align:top">${esc(v)}</td></tr>`,
            )
            .join("")}</table>`;
      }
    })
    .join("\n");

  const html = `<!doctype html>
<html><body style="margin:0;padding:0;background:#f5f7fb">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f7fb;padding:32px 16px">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid ${LINE};border-radius:20px;padding:32px">
<tr><td style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif">
<p style="margin:0 0 24px;font-size:15px;font-weight:700;letter-spacing:-0.01em;color:${INK}">${esc(site.name)}</p>
<h1 style="margin:0 0 16px;font-size:24px;line-height:1.2;letter-spacing:-0.02em;color:${INK}">${esc(heading)}</h1>
${body}
<p style="margin:28px 0 0;padding-top:16px;border-top:1px solid ${LINE};font-size:13px;line-height:1.5;color:${MUTED}">${esc(site.name)} · Student-run tutoring in ${esc(site.area)} · Questions? Reply to this email or write to ${esc(site.contactEmail)}.</p>
</td></tr></table>
</td></tr></table>
</body></html>`;

  const text = [
    site.name,
    "",
    heading,
    "",
    ...blocks.map((b) => {
      switch (b.type) {
        case "p":
        case "note":
          return `${b.text}\n`;
        case "button":
          return `${b.label}: ${b.href}\n`;
        case "details":
          return `${b.rows.map(([k, v]) => `${k}: ${v}`).join("\n")}\n`;
      }
    }),
    `Questions? Reply to this email or write to ${site.contactEmail}.`,
  ].join("\n");

  return { html, text };
}
