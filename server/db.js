import 'dotenv/config';
import pg from 'pg';

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is required. Add it to .env locally and Railway variables in production.');
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  enableChannelBinding: true,
  max: 5,
});

export const query = (text, params) => pool.query(text, params);
