import { neon } from '@neondatabase/serverless';
import pg from 'pg';
import dotenv from 'dotenv';

// Load local .env if available
dotenv.config();

// Strictly retrieve connection string from environment variables - NEVER hardcoded!
const dbUrl = process.env.DATABASE_URL || process.env.DIRECT_DATABASE_URL;

if (!dbUrl) {
  console.warn('[DB WARNING] DATABASE_URL environment variable is missing in environment (.env).');
}

let neonSql = null;
try {
  if (dbUrl) {
    neonSql = neon(dbUrl);
  }
} catch (e) {
  console.warn('[DB] neon driver fallback:', e.message);
}

let pgPool = null;
export function getPool() {
  if (!pgPool && dbUrl) {
    pgPool = new pg.Pool({
      connectionString: dbUrl,
      ssl: { rejectUnauthorized: false },
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000
    });
  }
  return pgPool;
}

export function getDb() {
  if (neonSql) return neonSql;
  if (!dbUrl) {
    throw new Error('DATABASE_URL is not configured. Please add it to your environment variables (.env).');
  }
  return neon(dbUrl);
}

// Unified query runner that works with both Neon SQL tag and pg Pool
export async function query(text, params = []) {
  if (!dbUrl) {
    throw new Error('DATABASE_URL is not configured.');
  }

  // Try standard pg pool for maximum reliability with parameterized queries
  const pool = getPool();
  if (pool) {
    const client = await pool.connect();
    try {
      const res = await client.query(text, params);
      return res.rows;
    } finally {
      client.release();
    }
  }

  throw new Error('No database client available.');
}
