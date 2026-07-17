-- seed.sql
-- Datos de demostracion seguros e idempotentes para MasAgua.
-- Todas las cuentas usan correos .local y password bcrypt, sin credenciales reales.
-- Password demo para las cuentas: DemoMasAgua2026!

BEGIN;

INSERT INTO usuarios (email, password, rol, tipo, nombre, rut, direccion, telefono)
VALUES
  ('admin.demo@masagua.local', '$2b$10$1oQusXgNx5uWLYNSUrlTRe38cipNICOWcjKj3IVXseuGM1om8ywRS', 'admin', 'natural', 'Admin Demo MasAgua', '11111111-1', 'Casa matriz MasAgua', '+56911111111'),
  ('cliente.demo@masagua.local', '$2b$10$1oQusXgNx5uWLYNSUrlTRe38cipNICOWcjKj3IVXseuGM1om8ywRS', 'cliente', 'natural', 'Cliente Demo', '22222222-2', 'Av. Demo 1234', '+56922222222'),
  ('empresa.demo@masagua.local', '$2b$10$1oQusXgNx5uWLYNSUrlTRe38cipNICOWcjKj3IVXseuGM1om8ywRS', 'cliente', 'empresa', 'Empresa Demo SpA', '33333333-3', 'Los Aromos 456', '+56933333333')
ON CONFLICT (email) DO UPDATE SET
  password = EXCLUDED.password,
  rol = EXCLUDED.rol,
  tipo = EXCLUDED.tipo,
  nombre = EXCLUDED.nombre,
  direccion = EXCLUDED.direccion,
  telefono = EXCLUDED.telefono;

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
);

INSERT INTO planes (nombre, descripcion, duracion_meses, precio, activo)
SELECT nombre, descripcion, duracion_meses, precio, activo
FROM (VALUES
  ('Plan Oficina Basico', 'Entrega mensual para oficinas pequenas.', 1, 29990.00, true),
  ('Plan Empresa Plus', 'Reposicion semanal y soporte preferente.', 3, 79990.00, true),
  ('Plan Corporativo', 'Cobertura recurrente para varias areas de trabajo.', 6, 149990.00, true)
) AS seed(nombre, descripcion, duracion_meses, precio, activo)
WHERE NOT EXISTS (
  SELECT 1 FROM planes p WHERE LOWER(p.nombre) = LOWER(seed.nombre)
);

INSERT INTO comunas (nombre)
SELECT nombre
FROM (VALUES
  ('Santiago'),
  ('Providencia'),
  ('Ñuñoa'),
  ('La Florida'),
  ('Maipú')
) AS seed(nombre)
WHERE NOT EXISTS (
  SELECT 1 FROM comunas c WHERE LOWER(TRANSLATE(c.nombre, 'áéíóúÁÉÍÓÚñÑ', 'aeiouAEIOUnN')) = LOWER(TRANSLATE(seed.nombre, 'áéíóúÁÉÍÓÚñÑ', 'aeiouAEIOUnN'))
);

INSERT INTO vehiculos (patente, marca, modelo, anio)
VALUES
  ('MSAG10', 'Hyundai', 'H-1', 2021),
  ('MSAG20', 'Chevrolet', 'N300', 2022),
  ('MSAG30', 'Peugeot', 'Partner', 2020)
ON CONFLICT (patente) DO UPDATE SET
  marca = EXCLUDED.marca,
  modelo = EXCLUDED.modelo,
  anio = EXCLUDED.anio;

INSERT INTO choferes (nombre, rut, telefono, direccion, estado, vehiculo_id)
VALUES
  ('Camila Rojas', '44444444-4', '+56944444444', 'Base Santiago', 'activo', (SELECT id FROM vehiculos WHERE patente = 'MSAG10')),
  ('Diego Fuentes', '55555555-5', '+56955555555', 'Base Providencia', 'activo', (SELECT id FROM vehiculos WHERE patente = 'MSAG20')),
  ('Valentina Soto', '66666666-6', '+56966666666', 'Base La Florida', 'activo', (SELECT id FROM vehiculos WHERE patente = 'MSAG30'))
ON CONFLICT (rut) DO UPDATE SET
  nombre = EXCLUDED.nombre,
  telefono = EXCLUDED.telefono,
  direccion = EXCLUDED.direccion,
  estado = EXCLUDED.estado,
  vehiculo_id = EXCLUDED.vehiculo_id;

INSERT INTO chofer_comunas (chofer_id, comuna_id)
SELECT ch.id, c.id
FROM (VALUES
  ('44444444-4', 'Santiago'),
  ('44444444-4', 'Providencia'),
  ('55555555-5', 'Providencia'),
  ('55555555-5', 'Ñuñoa'),
  ('66666666-6', 'La Florida'),
  ('66666666-6', 'Maipú')
) AS seed(rut, comuna)
JOIN choferes ch ON ch.rut = seed.rut
JOIN comunas c ON LOWER(TRANSLATE(c.nombre, 'áéíóúÁÉÍÓÚñÑ', 'aeiouAEIOUnN')) = LOWER(TRANSLATE(seed.comuna, 'áéíóúÁÉÍÓÚñÑ', 'aeiouAEIOUnN'))
ON CONFLICT (chofer_id, comuna_id) DO NOTHING;

