const pool = require('../db');

exports.getClienteDashboard = (req, res) => {
  res.render('cliente', { user: req.user });
};

exports.getPedidoForm = async (req, res) => {
  try {
    const { rows: productos } = await pool.query('SELECT * FROM productos');
    res.render('pedido', { user: req.user, productos });
  } catch (error) {
    console.error(error);
    res.status(500).send('Error al cargar productos');
  }
};

exports.crearPedido = async (req, res) => {
  try {
    const productosSeleccionados = [];
    for (const key in req.body) {
      if (key.startsWith('cantidad_')) {
        const idProducto = key.split('_')[1];
        const cantidad = parseInt(req.body[key], 10);
        if (cantidad > 0) {
          productosSeleccionados.push({ idProducto, cantidad });
        }
      }
    }

    if (productosSeleccionados.length === 0) {
      return res.redirect('/cliente/pedido');
    }

    const resultado = await pool.query(
      'INSERT INTO pedidos (id_usuario, fecha, estado) VALUES ($1, NOW(), $2) RETURNING id',
      [req.user.id, 'pendiente']
    );
    const idPedido = resultado.rows[0].id;

    for (const prod of productosSeleccionados) {
      await pool.query(
        'INSERT INTO detalle_pedido (pedido_id, producto_id, cantidad) VALUES ($1, $2, $3)',
        [idPedido, prod.idProducto, prod.cantidad]
      );
    }

    res.redirect('/cliente/mis-pedidos');
  } catch (error) {
    console.error(error);
    res.status(500).send('Error al crear pedido');
  }
};


exports.verPedidos = async (req, res) => {
  try {
    const pedidosQuery = `
      SELECT 
        p.id AS pedido_id,
        p.fecha,
        p.estado,
        pr.nombre AS producto_nombre,
        dp.cantidad
      FROM pedidos p
      JOIN detalle_pedido dp ON p.id = dp.pedido_id
      JOIN productos pr ON dp.producto_id = pr.id
      WHERE p.usuario_id = $1
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

    res.render('mis-pedidos', { user: req.user, pedidos });
  } catch (error) {
    console.error('ERROR al cargar pedidos:', error);
    res.status(500).send('Error cargando tus pedidos');
  }
};

// Mostrar perfil del usuario
exports.verPerfil = async (req, res) => {
  try {
    const { id } = req.user; // id del usuario logueado
    const query = 'SELECT id, nombre, rut, direccion, telefono, email FROM usuarios WHERE id = $1';
    const { rows } = await pool.query(query, [id]);
    
    if (rows.length === 0) {
      return res.status(404).send('Usuario no encontrado');
    }

    res.render('editarCliente', { user: rows[0], query: req.query || {} });
  } catch (error) {
    console.error('Error al cargar perfil:', error);
    res.status(500).send('Error al cargar perfil');
  }
};

// Actualizar perfil
exports.actualizarPerfil = async (req, res) => {
  try {
    const { id } = req.user;
    const { nombre, rut, direccion, telefono, email } = req.body;

    // Validación simple (puedes ampliar)
    if (!nombre || !email) {
      return res.status(400).send('Nombre y email son obligatorios');
    }

    const updateQuery = `
      UPDATE usuarios SET nombre = $1, rut = $2, direccion = $3, telefono = $4, email = $5
      WHERE id = $6
    `;
    await pool.query(updateQuery, [nombre, rut, direccion, telefono, email, id]);

    // Redirigir con query para mostrar mensaje éxito
    res.redirect('/cliente/perfil?success=true');
  } catch (error) {
    console.error('Error al actualizar perfil:', error);
    res.status(500).send('Error al actualizar perfil');
  }
};

