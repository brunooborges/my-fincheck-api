/*
  Warnings:

  - You are about to drop the column `originalTransactionId` on the `transactions` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "transactions" DROP CONSTRAINT "transactions_originalTransactionId_fkey";

-- AlterTable
ALTER TABLE "transactions" DROP COLUMN "originalTransactionId",
ADD COLUMN     "original_transaction_id" UUID;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_original_transaction_id_fkey" FOREIGN KEY ("original_transaction_id") REFERENCES "transactions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
