const pool = require('../db');

exports.verFlota = async (req, res) => {
  try {
    const resultado = await pool.query('SELECT * FROM vehiculos ORDER BY id');
    res.render('flota', { user: req.user, vehiculos: resultado.rows });
  } catch (error) {
    console.error('Error al cargar flota:', error);
    res.send('Error al cargar vehículos');
  }
};

exports.agregarVehiculo = async (req, res) => {
  const { patente, marca, modelo, anio } = req.body;
  try {
    await pool.query(
      'INSERT INTO vehiculos (patente, marca, modelo, anio) VALUES ($1, $2, $3, $4)',
      [patente, marca, modelo, anio]
    );
    res.redirect('/flota');
  } catch (error) {
    console.error('Error al agregar vehículo:', error);
    res.send('No se pudo agregar vehículo');
  }
};

exports.eliminarVehiculo = async (req, res) => {
  const id = req.params.id;
  try {
    await pool.query('DELETE FROM vehiculos WHERE id = $1', [id]);
    res.redirect('/flota');
  } catch (error) {
    console.error('Error al eliminar vehículo:', error);
    res.send('No se pudo eliminar vehículo');
  }
};

exports.mostrarEditar = async (req, res) => {
  const id = req.params.id;
  try {
    const result = await pool.query('SELECT * FROM vehiculos WHERE id = $1', [id]);
    const vehiculo = result.rows[0];
    res.render('editarVehiculo', { vehiculo }); // crearás esta vista más abajo
  } catch (error) {
    console.error('Error al obtener vehículo:', error);
    res.status(500).send('Error del servidor');
  }
};

exports.editarVehiculo = async (req, res) => {
  const id = req.params.id;
  const { patente, marca, modelo, anio } = req.body;

  try {
    await pool.query(
      'UPDATE vehiculos SET patente = $1, marca = $2, modelo = $3, anio = $4 WHERE id = $5',
      [patente, marca, modelo, anio, id]
    );
    res.redirect('/flota');
  } catch (error) {
    console.error('Error al editar vehículo:', error);
    res.status(500).send('Error del servidor');
  }
};

