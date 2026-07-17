-- fix-commune-duplicates.sql
-- Fusiona comunas duplicadas por acentos/variantes y evita que vuelvan a duplicarse.

BEGIN;

CREATE TEMP TABLE comuna_canonica (
  nombre TEXT NOT NULL,
  clave TEXT NOT NULL
) ON COMMIT DROP;

INSERT INTO comuna_canonica (nombre, clave)
VALUES
  ('Santiago', 'santiago'),
  ('Providencia', 'providencia'),
  ('Ñuñoa', 'nunoa'),
  ('Las Condes', 'las condes'),
  ('Vitacura', 'vitacura'),
  ('Lo Barnechea', 'lo barnechea'),
  ('La Reina', 'la reina'),
  ('Peñalolén', 'penalolen'),
  ('Macul', 'macul'),
  ('San Joaquín', 'san joaquin'),
  ('San Miguel', 'san miguel'),
  ('La Cisterna', 'la cisterna'),
  ('El Bosque', 'el bosque'),
  ('San Bernardo', 'san bernardo'),
  ('Puente Alto', 'puente alto'),
  ('La Florida', 'la florida'),
  ('Maipú', 'maipu'),
  ('Estación Central', 'estacion central'),
  ('Quinta Normal', 'quinta normal'),
  ('Independencia', 'independencia'),
  ('Recoleta', 'recoleta'),
  ('Huechuraba', 'huechuraba'),
  ('Quilicura', 'quilicura'),
  ('Pudahuel', 'pudahuel'),
  ('Cerro Navia', 'cerro navia'),
  ('Lo Prado', 'lo prado'),
  ('Renca', 'renca'),
  ('Conchalí', 'conchali'),
  ('Pedro Aguirre Cerda', 'pedro aguirre cerda'),
  ('Cerrillos', 'cerrillos'),
  ('La Granja', 'la granja'),
  ('San Ramón', 'san ramon'),
  ('La Pintana', 'la pintana'),
  ('El Monte', 'el monte'),
  ('Peñaflor', 'penaflor'),
  ('Talagante', 'talagante'),
  ('Lo Espejo', 'lo espejo');

WITH normalizadas AS (
  SELECT
    id,
    LOWER(TRANSLATE(nombre, 'áéíóúÁÉÍÓÚñÑ', 'aeiouAEIOUnN')) AS clave,
    MIN(id) OVER (PARTITION BY LOWER(TRANSLATE(nombre, 'áéíóúÁÉÍÓÚñÑ', 'aeiouAEIOUnN'))) AS conservar_id
  FROM comunas
), coberturas_movidas AS (
  INSERT INTO chofer_comunas (chofer_id, comuna_id)
  SELECT DISTINCT cc.chofer_id, n.conservar_id
  FROM chofer_comunas cc
  JOIN normalizadas n ON n.id = cc.comuna_id
  WHERE n.id <> n.conservar_id
  ON CONFLICT (chofer_id, comuna_id) DO NOTHING
  RETURNING 1
)
DELETE FROM chofer_comunas cc
USING normalizadas n
WHERE cc.comuna_id = n.id
  AND n.id <> n.conservar_id;

WITH normalizadas AS (
  SELECT
    id,
    MIN(id) OVER (PARTITION BY LOWER(TRANSLATE(nombre, 'áéíóúÁÉÍÓÚñÑ', 'aeiouAEIOUnN'))) AS conservar_id
  FROM comunas
)
UPDATE pedidos p
SET comuna_id = n.conservar_id
FROM normalizadas n
WHERE p.comuna_id = n.id
  AND n.id <> n.conservar_id;

WITH normalizadas AS (
  SELECT
    id,
    MIN(id) OVER (PARTITION BY LOWER(TRANSLATE(nombre, 'áéíóúÁÉÍÓÚñÑ', 'aeiouAEIOUnN'))) AS conservar_id
  FROM comunas
)
DELETE FROM comunas c
USING normalizadas n
WHERE c.id = n.id
  AND n.id <> n.conservar_id;

UPDATE comunas c
SET nombre = cc.nombre
FROM comuna_canonica cc
WHERE LOWER(TRANSLATE(c.nombre, 'áéíóúÁÉÍÓÚñÑ', 'aeiouAEIOUnN')) = cc.clave;

CREATE UNIQUE INDEX IF NOT EXISTS comunas_nombre_normalizado_idx
ON comunas (LOWER(TRANSLATE(nombre, 'áéíóúÁÉÍÓÚñÑ', 'aeiouAEIOUnN')));

COMMIT;
