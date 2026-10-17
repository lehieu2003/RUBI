/*
  Warnings:

  - A unique constraint covering the columns `[factory_id,name,sizeKg]` on the table `products` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "products_factory_id_name_sizeKg_key" ON "products"("factory_id", "name", "sizeKg");
