import { ConfigModule, ConfigService } from '@nestjs/config';
import { Global, Inject, Module, OnApplicationShutdown } from '@nestjs/common';

import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';

import * as schemas from './schema';
import { TDb } from '../types';
import { DB_CONNECTION, PG_POOL } from './injectionTokens';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: PG_POOL,
      inject: [ConfigService],
      useFactory: (config: ConfigService): Pool => {
        const pool = new Pool({
          connectionString: config.get<string>('DATABASE_URL'),
        });

        return pool;
      },
    },
    {
      provide: DB_CONNECTION,
      inject: [PG_POOL],
      useFactory: (pool: Pool): TDb => {
        return drizzle(pool, { schema: schemas });
      },
    },
  ],
  exports: [DB_CONNECTION],
})
export class DatabaseModule implements OnApplicationShutdown {
  constructor(@Inject(PG_POOL) private pgPool: Pool | null = null) {}

  async onApplicationShutdown() {
    if (this.pgPool) {
      await this.pgPool.end();
      this.pgPool = null;

      console.log('PG Pool closed');
    }
  }
}
