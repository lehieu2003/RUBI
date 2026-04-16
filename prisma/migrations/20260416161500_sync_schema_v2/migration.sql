-- Migration: add_user_roles_driver_token_order_fields
-- Created: 2026-04-16

-- Add role to users table
ALTER TABLE "users" ADD COLUMN "role" TEXT NOT NULL DEFAULT 'STAFF';

-- Add phone to drivers table
ALTER TABLE "drivers" ADD COLUMN "phone" TEXT;

-- Add assigner_id, delivery_lat, delivery_lng, delivered_at to orders
ALTER TABLE "orders" ADD COLUMN "assigner_id" TEXT;
ALTER TABLE "orders" ADD COLUMN "delivery_lat" DOUBLE PRECISION;
ALTER TABLE "orders" ADD COLUMN "delivery_lng" DOUBLE PRECISION;
ALTER TABLE "orders" ADD COLUMN "delivered_at" TIMESTAMP(3);

-- Drop deliveryGps column (replaced by delivery_lat/delivery_lng)
ALTER TABLE "orders" DROP COLUMN IF EXISTS "deliveryGps";

-- Add unique constraint on drivers.slug (if not exists)
CREATE UNIQUE INDEX IF NOT EXISTS "drivers_slug_key" ON "drivers"("slug");

-- Add unique constraint on drivers.token (if not exists)
CREATE UNIQUE INDEX IF NOT EXISTS "drivers_token_key" ON "drivers"("token");

-- Add index on orders.assigner_id
CREATE INDEX IF NOT EXISTS "orders_assigner_id_idx" ON "orders"("assigner_id");