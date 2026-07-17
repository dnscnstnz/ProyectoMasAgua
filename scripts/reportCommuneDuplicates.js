require('dotenv').config();

const pool = require('../db');

async function main() {
  const duplicates = await pool.query(`
    SELECT
      LOWER(TRANSLATE(nombre, 'áéíóúÁÉÍÓÚñÑ', 'aeiouAEIOUnN')) AS clave,
      COUNT(*) AS total,
      STRING_AGG(id || ':' || nombre, ' | ' ORDER BY id) AS comunas
    FROM comunas
    GROUP BY LOWER(TRANSLATE(nombre, 'áéíóúÁÉÍÓÚñÑ', 'aeiouAEIOUnN'))
    HAVING COUNT(*) > 1
    ORDER BY total DESC, clave
  `);

  const total = await pool.query('SELECT COUNT(*) AS total FROM comunas');

  if (duplicates.rows.length === 0) {
    console.log('sin_duplicados=true');
  } else {
    for (const row of duplicates.rows) {
      console.log(`${row.clave} -> ${row.total} -> ${row.comunas}`);
    }
  }

  console.log(`comunas=${total.rows[0].total}`);
}

main()
  .catch(error => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
