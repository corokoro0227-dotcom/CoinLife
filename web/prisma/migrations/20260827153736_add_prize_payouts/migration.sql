-- AlterTable
ALTER TABLE "Contest" ADD COLUMN "prizeNote" TEXT;

-- CreateTable
CREATE TABLE "PrizePayout" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "contestId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "rank" INTEGER,
    "amountSol" REAL NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PLANNED',
    "txSignature" TEXT,
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" DATETIME,
    CONSTRAINT "PrizePayout_contestId_fkey" FOREIGN KEY ("contestId") REFERENCES "Contest" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PrizePayout_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "PrizePayout_contestId_idx" ON "PrizePayout"("contestId");
