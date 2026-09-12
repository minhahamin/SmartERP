-- CreateEnum
CREATE TYPE "AiActionStatus" AS ENUM ('PENDING', 'CONFIRMED', 'REJECTED', 'EXPIRED');

-- AlterTable
ALTER TABLE "chat_messages" ADD COLUMN     "actionDraftId" TEXT;

-- CreateTable
CREATE TABLE "ai_action_drafts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "actionType" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "AiActionStatus" NOT NULL DEFAULT 'PENDING',
    "resultingRecordId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmedAt" TIMESTAMP(3),

    CONSTRAINT "ai_action_drafts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ai_action_drafts_userId_idx" ON "ai_action_drafts"("userId");

-- CreateIndex
CREATE INDEX "ai_action_drafts_sessionId_idx" ON "ai_action_drafts"("sessionId");

-- AddForeignKey
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_actionDraftId_fkey" FOREIGN KEY ("actionDraftId") REFERENCES "ai_action_drafts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_action_drafts" ADD CONSTRAINT "ai_action_drafts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_action_drafts" ADD CONSTRAINT "ai_action_drafts_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "chat_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
