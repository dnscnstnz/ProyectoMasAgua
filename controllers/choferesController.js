const pool = require('../db');

// Listar choferes con comunas asignadas como texto concatenado
exports.listarChoferes = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT ch.*, 
        STRING_AGG(c.nombre, ', ') AS comunas_asignadas
      FROM choferes ch
      LEFT JOIN chofer_comunas cc ON ch.id = cc.chofer_id
      LEFT JOIN comunas c ON cc.comuna_id = c.id
      GROUP BY ch.id
      ORDER BY ch.nombre
    `);
    res.render('choferes', { choferes: result.rows });
  } catch (error) {
    console.error('Error listando choferes:', error);
    res.status(500).send('Error al listar choferes');
  }
};

// Mostrar formulario para nuevo chofer
exports.formularioNuevoChofer = async (req, res) => {
  try {
    const comunasResult = await pool.query('SELECT * FROM comunas ORDER BY nombre');
    res.render('nuevoChofer', { comunas: comunasResult.rows });
  } catch (error) {
    console.error('Error cargando formulario nuevo chofer:', error);
    res.status(500).send('Error al cargar formulario');
  }
};

// Guardar nuevo chofer con comunas múltiples
exports.guardarNuevoChofer = async (req, res) => {
  try {
    const {
      nombre, rut, telefono, direccion, estado, vehiculo_id, comunas
    } = req.body;

    if (!nombre || !rut) {
      return res.status(400).send('Nombre y RUT son obligatorios');
    }

    // Validar vehiculo si viene
    let vehiculoValido = null;
    if (vehiculo_id) {
      const vehiculoResult = await pool.query('SELECT id FROM vehiculos WHERE id = $1', [vehiculo_id]);
      if (vehiculoResult.rowCount === 0) {
        return res.status(400).send(`Vehículo con ID ${vehiculo_id} no existe`);
      }
      vehiculoValido = vehiculo_id;
    }

    // Insertar chofer sin comuna ni zona
    const insertChoferQuery = `
      INSERT INTO choferes (nombre, rut, telefono, direccion, estado, vehiculo_id)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id
    `;
    const values = [nombre, rut, telefono || null, direccion || null, estado || null, vehiculoValido];
    const choferResult = await pool.query(insertChoferQuery, values);
    const choferId = choferResult.rows[0].id;

    // Insertar comunas asignadas (si vienen)
    if (comunas && comunas.length > 0) {
      const comunasArray = Array.isArray(comunas) ? comunas : [comunas];

      // Validar comunas
      const validComunasResult = await pool.query(
        `SELECT id FROM comunas WHERE id = ANY($1::int[])`,
        [comunasArray]
      );
      if (validComunasResult.rowCount !== comunasArray.length) {
        return res.status(400).send('Una o más comunas asignadas no son válidas');
      }

      const insertComunasValues = comunasArray.map((_, i) => `($1, $${i + 2})`).join(',');
      await pool.query(
        `INSERT INTO chofer_comunas (chofer_id, comuna_id) VALUES ${insertComunasValues}`,
        [choferId, ...comunasArray]
      );
    }

    res.redirect('/choferes');
  } catch (error) {
    console.error('Error guardando nuevo chofer:', error);
    res.status(500).send('Error interno al guardar chofer');
  }
};

// Mostrar formulario para editar chofer con comunas asignadas
exports.formularioEditarChofer = async (req, res) => {
  try {
    const { id } = req.params;

    // Obtener chofer
    const choferResult = await pool.query('SELECT * FROM choferes WHERE id = $1', [id]);
    if (choferResult.rows.length === 0) return res.status(404).send('Chofer no encontrado');
    const chofer = choferResult.rows[0];

    // Obtener comunas asignadas al chofer
    const comunasAsignadasResult = await pool.query(
      'SELECT comuna_id FROM chofer_comunas WHERE chofer_id = $1',
      [id]
    );
    const comunasAsignadas = comunasAsignadasResult.rows.map(row => row.comuna_id);

    // Obtener todas las comunas para el select
    const comunasResult = await pool.query('SELECT * FROM comunas ORDER BY nombre');
    const comunas = comunasResult.rows;

    res.render('editarChofer', { chofer, comunas, comunasAsignadas });
  } catch (error) {
    console.error('Error cargando formulario editar chofer:', error);
    res.status(500).send('Error al cargar formulario de edición');
  }
};

// Guardar cambios en chofer con actualización de comunas
exports.guardarChoferEditado = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, rut, telefono, direccion, estado, vehiculo_id, comunas } = req.body;

    // Validar vehiculo si viene
    let vehiculoValido = null;
    if (vehiculo_id) {
      const vehiculoResult = await pool.query('SELECT id FROM vehiculos WHERE id = $1', [vehiculo_id]);
      if (vehiculoResult.rowCount === 0) {
        return res.status(400).send(`Vehículo con ID ${vehiculo_id} no existe`);
      }
      vehiculoValido = vehiculo_id;
    }

    await pool.query(
      `UPDATE choferes SET
        nombre=$1, rut=$2, telefono=$3, direccion=$4, estado=$5, vehiculo_id=$6
       WHERE id=$7`,
      [nombre, rut, telefono || null, direccion || null, estado || null, vehiculoValido, id]
    );

    // Actualizar comunas asignadas
    await pool.query('DELETE FROM chofer_comunas WHERE chofer_id = $1', [id]);

    if (comunas && comunas.length > 0) {
      const comunasArray = Array.isArray(comunas) ? comunas : [comunas];

      // Validar comunas
      const validComunasResult = await pool.query(
        `SELECT id FROM comunas WHERE id = ANY($1::int[])`,
        [comunasArray]
      );
      if (validComunasResult.rowCount !== comunasArray.length) {
        return res.status(400).send('Una o más comunas asignadas no son válidas');
      }

      const insertComunasValues = comunasArray.map((_, i) => `($1, $${i + 2})`).join(',');
      await pool.query(
        `INSERT INTO chofer_comunas (chofer_id, comuna_id) VALUES ${insertComunasValues}`,
        [id, ...comunasArray]
      );
    }

    res.redirect('/choferes');
  } catch (error) {
    console.error('Error actualizando chofer:', error);
    res.status(500).send('Error al actualizar chofer');
  }
};

// Eliminar chofer
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
