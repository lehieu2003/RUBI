-- Backfill: a settled (COMPLETED) order is worth what was delivered,
-- actual_qty * unit_price, the amount its DEBT entry booked. Orders settled
-- before this change still carry the ordered amount in total / line_total.
--
-- Only COMPLETED orders whose every line has actual_qty are touched. A
-- COMPLETED order with a line lacking actual_qty has no delivered quantity to
-- derive from and is left as it is. Rows already right are skipped, so running
-- this twice changes nothing.

-- Lines of settled orders
UPDATE "order_items" AS oi
SET "line_total" = oi."actual_qty" * oi."unit_price"
FROM "orders" AS o
WHERE o."id" = oi."order_id"
  AND o."status" = 'COMPLETED'
  AND NOT EXISTS (
    SELECT 1 FROM "order_items" AS missing
    WHERE missing."order_id" = o."id" AND missing."actual_qty" IS NULL
  )
  AND oi."line_total" <> oi."actual_qty" * oi."unit_price";

-- Totals of settled orders
UPDATE "orders" AS o
SET "total" = delivered."amount"
FROM (
  SELECT "order_id", SUM("actual_qty" * "unit_price") AS "amount"
  FROM "order_items"
  GROUP BY "order_id"
  HAVING bool_and("actual_qty" IS NOT NULL)
) AS delivered
WHERE delivered."order_id" = o."id"
  AND o."status" = 'COMPLETED'
  AND o."total" <> delivered."amount";
