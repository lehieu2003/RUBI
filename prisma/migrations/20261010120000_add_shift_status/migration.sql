-- CreateEnum
CREATE TYPE "ShiftStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "schedule_assignments" ADD COLUMN     "reviewed_at" TIMESTAMP(3),
ADD COLUMN     "status" "ShiftStatus" NOT NULL DEFAULT 'APPROVED';

