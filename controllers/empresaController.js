// controllers/empresaController.js
const pool = require('../db');

exports.getEmpresaDashboard = (req, res) => {
  res.render('empresa', { user: req.user });
};

exports.mostrarPlanes = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM planes WHERE activo = true');
    res.render('planes', { planes: result.rows, user: req.user });
  } catch (error) {
    console.error('Error mostrando planes:', error);
    res.send('Error cargando los planes');
  }
};

exports.contratarPlan = async (req, res) => {
  const { plan_id } = req.body;  
  try {
    const planResult = await pool.query('SELECT * FROM planes WHERE id = $1', [plan_id]);
    if (planResult.rows.length === 0) {
      return res.send('El plan seleccionado no existe');
    }

    await pool.query(
      'INSERT INTO planes_contratados (usuario_id, plan_id, estado, fecha_contratacion) VALUES ($1, $2, $3, CURRENT_TIMESTAMP) RETURNING id',
      [req.user.id, plan_id, 'pendiente']
    );

    res.redirect('/empresa/mis-planes');
  } catch (error) {
    console.error('Error contratando plan:', error);
    res.send('Error al contratar el plan');
  }
};

exports.misPlanes = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT p.nombre, p.duracion_meses, 
              COALESCE(p.precio, 0) AS precio, 
              COALESCE(pc.fecha_contratacion, CURRENT_TIMESTAMP) AS fecha_contratacion, 
              pc.estado 
       FROM planes_contratados pc 
       JOIN planes p ON pc.plan_id = p.id 
       WHERE pc.usuario_id = $1`,
      [req.user.id]
    );

    res.render('mis-planes', { planes: result.rows, user: req.user });
  } catch (error) {
    console.error('Error mostrando mis planes:', error);
    res.send('Error cargando tus planes');
  }
};
