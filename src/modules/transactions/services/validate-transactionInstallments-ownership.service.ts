import { Injectable, NotFoundException } from '@nestjs/common';
import { TransactionsRepository } from 'src/shared/database/repositories/transactions.repositories';

@Injectable()
export class ValidateTransactionInstallmentsOwnershipService {
  constructor(private readonly transactionRepo: TransactionsRepository) {}

  async validate(userId: string, installmentId: string) {
    const isOwner = await this.transactionRepo.findMany({
      where: { installmentId, userId },
    });

    if (!isOwner) {
      throw new NotFoundException('Transaction not found');
    }
  }
}
