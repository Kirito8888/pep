-- CreateEnum
CREATE TYPE "Sex" AS ENUM ('M', 'F');

-- CreateEnum
CREATE TYPE "FriendStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED');

-- CreateEnum
CREATE TYPE "Phase" AS ENUM ('GPP', 'SPP', 'PRE_COMP', 'COMP', 'TAPER');

-- CreateEnum
CREATE TYPE "BlockType" AS ENUM ('MOBILITY', 'TECHNIQUE', 'JUMPS_THROWS', 'STRENGTH', 'METABOLIC');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "sex" "Sex" NOT NULL DEFAULT 'M',
    "specialty" TEXT NOT NULL DEFAULT 'COMBINED',
    "inviteCode" TEXT NOT NULL,
    "restingHr" INTEGER,
    "maxHr" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Friendship" (
    "id" TEXT NOT NULL,
    "requesterId" TEXT NOT NULL,
    "addresseeId" TEXT NOT NULL,
    "status" "FriendStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Friendship_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Plan" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "assigneeId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "specialty" TEXT NOT NULL,
    "level" TEXT NOT NULL DEFAULT 'INTERMEDIATE',
    "startDate" TIMESTAMP(3) NOT NULL,
    "clonedFromId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Plan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Mesocycle" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phase" "Phase" NOT NULL,
    "order" INTEGER NOT NULL,

    CONSTRAINT "Mesocycle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Microcycle" (
    "id" TEXT NOT NULL,
    "mesocycleId" TEXT NOT NULL,
    "weekNumber" INTEGER NOT NULL,
    "focus" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "Microcycle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrainingSession" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "microcycleId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "title" TEXT NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "feeling" INTEGER,
    "sessionRpe" INTEGER,
    "athleteNotes" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "TrainingSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SessionBlock" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "type" "BlockType" NOT NULL,
    "order" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "notes" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "SessionBlock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BlockExercise" (
    "id" TEXT NOT NULL,
    "blockId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "sets" INTEGER NOT NULL DEFAULT 1,
    "reps" INTEGER NOT NULL DEFAULT 1,
    "intensityType" TEXT NOT NULL DEFAULT 'NONE',
    "intensityValue" DOUBLE PRECISION,
    "restSec" INTEGER,
    "notes" TEXT NOT NULL DEFAULT '',
    "implement" TEXT,
    "muscleGroup" TEXT,
    "loadKg" DOUBLE PRECISION,
    "sprintMeters" INTEGER NOT NULL DEFAULT 0,
    "hurdles" INTEGER NOT NULL DEFAULT 0,
    "plyoContacts" INTEGER NOT NULL DEFAULT 0,
    "throwsCount" INTEGER NOT NULL DEFAULT 0,
    "distanceM" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "BlockExercise_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SessionComment" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SessionComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LiftLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "exercise" TEXT NOT NULL,
    "muscleGroup" TEXT NOT NULL,
    "sets" INTEGER NOT NULL,
    "reps" INTEGER NOT NULL,
    "weightKg" DOUBLE PRECISION NOT NULL,
    "rpe" DOUBLE PRECISION,

    CONSTRAINT "LiftLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PersonalRecord" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "exercise" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL DEFAULT 'kg',
    "reps" INTEGER NOT NULL DEFAULT 1,
    "date" TIMESTAMP(3) NOT NULL,
    "notes" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "PersonalRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Implement" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "weightG" INTEGER NOT NULL,
    "officialWeightG" INTEGER NOT NULL,

    CONSTRAINT "Implement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ThrowLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "event" TEXT NOT NULL,
    "implementName" TEXT NOT NULL,
    "weightG" INTEGER NOT NULL,
    "officialWeightG" INTEGER NOT NULL,
    "count" INTEGER NOT NULL,
    "intensityPct" INTEGER NOT NULL,
    "bestDistance" DOUBLE PRECISION,
    "throwType" TEXT,
    "approachMeters" DOUBLE PRECISION,
    "approachSteps" INTEGER,
    "crossSteps" INTEGER,
    "checkMark" DOUBLE PRECISION,
    "anglePerceived" TEXT,
    "windType" TEXT,
    "windSpeed" DOUBLE PRECISION,
    "notes" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "ThrowLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrehabLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "items" TEXT[],
    "notes" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "PrehabLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MedBallLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "type" TEXT NOT NULL,
    "weightKg" DOUBLE PRECISION NOT NULL,
    "throws" INTEGER NOT NULL,
    "bestDistance" DOUBLE PRECISION,
    "notes" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "MedBallLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApproachRun" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "event" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "distanceM" DOUBLE PRECISION NOT NULL,
    "strides" INTEGER NOT NULL,
    "midMarkM" DOUBLE PRECISION,
    "midMarkStride" INTEGER,
    "wind" DOUBLE PRECISION,
    "adjustmentCm" DOUBLE PRECISION,
    "notes" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "ApproachRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlyoLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "type" TEXT NOT NULL,
    "contacts" INTEGER NOT NULL,
    "intensity" TEXT NOT NULL DEFAULT 'MEDIUM',
    "notes" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "PlyoLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PoleConfig" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "lengthM" DOUBLE PRECISION NOT NULL,
    "flexLbs" INTEGER NOT NULL,
    "gripHeightM" DOUBLE PRECISION NOT NULL,
    "standardsCm" INTEGER NOT NULL,
    "approachStrides" INTEGER,
    "notes" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "PoleConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Mark" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "wind" DOUBLE PRECISION,
    "indoor" BOOLEAN NOT NULL DEFAULT false,
    "date" TIMESTAMP(3) NOT NULL,
    "competition" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "Mark_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CombinedResult" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "competition" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "performances" JSONB NOT NULL,
    "totalPoints" INTEGER NOT NULL,

    CONSTRAINT "CombinedResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EnduranceLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "type" TEXT NOT NULL,
    "distanceKm" DOUBLE PRECISION NOT NULL,
    "durationMin" DOUBLE PRECISION NOT NULL,
    "rpe" INTEGER NOT NULL,
    "notes" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "EnduranceLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_inviteCode_key" ON "User"("inviteCode");

-- CreateIndex
CREATE INDEX "Friendship_addresseeId_idx" ON "Friendship"("addresseeId");

-- CreateIndex
CREATE UNIQUE INDEX "Friendship_requesterId_addresseeId_key" ON "Friendship"("requesterId", "addresseeId");

-- CreateIndex
CREATE INDEX "Plan_ownerId_idx" ON "Plan"("ownerId");

-- CreateIndex
CREATE INDEX "Plan_assigneeId_idx" ON "Plan"("assigneeId");

-- CreateIndex
CREATE INDEX "Mesocycle_planId_idx" ON "Mesocycle"("planId");

-- CreateIndex
CREATE INDEX "Microcycle_mesocycleId_idx" ON "Microcycle"("mesocycleId");

-- CreateIndex
CREATE INDEX "TrainingSession_planId_date_idx" ON "TrainingSession"("planId", "date");

-- CreateIndex
CREATE INDEX "TrainingSession_microcycleId_idx" ON "TrainingSession"("microcycleId");

-- CreateIndex
CREATE INDEX "SessionBlock_sessionId_idx" ON "SessionBlock"("sessionId");

-- CreateIndex
CREATE INDEX "BlockExercise_blockId_idx" ON "BlockExercise"("blockId");

-- CreateIndex
CREATE INDEX "SessionComment_sessionId_idx" ON "SessionComment"("sessionId");

-- CreateIndex
CREATE INDEX "LiftLog_userId_date_idx" ON "LiftLog"("userId", "date");

-- CreateIndex
CREATE INDEX "PersonalRecord_userId_exercise_idx" ON "PersonalRecord"("userId", "exercise");

-- CreateIndex
CREATE INDEX "Implement_userId_idx" ON "Implement"("userId");

-- CreateIndex
CREATE INDEX "ThrowLog_userId_date_idx" ON "ThrowLog"("userId", "date");

-- CreateIndex
CREATE INDEX "PrehabLog_userId_date_idx" ON "PrehabLog"("userId", "date");

-- CreateIndex
CREATE INDEX "MedBallLog_userId_date_idx" ON "MedBallLog"("userId", "date");

-- CreateIndex
CREATE INDEX "ApproachRun_userId_idx" ON "ApproachRun"("userId");

-- CreateIndex
CREATE INDEX "PlyoLog_userId_date_idx" ON "PlyoLog"("userId", "date");

-- CreateIndex
CREATE INDEX "PoleConfig_userId_idx" ON "PoleConfig"("userId");

-- CreateIndex
CREATE INDEX "Mark_userId_event_idx" ON "Mark"("userId", "event");

-- CreateIndex
CREATE INDEX "CombinedResult_userId_date_idx" ON "CombinedResult"("userId", "date");

-- CreateIndex
CREATE INDEX "EnduranceLog_userId_date_idx" ON "EnduranceLog"("userId", "date");

-- AddForeignKey
ALTER TABLE "Friendship" ADD CONSTRAINT "Friendship_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Friendship" ADD CONSTRAINT "Friendship_addresseeId_fkey" FOREIGN KEY ("addresseeId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Plan" ADD CONSTRAINT "Plan_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Plan" ADD CONSTRAINT "Plan_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mesocycle" ADD CONSTRAINT "Mesocycle_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Microcycle" ADD CONSTRAINT "Microcycle_mesocycleId_fkey" FOREIGN KEY ("mesocycleId") REFERENCES "Mesocycle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingSession" ADD CONSTRAINT "TrainingSession_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingSession" ADD CONSTRAINT "TrainingSession_microcycleId_fkey" FOREIGN KEY ("microcycleId") REFERENCES "Microcycle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionBlock" ADD CONSTRAINT "SessionBlock_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "TrainingSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlockExercise" ADD CONSTRAINT "BlockExercise_blockId_fkey" FOREIGN KEY ("blockId") REFERENCES "SessionBlock"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionComment" ADD CONSTRAINT "SessionComment_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "TrainingSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionComment" ADD CONSTRAINT "SessionComment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LiftLog" ADD CONSTRAINT "LiftLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PersonalRecord" ADD CONSTRAINT "PersonalRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Implement" ADD CONSTRAINT "Implement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ThrowLog" ADD CONSTRAINT "ThrowLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrehabLog" ADD CONSTRAINT "PrehabLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedBallLog" ADD CONSTRAINT "MedBallLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApproachRun" ADD CONSTRAINT "ApproachRun_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlyoLog" ADD CONSTRAINT "PlyoLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PoleConfig" ADD CONSTRAINT "PoleConfig_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mark" ADD CONSTRAINT "Mark_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CombinedResult" ADD CONSTRAINT "CombinedResult_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnduranceLog" ADD CONSTRAINT "EnduranceLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
