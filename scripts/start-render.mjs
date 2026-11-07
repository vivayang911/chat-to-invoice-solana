import pg from 'pg';
import {createApp} from '../src/server.mjs';

const {DATABASE_URL, RENDER_EXTERNAL_URL, PORT} = process.env;
if (!DATABASE_URL || !RENDER_EXTERNAL_URL || !PORT) {
  throw new Error('Render requires DATABASE_URL, RENDER_EXTERNAL_URL and PORT.');
}
const url = new URL(RENDER_EXTERNAL_URL);
if (url.protocol !== 'https:' || url.username || url.password || url.href !== url.origin + '/') {
  throw new Error('Render external URL must be a bare HTTPS origin.');
}

const db = new pg.Client({connectionString: DATABASE_URL, connectionTimeoutMillis: 10000});
// The stores serialize changes in one process. Keep that invariant across deploys.
db.on('error', () => {
  console.error('Database connection lost. Restarting the demo.');
  process.exit(1);
});
await db.connect();
const {rows} = await db.query('SELECT pg_try_advisory_lock(4188, 2026) AS acquired');
if (!rows[0].acquired) {
  await db.end();
  throw new Error('A demo instance already holds the storage lock.');
}
await db.query(`
  CREATE TABLE IF NOT EXISTS demo_records (
    namespace text NOT NULL,
    id text NOT NULL,
    value jsonb NOT NULL,
    PRIMARY KEY (namespace, id)
  )
`);
function records(namespace) {
  return {
    async get(id) {
      const {rows} = await db.query(
        'SELECT value FROM demo_records WHERE namespace = $1 AND id = $2',
        [namespace, id],
      );
      return rows[0]?.value;
    },
    async set(id, value) {
      await db.query(
        'INSERT INTO demo_records VALUES ($1, $2, $3) ON CONFLICT (namespace, id) DO UPDATE SET value = EXCLUDED.value',
        [namespace, id, JSON.stringify(value)],
      );
    },
  };
}
createApp({
  port: Number(PORT),
  publicOrigin: url.origin,
  storage: {statements: records('statements'), payments: records('payments')},
}).listen(Number(PORT), '0.0.0.0');
