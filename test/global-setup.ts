import * as path from 'path';
import * as dotenv from 'dotenv';

import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';

dotenv.config({ path: '.env.test', quiet: true });

export default async function globalSetup(): Promise<void> {
  const testUrl = new URL(process.env.DATABASE_URL!);
  const dbName = testUrl.pathname.slice(1);

  // "postgres" is (by default) the admin database. Using its connection, the test database can be created
  const adminUrl = new URL(process.env.DATABASE_URL!);
  adminUrl.pathname = '/postgres';

  const adminPool = new Pool({ connectionString: adminUrl.toString() });
  await adminPool.query(`DROP DATABASE IF EXISTS ${dbName}`);
  await adminPool.query(`CREATE DATABASE ${dbName}`);
  await adminPool.end();

  const testPool = new Pool({ connectionString: testUrl.toString() });
  const db = drizzle(testPool);

  await migrate(db, {
    migrationsFolder: path.join(__dirname, '../drizzle'),
  });

  await testPool.end();
}
