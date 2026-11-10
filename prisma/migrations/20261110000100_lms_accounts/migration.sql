CREATE TABLE "LmsAccount" (
  "phone" TEXT PRIMARY KEY, "nim" TEXT NOT NULL UNIQUE, "alias" TEXT NOT NULL,
  "consentAt" TIMESTAMP(3), "aiConsent" BOOLEAN NOT NULL DEFAULT false, "encrypted" TEXT,
  "revision" INTEGER NOT NULL DEFAULT 0, "paused" BOOLEAN NOT NULL DEFAULT false,
  "notify" BOOLEAN NOT NULL DEFAULT false, "nextSyncAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "failures" INTEGER NOT NULL DEFAULT 0, "loginAttempts" INTEGER NOT NULL DEFAULT 0,
  "loginAfter" TIMESTAMP(3)
);
CREATE INDEX "LmsAccount_paused_nextSyncAt_idx" ON "LmsAccount"("paused","nextSyncAt");
