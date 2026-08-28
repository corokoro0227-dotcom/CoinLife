import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const FROM = process.env.EMAIL_FROM ?? "CoinLife <onboarding@resend.dev>";

/**
 * Sends an email via Resend. No-ops (with a console warning) when
 * RESEND_API_KEY isn't configured, so the rest of the app keeps working
 * without it — email is an optional add-on, not a hard dependency.
 */
export async function sendEmail(to: string, subject: string, text: string): Promise<void> {
  if (!resend) {
    console.warn(`RESEND_API_KEY is not set; skipped sending "${subject}" to ${to}`);
    return;
  }
  await resend.emails.send({ from: FROM, to, subject, text });
}
