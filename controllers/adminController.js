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

exports.getPlanesContratados = async (req, res) => {
  try {
    const planesContratadosQuery = `
      SELECT 
        pc.id,
        u.nombre AS cliente_nombre,
        p.nombre AS plan_nombre,
        pc.estado,
        pc.fecha_contratacion
      FROM planes_contratados pc
      JOIN usuarios u ON pc.usuario_id = u.id
      JOIN planes p ON pc.plan_id = p.id
      ORDER BY pc.id DESC
    `;

    const { rows } = await pool.query(planesContratadosQuery);

    res.render('admin-planes', { planesContratados: rows, user: req.user }); // <-- ojo al nombre y datos
  } catch (error) {
    console.error(error);
    res.status(500).send('Error al cargar planes contratados');
  }
};


exports.cambiarEstadoPlanContratado = async (req, res) => {
  const { id } = req.params;
  const { estado } = req.body;

  try {
    await pool.query('UPDATE planes_contratados SET estado = $1 WHERE id = $2', [estado, id]);
    res.redirect('/admin/planes');
  } catch (error) {
    console.error(error);
    res.status(500).send('Error actualizando estado del plan contratado');
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