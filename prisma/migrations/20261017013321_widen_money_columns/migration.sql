-- AlterTable
ALTER TABLE "customer_debt_ledger" ALTER COLUMN "amount" SET DATA TYPE DECIMAL(14,2);

-- AlterTable
ALTER TABLE "customer_price_overrides" ALTER COLUMN "price_per_unit" SET DATA TYPE DECIMAL(14,2);

-- AlterTable
ALTER TABLE "customer_shell_deposits" ALTER COLUMN "deposit_per_shell" SET DATA TYPE DECIMAL(14,2);

-- AlterTable
ALTER TABLE "global_prices" ALTER COLUMN "price_per_unit" SET DATA TYPE DECIMAL(14,2);

-- AlterTable
ALTER TABLE "order_items" ALTER COLUMN "unit_price" SET DATA TYPE DECIMAL(14,2),
ALTER COLUMN "line_total" SET DATA TYPE DECIMAL(14,2);

-- AlterTable
ALTER TABLE "orders" ALTER COLUMN "total" SET DATA TYPE DECIMAL(14,2);
