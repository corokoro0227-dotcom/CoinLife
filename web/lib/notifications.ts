import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";

// How far ahead of an event "closing soon" / "ending soon" reminders fire.
const LEAD_TIME_MS = 60 * 60 * 1000; // 1 hour

async function emailVerifiedRecipients(userIds: string[]): Promise<{ userId: string; email: string }[]> {
  const users = await prisma.user.findMany({
    where: { id: { in: userIds }, emailVerifiedAt: { not: null } },
    select: { id: true, email: true },
  });
  return users.filter((u): u is { id: string; email: string } => Boolean(u.email)).map((u) => ({ userId: u.id, email: u.email }));
}

async function emailRecipientsQuietly(recipients: { email: string }[], subject: string, message: string) {
  for (const recipient of recipients) {
    try {
      await sendEmail(recipient.email, subject, message);
    } catch (error) {
      console.error(`Failed to send "${subject}" to ${recipient.email}`, error);
    }
  }
}

async function notifyAllUsers(contestId: string, type: "ENTRY_OPENED" | "ENTRY_CLOSING_SOON", message: string) {
  const users = await prisma.user.findMany({ select: { id: true } });
  if (users.length === 0) return;
  await prisma.notification.createMany({
    data: users.map((user) => ({ userId: user.id, contestId, type, message })),
  });

  const recipients = await emailVerifiedRecipients(users.map((u) => u.id));
  await emailRecipientsQuietly(recipients, "CoinLife からのお知らせ", message);
}

async function notifyParticipants(contestId: string, type: "CONTEST_STARTED" | "CONTEST_ENDING_SOON", message: string) {
  const participants = await prisma.contestParticipant.findMany({ where: { contestId }, select: { userId: true } });
  if (participants.length === 0) return;
  await prisma.notification.createMany({
    data: participants.map((p) => ({ userId: p.userId, contestId, type, message })),
  });

  const recipients = await emailVerifiedRecipients(participants.map((p) => p.userId));
  await emailRecipientsQuietly(recipients, "CoinLife からのお知らせ", message);
}

/**
 * Checks every contest for the four reminder trigger points (entry opened,
 * entry closing soon, contest started, contest ending soon) and creates
 * notifications (in-app, plus email for users with a verified address) for
 * the relevant audience. Each trigger is guarded by a `*NotifiedAt`
 * timestamp on the Contest so it only ever fires once per round, regardless
 * of how often this runs.
 */
export async function sendContestReminders(now = new Date()): Promise<{ notified: number }> {
  let notified = 0;

  const entryOpening = await prisma.contest.findMany({
    where: { entryOpensAt: { lte: now }, entryOpenedNotifiedAt: null },
  });
  for (const contest of entryOpening) {
    await notifyAllUsers(contest.id, "ENTRY_OPENED", `「${contest.title}」のエントリーが始まりました。`);
    await prisma.contest.update({ where: { id: contest.id }, data: { entryOpenedNotifiedAt: now } });
    notified += 1;
  }

  const entryClosingSoon = await prisma.contest.findMany({
    where: {
      startAt: { lte: new Date(now.getTime() + LEAD_TIME_MS), gt: now },
      entryClosingNotifiedAt: null,
    },
  });
  for (const contest of entryClosingSoon) {
    await notifyAllUsers(contest.id, "ENTRY_CLOSING_SOON", `「${contest.title}」のエントリー期間がまもなく終了します。`);
    await prisma.contest.update({ where: { id: contest.id }, data: { entryClosingNotifiedAt: now } });
    notified += 1;
  }

  const starting = await prisma.contest.findMany({
    where: { startAt: { lte: now }, contestStartedNotifiedAt: null },
  });
  for (const contest of starting) {
    await notifyParticipants(contest.id, "CONTEST_STARTED", `「${contest.title}」が始まりました。`);
    await prisma.contest.update({ where: { id: contest.id }, data: { contestStartedNotifiedAt: now } });
    notified += 1;
  }

  const endingSoon = await prisma.contest.findMany({
    where: {
      endAt: { lte: new Date(now.getTime() + LEAD_TIME_MS), gt: now },
      contestEndingNotifiedAt: null,
    },
  });
  for (const contest of endingSoon) {
    await notifyParticipants(contest.id, "CONTEST_ENDING_SOON", `「${contest.title}」がまもなく終了します。`);
    await prisma.contest.update({ where: { id: contest.id }, data: { contestEndingNotifiedAt: now } });
    notified += 1;
  }

  return { notified };
}
