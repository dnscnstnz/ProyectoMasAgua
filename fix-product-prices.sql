-- fix-product-prices.sql
-- Corrige precios de productos existentes que quedaron en 0 y agrega productos faltantes.

BEGIN;

WITH precios_productos(nombre, precio) AS (
  VALUES
    ('Agua 1.5L pack x6', 5990.00),
    ('Botellon 10L', 3900.00),
    ('Botellon 20L', 6500.00),
    ('Bidon de agua 5 litros', 2500.00),
    ('Bidon de agua 10 litros', 3900.00),
    ('Bidon de agua 20 litros', 6500.00),
    ('Dispensador electrico', 12990.00),
    ('Dispensador sobremesa', 34990.00),
    ('Dispensador electrico sobremesa', 89990.00),
    ('Dispensador pedestal', 119990.00),
    ('Dispensador control de temperatura', 149990.00),
    ('Dispensador bidon oculto', 189990.00)
), productos_actualizados AS (
  UPDATE productos p
  SET precio = pp.precio
  FROM precios_productos pp
  WHERE LOWER(TRANSLATE(p.nombre, 'áéíóúÁÉÍÓÚñÑ', 'aeiouAEIOUnN')) = LOWER(pp.nombre)
     OR LOWER(p.nombre) = LOWER(pp.nombre)
  RETURNING p.id
)
INSERT INTO productos (nombre, precio)
SELECT pp.nombre, pp.precio
FROM precios_productos pp
WHERE NOT EXISTS (
  SELECT 1
  FROM productos p
  WHERE LOWER(TRANSLATE(p.nombre, 'áéíóúÁÉÍÓÚñÑ', 'aeiouAEIOUnN')) = LOWER(pp.nombre)
     OR LOWER(p.nombre) = LOWER(pp.nombre)
);;

COMMIT;


