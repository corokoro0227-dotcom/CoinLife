-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Column" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "sourceName" TEXT NOT NULL,
    "sourceUrl" TEXT NOT NULL,
    "quote" TEXT NOT NULL,
    "commentary" TEXT,
    "isAutomated" BOOLEAN NOT NULL DEFAULT false,
    "category" TEXT NOT NULL DEFAULT 'CRYPTO_NEWS',
    "authorId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Column_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Column" ("authorId", "commentary", "createdAt", "id", "isAutomated", "language", "quote", "sourceName", "sourceUrl", "title") SELECT "authorId", "commentary", "createdAt", "id", "isAutomated", "language", "quote", "sourceName", "sourceUrl", "title" FROM "Column";
DROP TABLE "Column";
ALTER TABLE "new_Column" RENAME TO "Column";
CREATE INDEX "Column_createdAt_idx" ON "Column"("createdAt");
CREATE INDEX "Column_category_createdAt_idx" ON "Column"("category", "createdAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
