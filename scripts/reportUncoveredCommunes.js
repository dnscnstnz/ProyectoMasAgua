require('dotenv').config();

const pool = require('../db');

async function main() {
  const result = await pool.query(`
    SELECT c.nombre
    FROM comunas c
    LEFT JOIN chofer_comunas cc ON c.id = cc.comuna_id
    WHERE cc.comuna_id IS NULL
    ORDER BY c.nombre
  `);

  if (result.rows.length === 0) {
    console.log('Todas las comunas tienen al menos un chofer compatible.');
    return;
  }

  for (const row of result.rows) {
    console.log(row.nombre);
  }
}

main()
  .catch(error => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
