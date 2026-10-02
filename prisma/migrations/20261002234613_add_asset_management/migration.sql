-- CreateEnum
CREATE TYPE "AssetType" AS ENUM ('MACHINE', 'VEHICLE');

-- CreateEnum
CREATE TYPE "AssetStatus" AS ENUM ('ACTIVE', 'MAINTENANCE', 'BROKEN', 'INACTIVE');

-- CreateEnum
CREATE TYPE "MaintenanceType" AS ENUM ('ROUTINE', 'INSPECTION', 'INSURANCE', 'REPAIR');

-- CreateTable
CREATE TABLE "assets" (
    "id" TEXT NOT NULL,
    "factory_id" TEXT NOT NULL,
    "type" "AssetType" NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "license_plate" TEXT,
    "capacity_tons" DOUBLE PRECISION,
    "status" "AssetStatus" NOT NULL DEFAULT 'ACTIVE',
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "maintenance_records" (
    "id" TEXT NOT NULL,
    "factory_id" TEXT NOT NULL,
    "asset_id" TEXT NOT NULL,
    "type" "MaintenanceType" NOT NULL,
    "performed_at" TIMESTAMP(3) NOT NULL,
    "due_at" TIMESTAMP(3),
    "cost" DOUBLE PRECISION,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "maintenance_records_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "assets_factory_id_idx" ON "assets"("factory_id");

-- CreateIndex
CREATE UNIQUE INDEX "assets_factory_id_code_key" ON "assets"("factory_id", "code");

-- CreateIndex
CREATE INDEX "maintenance_records_factory_id_due_at_idx" ON "maintenance_records"("factory_id", "due_at");

-- CreateIndex
CREATE INDEX "maintenance_records_asset_id_idx" ON "maintenance_records"("asset_id");

-- AddForeignKey
ALTER TABLE "assets" ADD CONSTRAINT "assets_factory_id_fkey" FOREIGN KEY ("factory_id") REFERENCES "factories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_records" ADD CONSTRAINT "maintenance_records_factory_id_fkey" FOREIGN KEY ("factory_id") REFERENCES "factories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_records" ADD CONSTRAINT "maintenance_records_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

