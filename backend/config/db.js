const { Pool } = require('pg');
require('dotenv').config();

// Construct the PostgreSQL connection pool config
const poolConfig = {
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'smart_asset_manager',
  password: process.env.DB_PASSWORD || 'postgres',
  port: parseInt(process.env.DB_PORT || '5432', 10),
};

// If DATABASE_URL is provided (e.g. in cloud hosting or docker setups), use it instead
if (process.env.DATABASE_URL) {
  poolConfig.connectionString = process.env.DATABASE_URL;
}

const pool = new Pool(poolConfig);

// Database event logging
pool.on('connect', () => {
  console.log('PostgreSQL connection pool established successfully.');
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle PostgreSQL client:', err);
  process.exit(-1);
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool
};
