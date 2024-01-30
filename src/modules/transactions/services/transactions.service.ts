import { Injectable } from '@nestjs/common';

import { ValidateBankAccountOwnershipService } from 'src/modules/bank-accounts/services/validate-bank-account-ownership.service';
import { ValidateCategoryOwnershipService } from 'src/modules/categories/services/validate-category-ownership.service';
import { TransactionsRepository } from 'src/shared/database/repositories/transactions.repositories';
import { v4 as uuid } from 'uuid';
import { CreateTransactionDto } from '../dto/create-transaction.dto';
import { UpdateTransactionDto } from '../dto/update-transaction.dto';
import { TransactionType } from '../entities/Transaction';
import { ValidateTransactionOwnershipService } from './validate-transaction-ownership.service';
import { ValidateTransactionInstallmentsOwnershipService } from './validate-transactionInstallments-ownership.service';

@Injectable()
export class TransactionsService {
  constructor(
    private readonly transactionRepo: TransactionsRepository,
    private readonly validateBankAccountOwnershipService: ValidateBankAccountOwnershipService,
    private readonly validateCategoryOwnershipService: ValidateCategoryOwnershipService,
    private readonly validateTransactionOwnershipService: ValidateTransactionOwnershipService,
    private readonly validateTransactionInstallmentsOwnershipService: ValidateTransactionInstallmentsOwnershipService,
  ) {}

  async create(userId: string, createTransactionDto: CreateTransactionDto) {
    const {
      bankAccountId,
      categoryId,
      date,
      name,
      type,
      value,
      installmentOption,
    } = createTransactionDto;
    await this.validateEntitiesOwnership({
      userId,
      bankAccountId,
      categoryId,
    });

    if (installmentOption > 1) {
      const currentDate = new Date(date);
      const dividedValue = value / installmentOption;
      const transactions = [];
      const installmentId = uuid();

      for (let i = 0; i < installmentOption; i++) {
        const installmentDate = new Date(currentDate);
        installmentDate.setMonth(currentDate.getMonth() + i);

        const transaction = await this.transactionRepo.create({
          data: {
            userId,
            bankAccountId,
            categoryId,
            date: installmentDate.toISOString(),
            name,
            type,
            value: dividedValue,
            installmentOption,
            installmentId,
          },
        });

        transactions.push(transaction);
      }

      return transactions;
    }

    return this.transactionRepo.create({
      data: {
        userId,
        bankAccountId,
        categoryId,
        date,
        name,
        type,
        value,
        installmentOption,
      },
    });
  }

  findAllByUserId(
    userId: string,
    filters: {
      month: number;
      year: number;
      bankAccountId?: string;
      type?: TransactionType;
    },
  ) {
    return this.transactionRepo.findMany({
      where: {
        userId,
        bankAccountId: filters.bankAccountId,
        type: filters.type,
        date: {
          gte: new Date(Date.UTC(filters.year, filters.month)),
          lt: new Date(Date.UTC(filters.year, filters.month + 1)),
        },
      },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            icon: true,
          },
        },
      },
    });
  }

  async update(
    userId: string,
    transactionId: string,
    updateTransactionDto: UpdateTransactionDto,
  ) {
    const { categoryId, bankAccountId, date, name, type, value } =
      updateTransactionDto;

    await this.validateEntitiesOwnership({
      userId,
      transactionId,
      categoryId,
      bankAccountId,
    });

    return this.transactionRepo.update({
      where: { id: transactionId },
      data: {
        bankAccountId,
        categoryId,
        date,
        name,
        type,
        value,
      },
    });
  }

  async updateAllInstallments(
    userId: string,
    installmentId: string,
    updateTransactionDto: UpdateTransactionDto,
  ) {
    const { categoryId, bankAccountId, name, type, value } =
      updateTransactionDto;

    await this.validateEntitiesOwnership({
      userId,
      installmentId,
      categoryId,
      bankAccountId,
    });

    return this.transactionRepo.updateMany({
      where: { installmentId },
      data: {
        bankAccountId,
        categoryId,
        name,
        type,
        value,
      },
    });
  }

  async remove(userId: string, transactionId: string) {
    await this.validateEntitiesOwnership({ userId, transactionId });

    await this.transactionRepo.delete({
      where: { id: transactionId },
    });

    return null;
  }

  async removeAllInstallments(userId: string, installmentId: string) {
    await this.validateEntitiesOwnership({ userId, installmentId });

    await this.transactionRepo.deleteMany({
      where: { installmentId },
    });

    return null;
  }

  private async validateEntitiesOwnership({
    userId,
    bankAccountId,
    categoryId,
    transactionId,
    installmentId,
  }: {
    userId: string;
    bankAccountId?: string;
    categoryId?: string;
    transactionId?: string;
    installmentId?: string;
  }) {
    await Promise.all([
      transactionId &&
        this.validateTransactionOwnershipService.validate(
          userId,
          transactionId,
        ),
      bankAccountId &&
        this.validateBankAccountOwnershipService.validate(
          userId,
          bankAccountId,
        ),
      categoryId &&
        this.validateCategoryOwnershipService.validate(userId, categoryId),
      installmentId &&
        this.validateTransactionInstallmentsOwnershipService.validate(
          userId,
          installmentId,
        ),
    ]);
  }
}
