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

exports.getPedidos = async (req, res) => {
  try {
    const pedidosQuery = `
      SELECT 
        p.id AS pedido_id,
        u.nombre AS cliente_nombre,
        p.fecha,
        p.estado,
        pr.nombre AS producto_nombre,
        pp.cantidad
      FROM pedidos p
      JOIN usuarios u ON p.id_usuario = u.id
      JOIN pedido_producto pp ON p.id = pp.id_pedido
      JOIN productos pr ON pp.id_producto = pr.id
      ORDER BY p.id DESC
    `;

    const { rows } = await pool.query(pedidosQuery);

    // Agrupar productos por pedido
    const pedidosMap = new Map();

    rows.forEach(row => {
      const id = row.pedido_id;
      if (!pedidosMap.has(id)) {
        pedidosMap.set(id, {
          id,
          cliente: row.cliente_nombre,
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

    res.render('admin/pedidos', { pedidos });
  } catch (error) {
    console.error(error);
    res.status(500).send('Error al cargar pedidos');
  }
};

exports.cambiarEstadoPedido = async (req, res) => {
  const { id } = req.params;
  const { estado } = req.body;

  try {
    await pool.query('UPDATE pedidos SET estado = $1 WHERE id = $2', [estado, id]);
    res.redirect('/admin/pedidos');
  } catch (error) {
    console.error(error);
    res.status(500).send('Error actualizando estado del pedido');
  }
};
