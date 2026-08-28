/*
  Warnings:

  - Added the required column `entryOpensAt` to the `Contest` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Contest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "entryOpensAt" DATETIME NOT NULL,
    "startAt" DATETIME NOT NULL,
    "endAt" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'UPCOMING',
    "createdById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "prizeNote" TEXT,
    "reviewHours" INTEGER NOT NULL DEFAULT 24,
    "autoRenew" BOOLEAN NOT NULL DEFAULT true,
    "roundNumber" INTEGER NOT NULL DEFAULT 1,
    "previousContestId" TEXT,
    CONSTRAINT "Contest_previousContestId_fkey" FOREIGN KEY ("previousContestId") REFERENCES "Contest" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Contest_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Contest" ("createdAt", "createdById", "description", "endAt", "id", "prizeNote", "reviewHours", "startAt", "status", "title") SELECT "createdAt", "createdById", "description", "endAt", "id", "prizeNote", "reviewHours", "startAt", "status", "title" FROM "Contest";
DROP TABLE "Contest";
ALTER TABLE "new_Contest" RENAME TO "Contest";
CREATE UNIQUE INDEX "Contest_previousContestId_key" ON "Contest"("previousContestId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
