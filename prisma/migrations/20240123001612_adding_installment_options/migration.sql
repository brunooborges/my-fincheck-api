-- AlterTable
ALTER TABLE "transactions" ADD COLUMN     "originalTransactionId" UUID;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_originalTransactionId_fkey" FOREIGN KEY ("originalTransactionId") REFERENCES "transactions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
