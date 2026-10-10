-- DropIndex
DROP INDEX "drivers_slug_key";

-- DropIndex
DROP INDEX "drivers_token_key";

-- AlterTable
ALTER TABLE "drivers" DROP COLUMN "slug",
DROP COLUMN "token";

