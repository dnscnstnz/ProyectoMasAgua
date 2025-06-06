const pool = require('../db'); // Asumiendo que aquí está la conexión PostgreSQL

exports.listarChoferes = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM choferes ORDER BY nombre');
    res.render('choferes', { choferes: result.rows });
  } catch (error) {
    console.error('Error listando choferes:', error);
    res.status(500).send('Error al listar choferes');
  }
};

exports.formularioNuevoChofer = (req, res) => {
  res.render('nuevoChofer'); // Vista para formulario nuevo chofer
};



exports.guardarNuevoChofer = async (req, res) => {
  try {
    const {
      nombre, rut, telefono, direccion, comuna,
      zona_id, estado, vehiculo_id
    } = req.body;

    if (!nombre || !rut) {
      return res.status(400).send('Nombre y RUT son obligatorios');
    }

    let zonaValida = null;
    if (zona_id) {
      const zonaResult = await pool.query('SELECT id FROM zonas WHERE id = $1', [zona_id]);
      if (zonaResult.rowCount === 0) {
        return res.status(400).send(`Zona con ID ${zona_id} no existe`);
      }
      zonaValida = zona_id;
    }

    let vehiculoValido = null;
    if (vehiculo_id) {
      const vehiculoResult = await pool.query('SELECT id FROM vehiculos WHERE id = $1', [vehiculo_id]);
      if (vehiculoResult.rowCount === 0) {
        return res.status(400).send(`Vehículo con ID ${vehiculo_id} no existe`);
      }
      vehiculoValido = vehiculo_id;
    }

    const insertQuery = `
      INSERT INTO choferes (nombre, rut, telefono, direccion, comuna, zona_id, estado, vehiculo_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id
    `;
    const values = [
      nombre, rut, telefono || null, direccion || null, comuna || null,
      zonaValida, estado || null, vehiculoValido
    ];

    await pool.query(insertQuery, values);

    res.redirect('/choferes');
  } catch (error) {
    console.error('Error guardando nuevo chofer:', error);
    res.status(500).send('Error interno al guardar chofer');
  }
};



exports.formularioEditarChofer = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM choferes WHERE id = $1', [id]);
    if (result.rows.length === 0) return res.status(404).send('Chofer no encontrado');
    res.render('editarChofer', { chofer: result.rows[0] });
  } catch (error) {
    console.error('Error obteniendo chofer para editar:', error);
    res.status(500).send('Error al obtener chofer');
  }
};

exports.guardarChoferEditado = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, rut, telefono, direccion, comuna, zona_id, estado, vehiculo_id } = req.body;
    await pool.query(
      `UPDATE choferes SET 
        nombre=$1, rut=$2, telefono=$3, direccion=$4, comuna=$5, zona_id=$6, estado=$7, vehiculo_id=$8 
       WHERE id=$9`,
      [nombre, rut, telefono, direccion, comuna, zona_id || null, estado, vehiculo_id || null, id]
    );
    res.redirect('/choferes');
  } catch (error) {
    console.error('Error actualizando chofer:', error);
    res.status(500).send('Error al actualizar chofer');
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
