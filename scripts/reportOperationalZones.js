require('dotenv').config();

const pool = require('../db');

async function main() {
  const coverage = await pool.query(`
    SELECT
      ch.nombre,
      z.nombre AS zona,
      COUNT(cc.comuna_id) AS comunas
    FROM choferes ch
    LEFT JOIN zonas z ON ch.zona_id = z.id
    LEFT JOIN chofer_comunas cc ON ch.id = cc.chofer_id
    GROUP BY ch.id, ch.nombre, z.nombre
    ORDER BY z.nombre NULLS LAST, ch.nombre
  `);

  const invalid = await pool.query(`
    SELECT ch.nombre, z.nombre AS zona, c.nombre AS comuna
    FROM choferes ch
    JOIN zonas z ON ch.zona_id = z.id
    JOIN chofer_comunas cc ON ch.id = cc.chofer_id
    JOIN comunas c ON cc.comuna_id = c.id
    LEFT JOIN zona_comunas zc ON zc.zona_id = ch.zona_id AND zc.comuna_id = cc.comuna_id
    WHERE zc.comuna_id IS NULL
    ORDER BY ch.nombre, c.nombre
  `);

  const zones = await pool.query(`
    SELECT z.nombre, COUNT(zc.comuna_id) AS comunas
    FROM zonas z
    LEFT JOIN zona_comunas zc ON z.id = zc.zona_id
    GROUP BY z.id, z.nombre
    ORDER BY z.nombre
  `);

  console.log('Zonas:');
  for (const row of zones.rows) console.log(`${row.nombre} | ${row.comunas} comunas`);

  console.log('Choferes:');
  for (const row of coverage.rows) console.log(`${row.nombre} | ${row.zona || 'Sin zona'} | ${row.comunas} comunas`);

  console.log(`coberturas_fuera_de_zona=${invalid.rows.length}`);
}

main()
  .catch(error => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
