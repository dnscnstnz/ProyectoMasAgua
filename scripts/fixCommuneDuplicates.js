require('dotenv').config();

const fs = require('fs');
const path = require('path');
const pool = require('../db');

async function main() {
  const sqlPath = path.join(__dirname, '..', 'fix-commune-duplicates.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8').replace(/\uFEFF/g, '');

  await pool.query(sql);
  console.log('Comunas duplicadas fusionadas correctamente.');
}

main()
  .catch(error => {
    console.error('No se pudieron fusionar las comunas duplicadas:', error.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
