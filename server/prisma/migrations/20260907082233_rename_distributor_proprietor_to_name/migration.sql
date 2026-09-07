/*
  Warnings:

  - You are about to drop the column `proprietor_name` on the `distributors` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "distributors" DROP COLUMN "proprietor_name",
ADD COLUMN     "name" TEXT NOT NULL DEFAULT '';
