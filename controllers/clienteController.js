// controllers/clienteController.js
const pool = require('../db'); // Ajusta según tu configuración de base de datos

exports.getClienteDashboard = (req, res) => {
  res.render('cliente', { user: req.user });
};

exports.verPedidos = async (req, res) => {
  try {
    const pedidosQuery = `
      SELECT 
        p.id AS pedido_id,
        p.fecha,
        p.estado,
        pr.nombre AS producto_nombre,
        pp.cantidad
      FROM pedidos p
      JOIN pedido_producto pp ON p.id = pp.id_pedido
      JOIN productos pr ON pp.id_producto = pr.id
      WHERE p.id_usuario = $1
      ORDER BY p.fecha DESC
    `;

    const { rows } = await pool.query(pedidosQuery, [req.user.id]);

    const pedidosMap = new Map();

    rows.forEach(row => {
      const id = row.pedido_id;
      if (!pedidosMap.has(id)) {
        pedidosMap.set(id, {
          id,
          fecha: row.fecha,
          estado: row.estado,
          productos: []
        });
      }
      pedidosMap.get(id).productos.push({
        nombre: row.producto_nombre,
        cantidad: row.cantidad
      });
    });

    const pedidos = Array.from(pedidosMap.values());

    res.render('cliente/pedidos', { user: req.user, pedidos });
  } catch (error) {
    console.error(error);
    res.status(500).send('Error cargando tus pedidos');
  }
};
