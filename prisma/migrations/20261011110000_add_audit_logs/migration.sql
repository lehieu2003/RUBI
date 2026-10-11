-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('ORDER_CREATED', 'ORDER_ASSIGNED', 'ORDER_STATUS_CHANGED', 'ORDER_CANCELLED', 'ORDER_DELIVERED', 'ORDER_SETTLED', 'DEBT_PAYMENT');

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "factory_id" TEXT NOT NULL,
    "action" "AuditAction" NOT NULL,
    "user_id" TEXT,
    "user_name" TEXT NOT NULL,
    "order_id" TEXT,
    "customer_id" TEXT,
    "summary" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "audit_logs_factory_id_created_at_idx" ON "audit_logs"("factory_id", "created_at");

-- CreateIndex
CREATE INDEX "audit_logs_order_id_idx" ON "audit_logs"("order_id");

-- CreateIndex
CREATE INDEX "audit_logs_customer_id_idx" ON "audit_logs"("customer_id");

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_factory_id_fkey" FOREIGN KEY ("factory_id") REFERENCES "factories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
