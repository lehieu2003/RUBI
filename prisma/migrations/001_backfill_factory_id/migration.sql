-- Phase 1: Create System factory if not exists (idempotent)
INSERT INTO "factories" (id, name, "is_system", "created_at", "updated_at")
SELECT 'sys-default-factory', 'System Factory', true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM "factories" WHERE "is_system" = true);

-- Phase 2: Backfill all existing records with System factory ID
-- Only update records where factory_id is currently NULL (idempotent)
UPDATE "customers" SET "factory_id" = 'sys-default-factory' WHERE "factory_id" IS NULL;
UPDATE "drivers" SET "factory_id" = 'sys-default-factory' WHERE "factory_id" IS NULL;
UPDATE "orders" SET "factory_id" = 'sys-default-factory' WHERE "factory_id" IS NULL;
UPDATE "products" SET "factory_id" = 'sys-default-factory' WHERE "factory_id" IS NULL;