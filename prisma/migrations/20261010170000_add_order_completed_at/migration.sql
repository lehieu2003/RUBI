-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "completed_at" TIMESTAMP(3);

-- Orders settled before this column existed: a COMPLETED order is final, so
-- its last update is the moment it was settled.
UPDATE "orders" SET "completed_at" = "updated_at" WHERE "status" = 'COMPLETED';
