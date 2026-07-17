const pool = require('../db');

function normalizarArray(valor) {
  if (!valor) return [];
  return Array.isArray(valor) ? valor : [valor];
}

async function cargarZonasConComunas() {
  const { rows } = await pool.query(`
    SELECT
      z.id AS zona_id,
      z.nombre AS zona_nombre,
      z.descripcion,
      c.id AS comuna_id,
      c.nombre AS comuna_nombre
    FROM zonas z
    LEFT JOIN zona_comunas zc ON z.id = zc.zona_id
    LEFT JOIN comunas c ON zc.comuna_id = c.id
    ORDER BY z.nombre, c.nombre
  `);

  const zonasMap = new Map();
  rows.forEach(row => {
    if (!zonasMap.has(row.zona_id)) {
      zonasMap.set(row.zona_id, {
        id: row.zona_id,
        nombre: row.zona_nombre,
        descripcion: row.descripcion,
        comunas: []
      });
    }

    if (row.comuna_id) {
      zonasMap.get(row.zona_id).comunas.push({
        id: row.comuna_id,
        nombre: row.comuna_nombre
      });
    }
  });

  return Array.from(zonasMap.values());
}

async function validarComunasEnZona(zonaId, comunasArray) {
  if (!zonaId) {
    return { valido: false, mensaje: 'Selecciona una zona base para el chofer.' };
  }

  if (comunasArray.length === 0) {
    return { valido: false, mensaje: 'Selecciona al menos una comuna de cobertura.' };
  }

  const ids = comunasArray.map(id => Number(id)).filter(Number.isInteger);
  if (ids.length !== comunasArray.length) {
    return { valido: false, mensaje: 'Una o mas comunas seleccionadas no son validas.' };
  }

  const zonaResult = await pool.query('SELECT id FROM zonas WHERE id = $1', [zonaId]);
  if (zonaResult.rowCount === 0) {
    return { valido: false, mensaje: 'La zona seleccionada no existe.' };
  }

  const validComunasResult = await pool.query(
    `SELECT comuna_id FROM zona_comunas WHERE zona_id = $1 AND comuna_id = ANY($2::int[])`,
    [zonaId, ids]
  );

  if (validComunasResult.rowCount !== ids.length) {
    return {
      valido: false,
      mensaje: 'Todas las comunas del chofer deben pertenecer a su zona base. Evita mezclar sectores lejanos.'
    };
  }

  return { valido: true, ids };
}

async function validarVehiculo(vehiculoId) {
  if (!vehiculoId) return null;

  const vehiculoResult = await pool.query('SELECT id FROM vehiculos WHERE id = $1', [vehiculoId]);
  if (vehiculoResult.rowCount === 0) {
    throw new Error(`Vehiculo con ID ${vehiculoId} no existe`);
  }

  return vehiculoId;
}

async function reemplazarComunasChofer(client, choferId, comunasIds) {
  await client.query('DELETE FROM chofer_comunas WHERE chofer_id = $1', [choferId]);

  const insertComunasValues = comunasIds.map((_, i) => `($1, $${i + 2})`).join(',');
  await client.query(
    `INSERT INTO chofer_comunas (chofer_id, comuna_id) VALUES ${insertComunasValues}`,
    [choferId, ...comunasIds]
  );
}

