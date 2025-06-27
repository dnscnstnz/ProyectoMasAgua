const pool = require('../db');

// Dashboard principal del admin
exports.getDashboard = async (req, res) => {
  try {
    const usuarios = await pool.query('SELECT id, nombre, email, rol FROM usuarios ORDER BY id');
    res.render('admin', { user: req.user, usuarios: usuarios.rows });
  } catch (error) {
    console.error(error);
    res.send('Error cargando dashboard admin');
  }
};

// Pedidos
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

// Cambiar estado pedido
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

// Planes contratados
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

// === Rutas por comuna ===

// Mostrar formulario + rutas existentes
exports.verRutas = async (req, res) => {
  try {
    const comunasResult = await pool.query('SELECT * FROM comunas ORDER BY nombre');
    const comunas = comunasResult.rows;

    const choferesResult = await pool.query(`
      SELECT ch.*, 
        STRING_AGG(c.nombre, ', ') AS comunas_asignadas
      FROM choferes ch
      LEFT JOIN chofer_comunas cc ON ch.id = cc.chofer_id
      LEFT JOIN comunas c ON cc.comuna_id = c.id
      GROUP BY ch.id
      ORDER BY ch.nombre
    `);
    const choferes = choferesResult.rows;

    const vehiculosResult = await pool.query('SELECT * FROM vehiculos ORDER BY patente');
    const vehiculos = vehiculosResult.rows;

    const rutasResult = await pool.query(`
      SELECT 
        r.id,
        ch.nombre AS chofer,
        v.patente AS vehiculo,
        r.direccion_inicio,
        r.direccion_fin,
        r.fecha_programada
      FROM rutas r
      LEFT JOIN choferes ch ON r.id_chofer = ch.id
      LEFT JOIN vehiculos v ON r.id_vehiculo = v.id
      ORDER BY r.fecha_programada DESC
    `);
    const rutas = rutasResult.rows;

    const comunasRutaResult = await pool.query(`
      SELECT ruta_id, STRING_AGG(c.nombre, ', ') AS comunas
      FROM comunas_ruta cr
      JOIN comunas c ON cr.comuna_id = c.id
      GROUP BY ruta_id
    `);
    const comunasPorRuta = {};
    comunasRutaResult.rows.forEach(row => {
      comunasPorRuta[row.ruta_id] = row.comunas;
    });

    rutas.forEach(ruta => {
      ruta.comunas_asignadas = comunasPorRuta[ruta.id] || '-';
    });

    res.render('admin-rutas', { comunas, choferes, vehiculos, rutas });
  } catch (error) {
    console.error('Error cargando rutas:', error);
    res.status(500).send('Error al cargar rutas');
  }
};

// Crear ruta nueva
exports.crearRuta = async (req, res) => {
  try {
    const { id_chofer, id_vehiculo, direccion_inicio, direccion_fin, fecha_programada, comunas } = req.body;

    const rutaResult = await pool.query(
      `INSERT INTO rutas (id_chofer, id_vehiculo, direccion_inicio, direccion_fin, fecha_programada)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [id_chofer, id_vehiculo, direccion_inicio, direccion_fin, fecha_programada]
    );

    const rutaId = rutaResult.rows[0].id;

    if (comunas && comunas.length > 0) {
      const comunasArray = Array.isArray(comunas) ? comunas : [comunas];
      const values = comunasArray.map((_, i) => `($1, $${i + 2})`).join(',');
      await pool.query(
        `INSERT INTO comunas_ruta (ruta_id, comuna_id) VALUES ${values}`,
        [rutaId, ...comunasArray]
      );
    }

    res.redirect('/admin/rutas');
  } catch (error) {
    console.error('Error al guardar ruta:', error);
    res.status(500).send('Error al guardar ruta');
  }
};
