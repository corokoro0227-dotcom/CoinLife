import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const FROM = process.env.EMAIL_FROM ?? "Conviction <onboarding@resend.dev>";

/**
 * Sends an email via Resend. No-ops (with a console warning) when
 * RESEND_API_KEY isn't configured, so local development and preview
 * deploys keep working — the magic link is logged to the server console
 * instead of actually sent.
 */
export async function sendEmail(to: string, subject: string, text: string): Promise<void> {
  if (!resend) {
    console.warn(`RESEND_API_KEY is not set; skipped sending "${subject}" to ${to}\n---\n${text}\n---`);
    return;
  }
  await resend.emails.send({ from: FROM, to, subject, text });
}
