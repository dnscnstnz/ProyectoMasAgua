require('dotenv').config();

const fs = require('fs');
const path = require('path');
const pool = require('../db');

async function main() {
  const sqlPath = path.join(__dirname, '..', 'fix-operational-zones.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8').replace(/\uFEFF/g, '');

  await pool.query(sql);
  console.log('Zonas operativas y coberturas coherentes actualizadas correctamente.');
}

main()
  .catch(error => {
    console.error('No se pudieron actualizar las zonas operativas:', error.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
