-- Accountants become regular staff before the role is removed
UPDATE "users" SET "role" = 'STAFF' WHERE "role" = 'ACCOUNTANT';

-- AlterEnum
BEGIN;
CREATE TYPE "UserRole_new" AS ENUM ('ADMIN', 'STAFF', 'DRIVER');
ALTER TABLE "public"."users" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "users" ALTER COLUMN "role" TYPE "UserRole_new" USING ("role"::text::"UserRole_new");
ALTER TYPE "UserRole" RENAME TO "UserRole_old";
ALTER TYPE "UserRole_new" RENAME TO "UserRole";
DROP TYPE "public"."UserRole_old";
ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'STAFF';
COMMIT;

