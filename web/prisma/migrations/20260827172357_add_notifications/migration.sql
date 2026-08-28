-- AlterTable
ALTER TABLE "Contest" ADD COLUMN "contestEndingNotifiedAt" DATETIME;
ALTER TABLE "Contest" ADD COLUMN "contestStartedNotifiedAt" DATETIME;
ALTER TABLE "Contest" ADD COLUMN "entryClosingNotifiedAt" DATETIME;
ALTER TABLE "Contest" ADD COLUMN "entryOpenedNotifiedAt" DATETIME;

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "contestId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "readAt" DATETIME,
    CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Notification_contestId_fkey" FOREIGN KEY ("contestId") REFERENCES "Contest" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Notification_userId_readAt_idx" ON "Notification"("userId", "readAt");
