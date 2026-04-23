-- Add driver account role
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'DRIVER';

-- Link driver profiles to auth users. Driver profiles remain for orders and
-- legacy driver tokens; user accounts are the source of truth for role/access.
ALTER TABLE "drivers" ADD COLUMN "user_id" TEXT;

-- CreateEnum
CREATE TYPE "Shift" AS ENUM ('MORNING', 'NOON', 'AFTERNOON', 'EVENING');

-- CreateTable
CREATE TABLE "schedule_assignments" (
    "id" TEXT NOT NULL,
    "factory_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "shift_date" DATE NOT NULL,
    "shift" "Shift" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "schedule_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "drivers_user_id_key" ON "drivers"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "schedule_assignments_user_id_shift_date_key" ON "schedule_assignments"("user_id", "shift_date");

-- CreateIndex
CREATE INDEX "schedule_assignments_factory_id_shift_date_idx" ON "schedule_assignments"("factory_id", "shift_date");

-- CreateIndex
CREATE INDEX "schedule_assignments_user_id_idx" ON "schedule_assignments"("user_id");

-- AddForeignKey
ALTER TABLE "drivers" ADD CONSTRAINT "drivers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schedule_assignments" ADD CONSTRAINT "schedule_assignments_factory_id_fkey" FOREIGN KEY ("factory_id") REFERENCES "factories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schedule_assignments" ADD CONSTRAINT "schedule_assignments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
