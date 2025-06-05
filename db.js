const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'masagua',
  password: 'masaguafuerte2025',
  port: 5432,
});

module.exports = pool;
