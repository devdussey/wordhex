-- Add email and passwordHash columns to User table
ALTER TABLE "User" ADD COLUMN "email" TEXT;
ALTER TABLE "User" ADD COLUMN "passwordHash" TEXT;

-- Create unique constraint for email
ALTER TABLE "User" ADD CONSTRAINT "User_email_key" UNIQUE ("email");

-- Create indexes for performance
CREATE INDEX "User_discordId_idx" ON "User"("discordId");
CREATE INDEX "User_email_idx" ON "User"("email");
CREATE INDEX "User_createdAt_idx" ON "User"("createdAt");
CREATE INDEX "LobbyPlayer_userId_idx" ON "LobbyPlayer"("userId");
CREATE INDEX "MatchPlayer_userId_idx" ON "MatchPlayer"("userId");
