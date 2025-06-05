const pool = require('../db'); // Ajusta según tu configuración

exports.listarChoferes = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM choferes ORDER BY nombre');
    res.render('choferes', { choferes: result.rows });
  } catch (error) {
    console.error('Error al listar choferes:', error);
    res.status(500).send('Error interno');
  }
};

exports.agregarChofer = async (req, res) => {
  const { nombre, rut, telefono } = req.body;
  try {
    await pool.query(
      'INSERT INTO choferes (nombre, rut, telefono) VALUES ($1, $2, $3)',
      [nombre, rut, telefono]
    );
    res.redirect('/choferes');
  } catch (error) {
    console.error('Error al agregar chofer:', error);
    res.status(500).send('Error interno');
  }
};

exports.eliminarChofer = async (req, res) => {
  const id = req.params.id;
  try {
    await pool.query('DELETE FROM choferes WHERE id = $1', [id]);
    res.redirect('/choferes');
  } catch (error) {
    console.error('Error al eliminar chofer:', error);
    res.status(500).send('Error interno');
  }
};

exports.obtenerChoferPorId = async (req, res) => {
  const id = req.params.id;
  try {
    const result = await pool.query('SELECT * FROM choferes WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).send('Chofer no encontrado');
    }
    res.render('editarChofer', { chofer: result.rows[0] });
  } catch (error) {
    console.error('Error al obtener chofer:', error);
    res.status(500).send('Error interno');
  }
};

exports.actualizarChofer = async (req, res) => {
  const id = req.params.id;
  const { nombre, rut, telefono } = req.body;
  try {
    await pool.query(
      'UPDATE choferes SET nombre = $1, rut = $2, telefono = $3 WHERE id = $4',
      [nombre, rut, telefono, id]
    );
    res.redirect('/choferes');
  } catch (error) {
    console.error('Error al actualizar chofer:', error);
    res.status(500).send('Error interno');
  }
};
