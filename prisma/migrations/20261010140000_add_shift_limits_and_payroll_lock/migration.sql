-- AlterTable
ALTER TABLE "factories" ADD COLUMN     "max_drivers_per_shift" INTEGER,
ADD COLUMN     "max_staff_per_shift" INTEGER;

-- CreateTable
CREATE TABLE "payroll_locks" (
    "id" TEXT NOT NULL,
    "factory_id" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "locked_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payroll_locks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "payroll_locks_factory_id_month_key" ON "payroll_locks"("factory_id", "month");

-- AddForeignKey
ALTER TABLE "payroll_locks" ADD CONSTRAINT "payroll_locks_factory_id_fkey" FOREIGN KEY ("factory_id") REFERENCES "factories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

