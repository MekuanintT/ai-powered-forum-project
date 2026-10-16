import fs from 'fs';
import mysql from 'mysql2/promise';

const conn = await mysql.createConnection({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  ssl: { rejectUnauthorized: false }, // fine for a one-time import
  multipleStatements: true,
});

await conn.query(fs.readFileSync('./db/schema.sql', 'utf8'));

const [tables] = await conn.query('SHOW TABLES');
console.log('Tables created:', tables);

await conn.end();