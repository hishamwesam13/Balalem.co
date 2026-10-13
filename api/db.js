import { neon } from '@neondatabase/serverless';
import pg from 'pg';
import dotenv from 'dotenv';

// Load local .env if available
dotenv.config();

export function getDbUrl() {
  return process.env.DATABASE_URL ||
         process.env.POSTGRES_URL ||
         process.env.NEON_DATABASE_URL ||
         process.env.NEON_URL ||
         process.env.DIRECT_DATABASE_URL ||
         process.env.DB_URL;
}

let pgPool = null;
export function getPool() {
  const url = getDbUrl();
  if (!pgPool && url) {
    pgPool = new pg.Pool({
      connectionString: url,
      ssl: { rejectUnauthorized: false },
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000
    });
  }
  return pgPool;
}

export function getDb() {
  const url = getDbUrl();
  if (!url) {
    throw new Error('DATABASE_URL is not configured.');
  }
  return neon(url);
}

// Unified query runner that works with both Neon SQL tag and pg Pool
export async function query(text, params = []) {
  const url = getDbUrl();
  if (!url) {
    const keys = Object.keys(process.env).filter(k => !k.startsWith('npm_') && !k.startsWith('NODE_')).join(', ');
    throw new Error('DATABASE_URL is not configured. Available env keys: [' + keys + ']');
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
