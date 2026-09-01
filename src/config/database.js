const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const dbConfig = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'ml_spms_unical',
  waitForConnections: true,
  connectionLimit: 15,
  queueLimit: 0,
  decimalNumbers: true
};

let pool;

function getPool() {
  if (!pool) {
    pool = mysql.createPool(dbConfig);
  }
  return pool;
}

/**
 * Execute parameterized query safely
 * @param {string} sql
 * @param {Array} params
 * @returns {Promise<any>}
 */
async function query(sql, params = []) {
  const connectionPool = getPool();
  const [results] = await connectionPool.execute(sql, params);
  return results;
}

/**
 * Helper to get a single row
 */
async function queryOne(sql, params = []) {
  const results = await query(sql, params);
  return results && results.length > 0 ? results[0] : null;
}

/**
 * Initialize database and execute schema DDL if needed
 */
async function initDatabase() {
  try {
    // First connect without specifying database to ensure DB exists
    const rootConnection = await mysql.createConnection({
      host: dbConfig.host,
      port: dbConfig.port,
      user: dbConfig.user,
      password: dbConfig.password
    });

    await rootConnection.execute(`CREATE DATABASE IF NOT EXISTS \`${dbConfig.database}\`;`);
    await rootConnection.end();

    // Now connect with pool and verify tables
    const testPool = getPool();
    const [tables] = await testPool.execute('SHOW TABLES;');

    if (tables.length === 0) {
      console.log('Database empty. Executing schema.sql...');
      const schemaSql = fs.readFileSync(path.join(__dirname, '../../database/schema.sql'), 'utf8');

      // Execute individual statements from schema.sql
      const statements = schemaSql
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.toLowerCase().startsWith('create database') && !s.toLowerCase().startsWith('use'));

      for (const statement of statements) {
        await testPool.query(statement);
      }
      console.log('Database schema created successfully.');
    } else {
      console.log(`Database connected. Found ${tables.length} tables.`);
    }

    return true;
  } catch (error) {
    console.error('Database connection or initialization error:', error.message);
    throw error;
  }
}

module.exports = {
  getPool,
  query,
  queryOne,
  initDatabase,
  dbConfig
};
