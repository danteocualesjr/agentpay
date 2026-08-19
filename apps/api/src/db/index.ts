import Database from 'better-sqlite3';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dbPath = process.env.DATABASE_PATH ?? join(__dirname, '../../agentpay.db');

export const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

const schema = readFileSync(join(__dirname, 'schema.sql'), 'utf-8');
db.exec(schema);

const idempotencyCutoff = new Date(Date.now() - 86400000).toISOString();
db.prepare('DELETE FROM idempotency_keys WHERE created_at < ?').run(idempotencyCutoff);
