import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool } from '../server/db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const schemaPath = path.resolve(__dirname, '..', 'database', 'schema.sql');

try {
  const schema = await readFile(schemaPath, 'utf8');
  await pool.query(schema);
  console.log('Database schema applied.');
} finally {
  await pool.end();
}
