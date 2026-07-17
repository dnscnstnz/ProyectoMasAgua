-- schema.sql

CREATE TABLE usuarios (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  rol VARCHAR(50) NOT NULL DEFAULT 'cliente', -- 'cliente', 'admin'
  tipo VARCHAR(50),                            -- 'empresa', NULL para clientes normales
  nombre VARCHAR(255),
  rut VARCHAR(20) UNIQUE,
  direccion TEXT,
  telefono VARCHAR(20)
);

CREATE TABLE productos (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(255) NOT NULL,
  precio NUMERIC(10,2) DEFAULT 0
);

CREATE TABLE pedidos (
  id SERIAL PRIMARY KEY,
  usuario_id INT NOT NULL REFERENCES usuarios(id),
  fecha TIMESTAMP DEFAULT NOW(),
  estado VARCHAR(50) DEFAULT 'pendiente'
);

CREATE TABLE detalle_pedido (
  id SERIAL PRIMARY KEY,
  pedido_id INT NOT NULL REFERENCES pedidos(id),
  producto_id INT NOT NULL REFERENCES productos(id),
  cantidad INT NOT NULL
);

CREATE TABLE planes (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(255) NOT NULL,
  descripcion TEXT,
  duracion_meses INT,
  precio NUMERIC(10,2),
  activo BOOLEAN DEFAULT TRUE
);

CREATE TABLE planes_contratados (
  id SERIAL PRIMARY KEY,
  usuario_id INT NOT NULL REFERENCES usuarios(id),
  plan_id INT NOT NULL REFERENCES planes(id),
  estado VARCHAR(50) DEFAULT 'pendiente',
  fecha_contratacion TIMESTAMP DEFAULT NOW()
);

CREATE TABLE vehiculos (
  id SERIAL PRIMARY KEY,
  patente VARCHAR(20) UNIQUE NOT NULL,
  marca VARCHAR(100),
  modelo VARCHAR(100),
  anio INT
);

CREATE TABLE comunas (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(255) NOT NULL
);

CREATE TABLE zonas (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(120) UNIQUE NOT NULL,
  descripcion TEXT
);

CREATE TABLE zona_comunas (
  zona_id INT NOT NULL REFERENCES zonas(id) ON DELETE CASCADE,
  comuna_id INT NOT NULL REFERENCES comunas(id) ON DELETE CASCADE,
  PRIMARY KEY (zona_id, comuna_id)
);

ALTER TABLE pedidos
  ADD COLUMN IF NOT EXISTS direccion_entrega TEXT,
  ADD COLUMN IF NOT EXISTS comuna_id INT REFERENCES comunas(id);

CREATE TABLE choferes (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(255) NOT NULL,
  rut VARCHAR(20) UNIQUE NOT NULL,
  telefono VARCHAR(20),
  direccion TEXT,
  estado VARCHAR(50),
  vehiculo_id INT REFERENCES vehiculos(id),
  zona_id INT REFERENCES zonas(id)
);

CREATE TABLE chofer_comunas (
  chofer_id INT NOT NULL REFERENCES choferes(id) ON DELETE CASCADE,
  comuna_id INT NOT NULL REFERENCES comunas(id),
  PRIMARY KEY (chofer_id, comuna_id)
);

CREATE TABLE entregas (
  id SERIAL PRIMARY KEY,
  pedido_id INT NOT NULL REFERENCES pedidos(id),
  chofer_id INT NOT NULL REFERENCES choferes(id),
  fecha_programada TIMESTAMP,
  estado VARCHAR(50) DEFAULT 'asignado'
);


