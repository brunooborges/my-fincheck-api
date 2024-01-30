/*
  Warnings:

  - You are about to drop the column `original_transaction_id` on the `transactions` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "transactions" DROP CONSTRAINT "transactions_original_transaction_id_fkey";

-- AlterTable
ALTER TABLE "transactions" DROP COLUMN "original_transaction_id",
ADD COLUMN     "installment_id" UUID;
