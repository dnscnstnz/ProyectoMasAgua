-- fix-driver-coverage.sql
-- Repara la cobertura de choferes usando zonas operativas coherentes.

BEGIN;

CREATE TABLE IF NOT EXISTS zonas (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(120) UNIQUE NOT NULL,
  descripcion TEXT
);

CREATE TABLE IF NOT EXISTS zona_comunas (
  zona_id INT NOT NULL REFERENCES zonas(id) ON DELETE CASCADE,
  comuna_id INT NOT NULL REFERENCES comunas(id) ON DELETE CASCADE,
  PRIMARY KEY (zona_id, comuna_id)
);

ALTER TABLE choferes
  ADD COLUMN IF NOT EXISTS zona_id INT REFERENCES zonas(id);

INSERT INTO zonas (nombre, descripcion)
VALUES
  ('Centro', 'Santiago centro y comunas urbanas cercanas.'),
  ('Oriente', 'Sector oriente de Santiago.'),
  ('Norte', 'Sector norte y norponiente cercano.'),
  ('Poniente', 'Sector poniente urbano.'),
  ('Sur', 'Sector sur urbano.'),
  ('Sur Oriente', 'Sector sur-oriente y precordillera urbana.'),
  ('Exterior Rural', 'Comunas exteriores como Talagante, Peñaflor y El Monte.')
ON CONFLICT (nombre) DO UPDATE SET descripcion = EXCLUDED.descripcion;

CREATE TEMP TABLE zona_comuna_seed (
  zona TEXT NOT NULL,
  comuna TEXT NOT NULL
) ON COMMIT DROP;

INSERT INTO zona_comuna_seed (zona, comuna)
VALUES
  ('Centro', 'Santiago'),
  ('Centro', 'Providencia'),
  ('Centro', 'Ñuñoa'),
  ('Centro', 'Macul'),
  ('Centro', 'San Joaquín'),
  ('Centro', 'San Miguel'),
  ('Centro', 'Pedro Aguirre Cerda'),
  ('Centro', 'Estación Central'),
  ('Centro', 'Quinta Normal'),
  ('Oriente', 'Las Condes'),
  ('Oriente', 'Vitacura'),
  ('Oriente', 'Lo Barnechea'),
  ('Oriente', 'La Reina'),
  ('Oriente', 'Peñalolén'),
  ('Norte', 'Independencia'),
  ('Norte', 'Recoleta'),
  ('Norte', 'Conchalí'),
  ('Norte', 'Huechuraba'),
  ('Norte', 'Quilicura'),
  ('Norte', 'Renca'),
  ('Poniente', 'Maipú'),
  ('Poniente', 'Pudahuel'),
  ('Poniente', 'Cerro Navia'),
  ('Poniente', 'Lo Prado'),
  ('Poniente', 'Cerrillos'),
  ('Sur', 'La Cisterna'),
  ('Sur', 'El Bosque'),
  ('Sur', 'San Bernardo'),
  ('Sur', 'San Ramón'),
  ('Sur', 'La Pintana'),
  ('Sur', 'La Granja'),
  ('Sur Oriente', 'La Florida'),
  ('Sur Oriente', 'Puente Alto'),
  ('Sur Oriente', 'Peñalolén'),
  ('Sur Oriente', 'Macul'),
  ('Sur Oriente', 'La Granja'),
  ('Exterior Rural', 'Talagante'),
  ('Exterior Rural', 'Peñaflor'),
  ('Exterior Rural', 'El Monte');

INSERT INTO zona_comunas (zona_id, comuna_id)
SELECT z.id, c.id
FROM zona_comuna_seed seed
JOIN zonas z ON z.nombre = seed.zona
JOIN comunas c ON LOWER(TRANSLATE(c.nombre, 'áéíóúÁÉÍÓÚñÑ', 'aeiouAEIOUnN')) = LOWER(TRANSLATE(seed.comuna, 'áéíóúÁÉÍÓÚñÑ', 'aeiouAEIOUnN'))
ON CONFLICT (zona_id, comuna_id) DO NOTHING;

CREATE TEMP TABLE chofer_zona_seed (
  rut TEXT NOT NULL,
  zona TEXT NOT NULL
) ON COMMIT DROP;

INSERT INTO chofer_zona_seed (rut, zona)
VALUES
  ('44444444-4', 'Centro'),
  ('55555555-5', 'Oriente'),
  ('66666666-6', 'Sur Oriente'),
  ('77777777-7', 'Norte'),
  ('88888888-8', 'Poniente'),
  ('99999999-9', 'Sur'),
  ('10101010-1', 'Centro'),
  ('12121212-2', 'Exterior Rural'),
  ('12345678-9', 'Centro');

UPDATE choferes ch
SET zona_id = z.id
FROM chofer_zona_seed seed
JOIN zonas z ON z.nombre = seed.zona
WHERE ch.rut = seed.rut;

DELETE FROM chofer_comunas cc
USING choferes ch
WHERE cc.chofer_id = ch.id
  AND ch.rut IN (SELECT rut FROM chofer_zona_seed);

INSERT INTO chofer_comunas (chofer_id, comuna_id)
SELECT ch.id, zc.comuna_id
FROM choferes ch
JOIN chofer_zona_seed seed ON seed.rut = ch.rut
JOIN zonas z ON z.nombre = seed.zona
JOIN zona_comunas zc ON zc.zona_id = z.id
ON CONFLICT (chofer_id, comuna_id) DO NOTHING;

COMMIT;

