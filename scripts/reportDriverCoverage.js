require('dotenv').config();

const pool = require('../db');

async function main() {
  const coverage = await pool.query(`
    SELECT ch.nombre, COUNT(cc.comuna_id) AS comunas
    FROM choferes ch
    LEFT JOIN chofer_comunas cc ON ch.id = cc.chofer_id
    WHERE ch.estado = 'activo'
    GROUP BY ch.id, ch.nombre
    ORDER BY comunas DESC, ch.nombre
  `);

  const totals = await pool.query(`
    SELECT
      (SELECT COUNT(*) FROM comunas) AS comunas,
      (SELECT COUNT(DISTINCT comuna_id) FROM chofer_comunas) AS cubiertas,
      (SELECT COUNT(*) FROM choferes WHERE estado = 'activo') AS choferes
  `);

  for (const row of coverage.rows) {
    console.log(`${row.nombre} | ${row.comunas} comunas`);
  }

  console.log(`comunas=${totals.rows[0].comunas}`);
  console.log(`comunas_cubiertas=${totals.rows[0].cubiertas}`);
  console.log(`choferes_activos=${totals.rows[0].choferes}`);
}

main()
  .catch(error => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
