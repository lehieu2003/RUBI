-- Move existing broad shifts into the nearest 3-hour slot so old rows remain
-- visible in the new grid. This must run after the enum-add migration commits.
UPDATE "schedule_assignments" SET "shift" = 'SLOT_06_09' WHERE "shift" = 'MORNING';
UPDATE "schedule_assignments" SET "shift" = 'SLOT_09_12' WHERE "shift" = 'NOON';
UPDATE "schedule_assignments" SET "shift" = 'SLOT_12_15' WHERE "shift" = 'AFTERNOON';
UPDATE "schedule_assignments" SET "shift" = 'SLOT_18_21' WHERE "shift" = 'EVENING';
