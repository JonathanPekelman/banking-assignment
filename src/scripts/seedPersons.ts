import 'dotenv/config';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { seed } from 'drizzle-seed';
import * as schema from '../database/schema';

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool, { schema });

  await seed(db, { persons: schema.persons }, { count: 3 });

  console.log('Seeded 3 persons successfully.');
  await pool.end();
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
