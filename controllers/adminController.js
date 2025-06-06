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

    res.render('admin-planes', { planesContratados: rows, user: req.user });
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

// Mostrar formulario + rutas existentes
exports.verRutas = async (req, res) => {
  try {
    const zonas = await pool.query('SELECT * FROM zonas');
    const choferes = await pool.query('SELECT * FROM choferes');
    const vehiculos = await pool.query('SELECT * FROM vehiculos');
    const rutas = await pool.query(`
      SELECT rutas.*, zonas.nombre AS zona, choferes.nombre AS chofer, vehiculos.patente AS vehiculo
      FROM rutas
      JOIN zonas ON rutas.id_zona = zonas.id
      JOIN choferes ON rutas.id_chofer = choferes.id
      JOIN vehiculos ON rutas.id_vehiculo = vehiculos.id
      ORDER BY fecha_programada DESC
    `);

    res.render('admin-rutas', {
      zonas: zonas.rows,
      choferes: choferes.rows,
      vehiculos: vehiculos.rows,
      rutas: rutas.rows
    });
  } catch (error) {
    console.error('Error cargando rutas:', error);
    res.status(500).send('Error al cargar rutas');
  }
};

exports.crearRuta = async (req, res) => {
  const { id_zona, id_chofer, id_vehiculo, direccion_inicio, direccion_fin, fecha_programada } = req.body;

  try {
    await pool.query(
      `INSERT INTO rutas (id_zona, id_chofer, id_vehiculo, direccion_inicio, direccion_fin, fecha_programada)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [id_zona, id_chofer, id_vehiculo, direccion_inicio, direccion_fin, fecha_programada]
    );
    res.redirect('/admin/rutas');
  } catch (error) {
    console.error('Error al guardar ruta:', error);
    res.status(500).send('Error al guardar ruta');
  }
};