exports.listarChoferes = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        ch.*,
        z.nombre AS zona_nombre,
        v.patente AS vehiculo_patente,
        STRING_AGG(c.nombre, ', ' ORDER BY c.nombre) AS comunas_asignadas
      FROM choferes ch
      LEFT JOIN zonas z ON ch.zona_id = z.id
      LEFT JOIN vehiculos v ON ch.vehiculo_id = v.id
      LEFT JOIN chofer_comunas cc ON ch.id = cc.chofer_id
      LEFT JOIN comunas c ON cc.comuna_id = c.id
      GROUP BY ch.id, z.nombre, v.patente
      ORDER BY z.nombre NULLS LAST, ch.nombre
    `);
    res.render('choferes', { choferes: result.rows });
  } catch (error) {
    console.error('Error listando choferes:', error);
    res.status(500).send('Error al listar choferes');
  }
};

exports.formularioNuevoChofer = async (req, res) => {
  try {
    const [zonas, vehiculosResult] = await Promise.all([
      cargarZonasConComunas(),
      pool.query('SELECT id, patente, marca, modelo FROM vehiculos ORDER BY patente')
    ]);

    res.render('nuevoChofer', { zonas, vehiculos: vehiculosResult.rows });
  } catch (error) {
    console.error('Error cargando formulario nuevo chofer:', error);
    res.status(500).send('Error al cargar formulario');
  }
};

exports.guardarNuevoChofer = async (req, res) => {
  const client = await pool.connect();

  try {
    const { nombre, rut, telefono, direccion, estado, vehiculo_id, zona_id, comunas } = req.body;
    const comunasArray = normalizarArray(comunas);

    if (!nombre || !rut) {
      return res.status(400).send('Nombre y RUT son obligatorios');
    }

    const validacion = await validarComunasEnZona(zona_id, comunasArray);
    if (!validacion.valido) {
      return res.status(400).send(validacion.mensaje);
    }

    const vehiculoValido = await validarVehiculo(vehiculo_id);

    await client.query('BEGIN');

    const choferResult = await client.query(
      `
        INSERT INTO choferes (nombre, rut, telefono, direccion, estado, vehiculo_id, zona_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id
      `,
      [nombre, rut, telefono || null, direccion || null, estado || 'activo', vehiculoValido, zona_id]
    );

    await reemplazarComunasChofer(client, choferResult.rows[0].id, validacion.ids);
    await client.query('COMMIT');

    res.redirect('/choferes');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error guardando nuevo chofer:', error);
    res.status(500).send(error.message || 'Error interno al guardar chofer');
  } finally {
    client.release();
  }
};

exports.formularioEditarChofer = async (req, res) => {
  try {
    const { id } = req.params;

    const [choferResult, comunasAsignadasResult, zonas, vehiculosResult] = await Promise.all([
      pool.query('SELECT * FROM choferes WHERE id = $1', [id]),
      pool.query('SELECT comuna_id FROM chofer_comunas WHERE chofer_id = $1', [id]),
      cargarZonasConComunas(),
      pool.query('SELECT id, patente, marca, modelo FROM vehiculos ORDER BY patente')
    ]);

    if (choferResult.rows.length === 0) return res.status(404).send('Chofer no encontrado');

    const comunasAsignadas = comunasAsignadasResult.rows.map(row => row.comuna_id);
    res.render('editarChofer', {
      chofer: choferResult.rows[0],
      zonas,
      vehiculos: vehiculosResult.rows,
      comunasAsignadas
    });
  } catch (error) {
    console.error('Error cargando formulario editar chofer:', error);
    res.status(500).send('Error al cargar formulario de edicion');
  }
};

exports.guardarChoferEditado = async (req, res) => {
  const client = await pool.connect();

  try {
    const { id } = req.params;
    const { nombre, rut, telefono, direccion, estado, vehiculo_id, zona_id, comunas } = req.body;
    const comunasArray = normalizarArray(comunas);

    const validacion = await validarComunasEnZona(zona_id, comunasArray);
    if (!validacion.valido) {
      return res.status(400).send(validacion.mensaje);
    }

    const vehiculoValido = await validarVehiculo(vehiculo_id);

    await client.query('BEGIN');

    await client.query(
      `
        UPDATE choferes SET
          nombre = $1,
          rut = $2,
          telefono = $3,
          direccion = $4,
          estado = $5,
          vehiculo_id = $6,
          zona_id = $7
        WHERE id = $8
      `,
      [nombre, rut, telefono || null, direccion || null, estado || 'activo', vehiculoValido, zona_id, id]
    );

    await reemplazarComunasChofer(client, id, validacion.ids);
    await client.query('COMMIT');

    res.redirect('/choferes');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error actualizando chofer:', error);
    res.status(500).send(error.message || 'Error al actualizar chofer');
  } finally {
    client.release();
  }
};

exports.eliminarChofer = async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM choferes WHERE id = $1', [id]);
    res.redirect('/choferes');
  } catch (error) {
    console.error('Error eliminando chofer:', error);
    res.status(500).send('Error al eliminar chofer');
  }
};
