import { Module } from '@nestjs/common';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { DatabaseModule } from './shared/database/database.module';

import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard } from '@nestjs/throttler';
import { AuthGuard } from './modules/auth/auth.guard';
import { BankAccountsModule } from './modules/bank-accounts/bank-accounts.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { HealthController } from './modules/health/health.controller';
import { TransactionsModule } from './modules/transactions/transactions.module';
import { ThrottlingModule } from './shared/throttling/throttling.module';

@Module({
  imports: [
    ThrottlingModule.forRoot(),
    UsersModule,
    DatabaseModule,
    AuthModule,
    CategoriesModule,
    BankAccountsModule,
    TransactionsModule,
  ],
  controllers: [HealthController],
  providers: [
    // Rate limiting runs first, so a flood is turned away before any token is checked.
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
  ],
})
export class AppModule {}
