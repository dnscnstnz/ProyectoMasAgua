const pool = require('../db');

exports.getDashboard = async (req, res) => {
  try {
    const usuarios = await pool.query('SELECT id, nombre, email, rol FROM usuarios ORDER BY id');
    res.render('admin', { user: req.user, usuarios: usuarios.rows });
  } catch (error) {
    console.error(error);
    res.send('Error cargando dashboard admin');
  }
};
