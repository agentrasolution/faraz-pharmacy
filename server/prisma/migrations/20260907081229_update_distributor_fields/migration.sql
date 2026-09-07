/*
  Warnings:

  - You are about to drop the column `address` on the `distributors` table. All the data in the column will be lost.
  - You are about to drop the column `company_id` on the `distributors` table. All the data in the column will be lost.
  - You are about to drop the column `contact` on the `distributors` table. All the data in the column will be lost.
  - You are about to drop the column `phone` on the `distributors` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "arrears" DROP CONSTRAINT "arrears_sale_id_fkey";

-- DropForeignKey
ALTER TABLE "distributors" DROP CONSTRAINT "distributors_company_id_fkey";

-- AlterTable
ALTER TABLE "arrears" ALTER COLUMN "sale_id" DROP NOT NULL;

-- AlterTable
ALTER TABLE "customers" ADD COLUMN     "father_name" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "father_phone" TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "distributors" DROP COLUMN "address",
DROP COLUMN "company_id",
DROP COLUMN "contact",
DROP COLUMN "phone",
ADD COLUMN     "delivery_man_contact" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "delivery_man_name" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "proprietor_name" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "salesman_contact" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "salesman_name" TEXT NOT NULL DEFAULT '',
ALTER COLUMN "name" SET DEFAULT '';

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "pack_size" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "stock_purchases" ADD COLUMN     "active" INTEGER NOT NULL DEFAULT 1;

-- CreateTable
CREATE TABLE "barcodes" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "product_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "barcodes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "barcodes_code_key" ON "barcodes"("code");

-- CreateIndex
CREATE UNIQUE INDEX "barcodes_product_id_key" ON "barcodes"("product_id");

-- AddForeignKey
ALTER TABLE "barcodes" ADD CONSTRAINT "barcodes_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "arrears" ADD CONSTRAINT "arrears_sale_id_fkey" FOREIGN KEY ("sale_id") REFERENCES "sales"("id") ON DELETE SET NULL ON UPDATE CASCADE;
