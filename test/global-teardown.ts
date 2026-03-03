import { Pool } from 'pg';

export default async function globalTeardown(): Promise<void> {
  const testUrl = new URL(process.env.DATABASE_URL!);
  const dbName = testUrl.pathname.slice(1);

  const adminUrl = new URL(process.env.DATABASE_URL!);
  adminUrl.pathname = '/postgres';

  const adminPool = new Pool({ connectionString: adminUrl.toString() });
  await adminPool.query(`DROP DATABASE IF EXISTS ${dbName}`);
  await adminPool.end();
}
