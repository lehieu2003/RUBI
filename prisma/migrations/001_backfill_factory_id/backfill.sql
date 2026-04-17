-- Phase 0: Create factories table if not exists
CREATE TABLE IF NOT EXISTS "factories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "address" TEXT,
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "factories_pkey" PRIMARY KEY ("id")
);

-- Create factories table indexes if not exists
CREATE INDEX IF NOT EXISTS "factories_pkey" ON "factories"("id");

-- Phase 1: Add factory_id as nullable with default
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "factory_id" TEXT DEFAULT 'sys-default-factory';
ALTER TABLE "drivers" ADD COLUMN IF NOT EXISTS "factory_id" TEXT DEFAULT 'sys-default-factory';
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "factory_id" TEXT DEFAULT 'sys-default-factory';
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "factory_id" TEXT DEFAULT 'sys-default-factory';

-- Phase 2: Create System factory if not exists (idempotent)
INSERT INTO "factories" (id, name, "is_system", "created_at", "updated_at")
SELECT 'sys-default-factory', 'System Factory', true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM "factories" WHERE "is_system" = true);

-- Phase 3: Backfill all existing records with System factory ID
UPDATE "customers" SET "factory_id" = 'sys-default-factory' WHERE "factory_id" IS NULL OR "factory_id" = '';
UPDATE "drivers" SET "factory_id" = 'sys-default-factory' WHERE "factory_id" IS NULL OR "factory_id" = '';
UPDATE "orders" SET "factory_id" = 'sys-default-factory' WHERE "factory_id" IS NULL OR "factory_id" = '';
UPDATE "products" SET "factory_id" = 'sys-default-factory' WHERE "factory_id" IS NULL OR "factory_id" = '';

-- Phase 4: Make factory_id NOT NULL
ALTER TABLE "customers" ALTER COLUMN "factory_id" SET NOT NULL;
ALTER TABLE "drivers" ALTER COLUMN "factory_id" SET NOT NULL;
ALTER TABLE "orders" ALTER COLUMN "factory_id" SET NOT NULL;
ALTER TABLE "products" ALTER COLUMN "factory_id" SET NOT NULL;

-- Phase 5: Add DEFAULT for future inserts
ALTER TABLE "customers" ALTER COLUMN "factory_id" SET DEFAULT 'sys-default-factory';
ALTER TABLE "drivers" ALTER COLUMN "factory_id" SET DEFAULT 'sys-default-factory';
ALTER TABLE "orders" ALTER COLUMN "factory_id" SET DEFAULT 'sys-default-factory';
ALTER TABLE "products" ALTER COLUMN "factory_id" SET DEFAULT 'sys-default-factory';