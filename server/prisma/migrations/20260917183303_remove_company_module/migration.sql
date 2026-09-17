/*
  Warnings:

  - You are about to drop the column `company_id` on the `stock_purchases` table. All the data in the column will be lost.
  - You are about to drop the `companies` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "stock_purchases" DROP CONSTRAINT "stock_purchases_company_id_fkey";

-- AlterTable
ALTER TABLE "stock_purchases" DROP COLUMN "company_id",
ADD COLUMN     "company" TEXT;

-- DropTable
DROP TABLE "companies";
