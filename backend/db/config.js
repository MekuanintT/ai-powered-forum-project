import dotenv from 'dotenv';
dotenv.config();
import mysql from 'mysql2/promise';

// Build SSL options only when connecting to a cloud database (e.g. Aiven).
// Locally, DB_SSL is unset, so no SSL is used and nothing changes.
const buildSslOptions = () => {
  if (process.env.DB_SSL !== 'true') return undefined;

  // Preferred: verify the server using Aiven's CA certificate.
  if (process.env.DB_CA_CERT) {
    return { ca: process.env.DB_CA_CERT.replace(/\\n/g, '\n') };
  }

  // Fallback: encrypted, but the server certificate isn't verified.
  return { rejectUnauthorized: false };
};

// Database connection pool
export const db = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || '',
  database: process.env.DB_NAME || 'evangadi_forum',
  ssl: buildSslOptions(),
  waitForConnections: true,
  connectionLimit: 5, // small pool: the free Aiven plan has capped connections
});

const ensureParams = params => {
  if (params === undefined || params === null) {
    throw new Error('SQL parameters are required');
  }
  const isArray = Array.isArray(params);
  const isObject = !isArray && typeof params === 'object';
  if (!isArray && !isObject) {
    throw new Error('SQL parameters must be an array or object');
  }
};

export const safeExecute = async (sql, params) => {
  if (typeof sql !== 'string' || sql.trim().length === 0) {
    throw new Error('SQL query must be a non-empty string');
  }
  ensureParams(params);
  const [result] = await db.execute(sql, params);
  return result;
};