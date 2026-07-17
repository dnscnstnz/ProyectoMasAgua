require('dotenv').config();

const fs = require('fs');
const path = require('path');
const pool = require('../db');

async function main() {
  const sqlPath = path.join(__dirname, '..', 'fix-product-prices.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8').replace(/\uFEFF/g, '');

  await pool.query(sql);
  console.log('Precios de productos corregidos correctamente.');
}

main()
  .catch(error => {
    console.error('No se pudieron corregir los precios de productos:', error.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());


