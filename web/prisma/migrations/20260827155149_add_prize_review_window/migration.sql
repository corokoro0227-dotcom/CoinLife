-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Contest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "startAt" DATETIME NOT NULL,
    "endAt" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'UPCOMING',
    "createdById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "prizeNote" TEXT,
    "reviewHours" INTEGER NOT NULL DEFAULT 24,
    CONSTRAINT "Contest_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Contest" ("createdAt", "createdById", "description", "endAt", "id", "prizeNote", "startAt", "status", "title") SELECT "createdAt", "createdById", "description", "endAt", "id", "prizeNote", "startAt", "status", "title" FROM "Contest";
DROP TABLE "Contest";
ALTER TABLE "new_Contest" RENAME TO "Contest";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
