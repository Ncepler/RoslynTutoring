import "server-only";
import { createSign } from "node:crypto";

/**
 * Google Calendar through a service account (free). Each tutor shares their
 * own Google Calendar with the service account's email ("Make changes to
 * events") and puts that calendar's ID (usually their Gmail address) on their
 * dashboard profile. If anything is missing we skip quietly; the .ics
 * attachment on the confirmation email is the fallback.
 */

const SCOPE = "https://www.googleapis.com/auth/calendar.events";

function credentials() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, "\n");
  return email && key ? { email, key } : null;
}

export const googleCalendarConfigured = Boolean(credentials());

let cached: { token: string; expiresAt: number } | null = null;

function base64url(input: string | Buffer) {
  return Buffer.from(input).toString("base64url");
}

async function accessToken(): Promise<string | null> {
  const creds = credentials();
  if (!creds) return null;
  if (cached && cached.expiresAt > Date.now() + 60_000) return cached.token;

  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = base64url(
    JSON.stringify({ iss: creds.email, scope: SCOPE, aud: "https://oauth2.googleapis.com/token", iat: now, exp: now + 3600 }),
  );
  const signer = createSign("RSA-SHA256");
  signer.update(`${header}.${claims}`);
  const jwt = `${header}.${claims}.${base64url(signer.sign(creds.key))}`;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: jwt }),
  });
  if (!res.ok) {
    console.error("[google] token request failed", res.status, await res.text());
    return null;
  }
  const json = (await res.json()) as { access_token: string; expires_in: number };
  cached = { token: json.access_token, expiresAt: Date.now() + json.expires_in * 1000 };
  return json.access_token;
}

export type CalendarEvent = {
  summary: string;
  description: string;
  location?: string;
  start: Date;
  end: Date;
};

/** Creates the event on the tutor's calendar. Returns its id, or null if skipped. */
export async function createCalendarEvent(calendarId: string | null, event: CalendarEvent): Promise<string | null> {
  if (!calendarId) return null;
  try {
    const token = await accessToken();
    if (!token) return null;
    const res = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`,
      {
        method: "POST",
        headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
        body: JSON.stringify({
          summary: event.summary,
          description: event.description,
          location: event.location,
          start: { dateTime: event.start.toISOString() },
          end: { dateTime: event.end.toISOString() },
          reminders: { useDefault: false, overrides: [{ method: "popup", minutes: 30 }] },
        }),
      },
    );
    if (!res.ok) {
      console.error("[google] create event failed", res.status, await res.text());
      return null;
    }
    return ((await res.json()) as { id: string }).id;
  } catch (err) {
    console.error("[google] create event failed", err);
    return null;
  }
}

export async function deleteCalendarEvent(calendarId: string | null, eventId: string | null): Promise<void> {
  if (!calendarId || !eventId) return;
  try {
    const token = await accessToken();
    if (!token) return;
    const res = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
      { method: "DELETE", headers: { authorization: `Bearer ${token}` } },
    );
    if (!res.ok && res.status !== 404 && res.status !== 410) {
      console.error("[google] delete event failed", res.status, await res.text());
    }
  } catch (err) {
    console.error("[google] delete event failed", err);
  }
}
