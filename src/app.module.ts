import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AppService } from './app.service';
import { AppController } from './app.controller';
import { validateConfig } from './config/validateEnv';
import { DatabaseModule } from './database/database.module';
import { AccountsModule } from './resources/accounts/accounts.module';
import { TransactionsModule } from './resources/transactions/transactions.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      validate: validateConfig,
    }),
    DatabaseModule,
    AccountsModule,
    TransactionsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