INSERT INTO planes_contratados (usuario_id, plan_id, estado, fecha_contratacion)
SELECT u.id, p.id, 'pendiente', NOW()
FROM usuarios u
JOIN planes p ON p.nombre = 'Plan Empresa Plus'
WHERE u.email = 'empresa.demo@masagua.local'
  AND NOT EXISTS (
    SELECT 1
    FROM planes_contratados pc
    WHERE pc.usuario_id = u.id AND pc.plan_id = p.id
  );

WITH nuevo_pedido AS (
  INSERT INTO pedidos (usuario_id, fecha, estado, direccion_entrega, comuna_id)
  SELECT u.id, NOW(), 'pendiente', 'Av. Demo 1234, oficina 301', c.id
  FROM usuarios u
  JOIN comunas c ON c.nombre = 'Providencia'
  WHERE u.email = 'cliente.demo@masagua.local'
    AND NOT EXISTS (
      SELECT 1
      FROM pedidos p
      WHERE p.usuario_id = u.id
        AND p.direccion_entrega = 'Av. Demo 1234, oficina 301'
        AND LOWER(p.estado) = 'pendiente'
    )
  RETURNING id
)
INSERT INTO detalle_pedido (pedido_id, producto_id, cantidad)
SELECT np.id, pr.id, seed.cantidad
FROM nuevo_pedido np
JOIN (VALUES
  ('Bidon de agua 20 litros', 2),
  ('Dispensador sobremesa', 1)
) AS seed(nombre_producto, cantidad) ON true
JOIN productos pr ON pr.nombre = seed.nombre_producto;

-- Cobertura demo ampliada de choferes y comunas
-- Amplia comunas y choferes demo para cubrir la mayoria del Gran Santiago.



INSERT INTO comunas (nombre)
SELECT nombre
FROM (VALUES
  ('Santiago'),
  ('Providencia'),
  ('Ñuñoa'),
  ('Las Condes'),
  ('Vitacura'),
  ('Lo Barnechea'),
  ('La Reina'),
  ('Peñalolén'),
  ('Macul'),
  ('San Joaquín'),
  ('San Miguel'),
  ('La Cisterna'),
  ('El Bosque'),
  ('San Bernardo'),
  ('Puente Alto'),
  ('La Florida'),
  ('Maipú'),
  ('Estación Central'),
  ('Quinta Normal'),
  ('Independencia'),
  ('Recoleta'),
  ('Huechuraba'),
  ('Quilicura'),
  ('Pudahuel'),
  ('Cerro Navia'),
  ('Lo Prado'),
  ('Renca'),
  ('Conchalí'),
  ('Pedro Aguirre Cerda'),
  ('Cerrillos'),
  ('La Granja'),
  ('San Ramón'),
  ('La Pintana')
) AS seed(nombre)
WHERE NOT EXISTS (
  SELECT 1 FROM comunas c WHERE LOWER(TRANSLATE(c.nombre, 'áéíóúÁÉÍÓÚñÑ', 'aeiouAEIOUnN')) = LOWER(TRANSLATE(seed.nombre, 'áéíóúÁÉÍÓÚñÑ', 'aeiouAEIOUnN'))
);

INSERT INTO vehiculos (patente, marca, modelo, anio)
VALUES
  ('MSAG10', 'Hyundai', 'H-1', 2021),
  ('MSAG20', 'Chevrolet', 'N300', 2022),
  ('MSAG30', 'Peugeot', 'Partner', 2020),
  ('MSAG40', 'Kia', 'Frontier', 2022),
  ('MSAG50', 'Maxus', 'V80', 2023),
  ('MSAG60', 'Fiat', 'Fiorino', 2021),
  ('MSAG70', 'Renault', 'Kangoo', 2022),
  ('MSAG80', 'JAC', 'Sunray', 2023)
ON CONFLICT (patente) DO UPDATE SET
  marca = EXCLUDED.marca,
  modelo = EXCLUDED.modelo,
  anio = EXCLUDED.anio;

