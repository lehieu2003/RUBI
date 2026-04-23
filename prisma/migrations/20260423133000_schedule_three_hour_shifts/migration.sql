-- Add 3-hour schedule slots.
ALTER TYPE "Shift" ADD VALUE IF NOT EXISTS 'SLOT_00_03';
ALTER TYPE "Shift" ADD VALUE IF NOT EXISTS 'SLOT_03_06';
ALTER TYPE "Shift" ADD VALUE IF NOT EXISTS 'SLOT_06_09';
ALTER TYPE "Shift" ADD VALUE IF NOT EXISTS 'SLOT_09_12';
ALTER TYPE "Shift" ADD VALUE IF NOT EXISTS 'SLOT_12_15';
ALTER TYPE "Shift" ADD VALUE IF NOT EXISTS 'SLOT_15_18';
ALTER TYPE "Shift" ADD VALUE IF NOT EXISTS 'SLOT_18_21';
ALTER TYPE "Shift" ADD VALUE IF NOT EXISTS 'SLOT_21_24';

-- Allow one person to hold multiple 3-hour shifts on the same date, but not
-- duplicate the same slot.
DROP INDEX IF EXISTS "schedule_assignments_user_id_shift_date_key";
CREATE UNIQUE INDEX "schedule_assignments_user_id_shift_date_shift_key"
  ON "schedule_assignments"("user_id", "shift_date", "shift");