INSERT INTO choferes (nombre, rut, telefono, direccion, estado, vehiculo_id)
VALUES
  ('Camila Rojas', '44444444-4', '+56944444444', 'Base Centro', 'activo', (SELECT id FROM vehiculos WHERE patente = 'MSAG10')),
  ('Diego Fuentes', '55555555-5', '+56955555555', 'Base Oriente', 'activo', (SELECT id FROM vehiculos WHERE patente = 'MSAG20')),
  ('Valentina Soto', '66666666-6', '+56966666666', 'Base Sur Oriente', 'activo', (SELECT id FROM vehiculos WHERE patente = 'MSAG30')),
  ('Ignacio Morales', '77777777-7', '+56977777777', 'Base Norte', 'activo', (SELECT id FROM vehiculos WHERE patente = 'MSAG40')),
  ('Fernanda Araya', '88888888-8', '+56988888888', 'Base Poniente', 'activo', (SELECT id FROM vehiculos WHERE patente = 'MSAG50')),
  ('Matias Herrera', '99999999-9', '+56999999999', 'Base Sur', 'activo', (SELECT id FROM vehiculos WHERE patente = 'MSAG60')),
  ('Sofia Castillo', '10101010-1', '+56910101010', 'Base Centro Norte', 'activo', (SELECT id FROM vehiculos WHERE patente = 'MSAG70')),
  ('Benjamin Torres', '12121212-2', '+56912121212', 'Base Refuerzo Metropolitano', 'activo', (SELECT id FROM vehiculos WHERE patente = 'MSAG80'))
ON CONFLICT (rut) DO UPDATE SET
  nombre = EXCLUDED.nombre,
  telefono = EXCLUDED.telefono,
  direccion = EXCLUDED.direccion,
  estado = EXCLUDED.estado,
  vehiculo_id = EXCLUDED.vehiculo_id;

INSERT INTO chofer_comunas (chofer_id, comuna_id)
SELECT ch.id, c.id
FROM (VALUES
  ('44444444-4', 'Santiago'),
  ('44444444-4', 'Providencia'),
  ('44444444-4', 'Ñuñoa'),
  ('44444444-4', 'Macul'),
  ('44444444-4', 'San Joaquín'),
  ('44444444-4', 'San Miguel'),
  ('55555555-5', 'Providencia'),
  ('55555555-5', 'Las Condes'),
  ('55555555-5', 'Vitacura'),
  ('55555555-5', 'Lo Barnechea'),
  ('55555555-5', 'La Reina'),
  ('55555555-5', 'Peñalolén'),
  ('66666666-6', 'La Florida'),
  ('66666666-6', 'Puente Alto'),
  ('66666666-6', 'Peñalolén'),
  ('66666666-6', 'Macul'),
  ('66666666-6', 'La Granja'),
  ('66666666-6', 'La Pintana'),
  ('77777777-7', 'Independencia'),
  ('77777777-7', 'Recoleta'),
  ('77777777-7', 'Huechuraba'),
  ('77777777-7', 'Quilicura'),
  ('77777777-7', 'Conchalí'),
  ('77777777-7', 'Renca'),
  ('88888888-8', 'Maipú'),
  ('88888888-8', 'Pudahuel'),
  ('88888888-8', 'Cerro Navia'),
  ('88888888-8', 'Lo Prado'),
  ('88888888-8', 'Quinta Normal'),
  ('88888888-8', 'Estación Central'),
  ('88888888-8', 'Cerrillos'),
  ('99999999-9', 'San Bernardo'),
  ('99999999-9', 'El Bosque'),
  ('99999999-9', 'La Cisterna'),
  ('99999999-9', 'San Ramón'),
  ('99999999-9', 'Pedro Aguirre Cerda'),
  ('99999999-9', 'La Granja'),
  ('10101010-1', 'Santiago'),
  ('10101010-1', 'Independencia'),
  ('10101010-1', 'Recoleta'),
  ('10101010-1', 'Quinta Normal'),
  ('10101010-1', 'Renca'),
  ('10101010-1', 'Conchalí'),
  ('12121212-2', 'Santiago'),
  ('12121212-2', 'Providencia'),
  ('12121212-2', 'Ñuñoa'),
  ('12121212-2', 'Las Condes'),
  ('12121212-2', 'Maipú'),
  ('12121212-2', 'La Florida'),
  ('12121212-2', 'Puente Alto'),
  ('12121212-2', 'San Bernardo')
) AS seed(rut, comuna)
JOIN choferes ch ON ch.rut = seed.rut
JOIN comunas c ON LOWER(TRANSLATE(c.nombre, 'áéíóúÁÉÍÓÚñÑ', 'aeiouAEIOUnN')) = LOWER(TRANSLATE(seed.comuna, 'áéíóúÁÉÍÓÚñÑ', 'aeiouAEIOUnN'))
ON CONFLICT (chofer_id, comuna_id) DO NOTHING;


-- Chofer de refuerzo para comunas existentes que aun no tienen cobertura.
INSERT INTO chofer_comunas (chofer_id, comuna_id)
SELECT ch.id, c.id
FROM choferes ch
CROSS JOIN comunas c
WHERE ch.rut = '12121212-2'
  AND NOT EXISTS (
    SELECT 1 FROM chofer_comunas cc WHERE cc.comuna_id = c.id
  )
ON CONFLICT (chofer_id, comuna_id) DO NOTHING;
COMMIT;






