const pool = require('../db');

// Dashboard principal del admin
exports.getDashboard = async (req, res) => {
  try {
    const [
      usuarios,
      totalUsuarios,
      pedidosPendientes,
      entregasAsignadas,
      planesPendientes,
      choferesActivos,
      vehiculos,
      pedidosRecientes,
      entregasRecientes
    ] = await Promise.all([
      pool.query('SELECT id, nombre, email, rol FROM usuarios ORDER BY id LIMIT 8'),
      pool.query('SELECT COUNT(*)::int AS total FROM usuarios'),
      pool.query("SELECT COUNT(*)::int AS total FROM pedidos WHERE LOWER(estado) = 'pendiente'"),
      pool.query("SELECT COUNT(*)::int AS total FROM entregas WHERE LOWER(estado) = 'asignado'"),
      pool.query("SELECT COUNT(*)::int AS total FROM planes_contratados WHERE LOWER(estado) = 'pendiente'"),
      pool.query("SELECT COUNT(*)::int AS total FROM choferes WHERE COALESCE(LOWER(estado), 'activo') <> 'inactivo'"),
      pool.query('SELECT COUNT(*)::int AS total FROM vehiculos'),
      pool.query(`
        SELECT
          p.id,
          p.fecha,
          p.estado,
          u.nombre AS cliente_nombre,
          c.nombre AS comuna_nombre
        FROM pedidos p
        JOIN usuarios u ON p.usuario_id = u.id
        LEFT JOIN comunas c ON p.comuna_id = c.id
        ORDER BY p.fecha DESC
        LIMIT 5
      `),
      pool.query(`
        SELECT
          e.id,
          e.fecha_programada,
          e.estado,
          p.id AS pedido_id,
          u.nombre AS cliente_nombre,
          ch.nombre AS chofer_nombre
        FROM entregas e
        JOIN pedidos p ON e.pedido_id = p.id
        JOIN usuarios u ON p.usuario_id = u.id
        JOIN choferes ch ON e.chofer_id = ch.id
        ORDER BY e.fecha_programada DESC NULLS LAST, e.id DESC
        LIMIT 5
      `)
    ]);

    res.render('admin', {
      user: req.user,
      usuarios: usuarios.rows,
      metricas: {
        usuarios: totalUsuarios.rows[0].total,
        pedidosPendientes: pedidosPendientes.rows[0].total,
        entregasAsignadas: entregasAsignadas.rows[0].total,
        planesPendientes: planesPendientes.rows[0].total,
        choferesActivos: choferesActivos.rows[0].total,
        vehiculos: vehiculos.rows[0].total
      },
      pedidosRecientes: pedidosRecientes.rows,
      entregasRecientes: entregasRecientes.rows
    });
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
      JOIN usuarios u ON p.usuario_id = u.id
      JOIN detalle_pedido pp ON p.id = pp.pedido_id
      JOIN productos pr ON pp.producto_id = pr.id
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
    res.render('admin-pedidos', { pedidos });
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


exports.getClientes = async (req, res) => {
  try {
    const clientesQuery = `
      SELECT
        u.id,
        u.nombre,
        u.email,
        u.tipo,
        u.rut,
        u.direccion,
        u.telefono,
        COUNT(DISTINCT p.id)::int AS pedidos,
        COUNT(DISTINCT pc.id)::int AS planes,
        COALESCE(SUM(DISTINCT pedido_totales.total_pedido), 0) AS total_pedidos,
        COALESCE(SUM(DISTINCT plan_totales.total_plan), 0) AS total_planes,
        MAX(GREATEST(COALESCE(p.fecha, 'epoch'), COALESCE(pc.fecha_contratacion, 'epoch'))) AS ultima_actividad
      FROM usuarios u
      LEFT JOIN pedidos p ON p.usuario_id = u.id
      LEFT JOIN planes_contratados pc ON pc.usuario_id = u.id
      LEFT JOIN (
        SELECT p.id, SUM(dp.cantidad * pr.precio) AS total_pedido
        FROM pedidos p
        JOIN detalle_pedido dp ON p.id = dp.pedido_id
        JOIN productos pr ON dp.producto_id = pr.id
        GROUP BY p.id
      ) pedido_totales ON pedido_totales.id = p.id
      LEFT JOIN (
        SELECT pc.id, pl.precio AS total_plan
        FROM planes_contratados pc
        JOIN planes pl ON pc.plan_id = pl.id
      ) plan_totales ON plan_totales.id = pc.id
      WHERE u.rol = 'cliente'
      GROUP BY u.id
      ORDER BY u.tipo DESC NULLS LAST, u.nombre NULLS LAST, u.email
    `;

    const resumenQuery = `
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE tipo = 'empresa')::int AS empresas,
        COUNT(*) FILTER (WHERE COALESCE(tipo, 'natural') <> 'empresa')::int AS naturales
      FROM usuarios
      WHERE rol = 'cliente'
    `;

    const [{ rows: clientes }, { rows: resumenRows }] = await Promise.all([
      pool.query(clientesQuery),
      pool.query(resumenQuery)
    ]);

    res.render('admin-clientes', {
      user: req.user,
      clientes,
      resumen: resumenRows[0]
    });
  } catch (error) {
    console.error('Error cargando clientes:', error);
    res.status(500).send('Error al cargar clientes');
  }
};

exports.getReportes = async (req, res) => {
  try {
    const [
      metricas,
      pedidosPorEstado,
      planesPorEstado,
      ingresosMensuales,
      topProductos,
      topClientes,
      entregasPorZona
    ] = await Promise.all([
      pool.query(`
        WITH pedido_totales AS (
          SELECT p.id, p.estado, p.fecha, SUM(dp.cantidad * pr.precio) AS total
          FROM pedidos p
          JOIN detalle_pedido dp ON p.id = dp.pedido_id
          JOIN productos pr ON dp.producto_id = pr.id
          GROUP BY p.id
        ), plan_totales AS (
          SELECT pc.id, pc.estado, pc.fecha_contratacion, pl.precio AS total
          FROM planes_contratados pc
          JOIN planes pl ON pc.plan_id = pl.id
        )
        SELECT
          (SELECT COUNT(*)::int FROM pedidos) AS pedidos_total,
          (SELECT COUNT(*)::int FROM pedidos WHERE LOWER(estado) = 'pendiente') AS pedidos_pendientes,
          (SELECT COUNT(*)::int FROM entregas) AS entregas_total,
          (SELECT COUNT(*)::int FROM planes_contratados) AS planes_total,
          COALESCE((SELECT SUM(total) FROM pedido_totales), 0) AS ingresos_pedidos,
          COALESCE((SELECT SUM(total) FROM pedido_totales WHERE LOWER(estado) <> 'cancelado'), 0) AS ingresos_pedidos_vigentes,
          COALESCE((SELECT SUM(total) FROM plan_totales), 0) AS ingresos_planes,
          COALESCE((SELECT SUM(total) FROM plan_totales WHERE LOWER(estado) IN ('aprobado', 'activo', 'contratado')), 0) AS ingresos_planes_confirmados
      `),
      pool.query(`
        SELECT estado, COUNT(*)::int AS total
        FROM pedidos
        GROUP BY estado
        ORDER BY total DESC, estado
      `),
      pool.query(`
        SELECT estado, COUNT(*)::int AS total
        FROM planes_contratados
        GROUP BY estado
        ORDER BY total DESC, estado
      `),
      pool.query(`
        SELECT
          TO_CHAR(DATE_TRUNC('month', p.fecha), 'YYYY-MM') AS mes,
          SUM(dp.cantidad * pr.precio) AS ingresos
        FROM pedidos p
        JOIN detalle_pedido dp ON p.id = dp.pedido_id
        JOIN productos pr ON dp.producto_id = pr.id
        GROUP BY DATE_TRUNC('month', p.fecha)
        ORDER BY mes DESC
        LIMIT 6
      `),
      pool.query(`
        SELECT pr.nombre, SUM(dp.cantidad)::int AS unidades, SUM(dp.cantidad * pr.precio) AS ingresos
        FROM detalle_pedido dp
        JOIN productos pr ON dp.producto_id = pr.id
        GROUP BY pr.id, pr.nombre
        ORDER BY unidades DESC, ingresos DESC
        LIMIT 8
      `),
      pool.query(`
        SELECT u.nombre, u.email, COUNT(DISTINCT p.id)::int AS pedidos, COALESCE(SUM(dp.cantidad * pr.precio), 0) AS ingresos
        FROM usuarios u
        LEFT JOIN pedidos p ON p.usuario_id = u.id
        LEFT JOIN detalle_pedido dp ON p.id = dp.pedido_id
        LEFT JOIN productos pr ON dp.producto_id = pr.id
        WHERE u.rol = 'cliente'
        GROUP BY u.id
        ORDER BY ingresos DESC, pedidos DESC
        LIMIT 8
      `),
      pool.query(`
        SELECT COALESCE(z.nombre, 'Sin zona') AS zona, COUNT(e.id)::int AS entregas
        FROM entregas e
        JOIN choferes ch ON e.chofer_id = ch.id
        LEFT JOIN zonas z ON ch.zona_id = z.id
        GROUP BY z.nombre
        ORDER BY entregas DESC, zona
      `)
    ]);

    res.render('admin-reportes', {
      user: req.user,
      metricas: metricas.rows[0],
      pedidosPorEstado: pedidosPorEstado.rows,
      planesPorEstado: planesPorEstado.rows,
      ingresosMensuales: ingresosMensuales.rows,
      topProductos: topProductos.rows,
      topClientes: topClientes.rows,
      entregasPorZona: entregasPorZona.rows
    });
  } catch (error) {
    console.error('Error cargando reportes:', error);
    res.status(500).send('Error al cargar reportes');
  }
};

// === Entregas ===

exports.verEntregas = async (req, res) => {
  try {
    const normalizarJson = valor => {
      if (Array.isArray(valor)) return valor;
      if (!valor) return [];
      try {
        return JSON.parse(valor);
      } catch (error) {
        return [];
      }
    };

    const pedidosQuery = `
      SELECT
        p.id AS pedido_id,
        p.fecha,
        p.estado,
        u.nombre AS cliente_nombre,
        u.telefono,
        p.direccion_entrega,
        c.id AS comuna_id,
        c.nombre AS comuna_nombre,
        COALESCE(
          json_agg(
            DISTINCT jsonb_build_object('nombre', pr.nombre, 'cantidad', dp.cantidad)
          ) FILTER (WHERE pr.id IS NOT NULL),
          '[]'
        ) AS productos,
        COALESCE(
          json_agg(
            DISTINCT jsonb_build_object('id', ch.id, 'nombre', ch.nombre, 'telefono', ch.telefono, 'zona', z.nombre)
          ) FILTER (WHERE ch.id IS NOT NULL),
          '[]'
        ) AS choferes_disponibles
      FROM pedidos p
      JOIN usuarios u ON p.usuario_id = u.id
      LEFT JOIN detalle_pedido dp ON p.id = dp.pedido_id
      LEFT JOIN productos pr ON dp.producto_id = pr.id
      LEFT JOIN comunas c ON p.comuna_id = c.id
      LEFT JOIN chofer_comunas cc ON cc.comuna_id = p.comuna_id
      LEFT JOIN choferes ch ON ch.id = cc.chofer_id
        AND EXISTS (
          SELECT 1
          FROM zona_comunas zc
          WHERE zc.zona_id = ch.zona_id AND zc.comuna_id = p.comuna_id
        )
      LEFT JOIN zonas z ON ch.zona_id = z.id
      WHERE LOWER(p.estado) = 'pendiente'
      GROUP BY p.id, u.nombre, u.telefono, p.direccion_entrega, c.id, c.nombre
      ORDER BY c.nombre NULLS LAST, p.fecha ASC
    `;

    const entregasQuery = `
      SELECT
        e.id,
        e.fecha_programada,
        e.estado,
        p.id AS pedido_id,
        p.estado AS pedido_estado,
        u.nombre AS cliente_nombre,
        p.direccion_entrega,
        c.nombre AS comuna_nombre,
        ch.nombre AS chofer_nombre,
        z.nombre AS chofer_zona_nombre,
        COALESCE(
          json_agg(
            DISTINCT jsonb_build_object('nombre', pr.nombre, 'cantidad', dp.cantidad)
          ) FILTER (WHERE pr.id IS NOT NULL),
          '[]'
        ) AS productos
      FROM entregas e
      JOIN pedidos p ON e.pedido_id = p.id
      JOIN usuarios u ON p.usuario_id = u.id
      JOIN choferes ch ON e.chofer_id = ch.id
      LEFT JOIN zonas z ON ch.zona_id = z.id
      LEFT JOIN detalle_pedido dp ON p.id = dp.pedido_id
      LEFT JOIN productos pr ON dp.producto_id = pr.id
      LEFT JOIN comunas c ON p.comuna_id = c.id
      GROUP BY e.id, p.id, u.nombre, p.direccion_entrega, c.nombre, ch.nombre, z.nombre
      ORDER BY e.fecha_programada DESC NULLS LAST, e.id DESC
    `;

    const { rows: pedidosPendientesRows } = await pool.query(pedidosQuery);
    const { rows: entregasRows } = await pool.query(entregasQuery);
    const pedidosPendientes = pedidosPendientesRows.map(pedido => ({
      ...pedido,
      productos: normalizarJson(pedido.productos),
      choferes_disponibles: normalizarJson(pedido.choferes_disponibles)
    }));
    const entregas = entregasRows.map(entrega => ({
      ...entrega,
      productos: normalizarJson(entrega.productos)
    }));
    const pedidosPorComuna = new Map();

    pedidosPendientes.forEach(pedido => {
      const comuna = pedido.comuna_nombre || 'Sin comuna detectada';
      if (!pedidosPorComuna.has(comuna)) {
        pedidosPorComuna.set(comuna, []);
      }
      pedidosPorComuna.get(comuna).push(pedido);
    });

    res.render('admin-rutas', {
      pedidosPorComuna: Array.from(pedidosPorComuna, ([comuna, pedidos]) => ({ comuna, pedidos })),
      entregas
    });
  } catch (error) {
    console.error('Error cargando entregas:', error);
    res.status(500).send('Error al cargar entregas');
  }
};

exports.asignarEntrega = async (req, res) => {
  const { pedido_id, chofer_id, fecha_programada } = req.body;
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const pedidoResult = await client.query(
      `
        SELECT
          p.id,
          p.estado,
          p.comuna_id,
          c.nombre AS comuna_nombre
        FROM pedidos p
        LEFT JOIN comunas c ON p.comuna_id = c.id
        WHERE p.id = $1
        FOR UPDATE OF p
      `,
      [pedido_id]
    );

    if (pedidoResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).send('Pedido no encontrado');
    }

    const pedido = pedidoResult.rows[0];
    if (String(pedido.estado).toLowerCase() !== 'pendiente') {
      await client.query('ROLLBACK');
      return res.status(400).send('Solo se pueden asignar pedidos pendientes');
    }

    if (!pedido.comuna_id) {
      await client.query('ROLLBACK');
      return res.status(400).send('El pedido no tiene comuna de entrega asignada');
    }

    const choferResult = await client.query(
      `
        SELECT ch.id
        FROM choferes ch
        JOIN chofer_comunas cc ON ch.id = cc.chofer_id
        JOIN zona_comunas zc ON zc.zona_id = ch.zona_id AND zc.comuna_id = cc.comuna_id
        WHERE ch.id = $1 AND cc.comuna_id = $2
      `,
      [chofer_id, pedido.comuna_id]
    );

    if (choferResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).send('El chofer seleccionado no cubre la comuna del pedido');
    }

    await client.query(
      `INSERT INTO entregas (pedido_id, chofer_id, fecha_programada, estado)
       VALUES ($1, $2, $3, $4)`,
      [pedido_id, chofer_id, fecha_programada || null, 'asignado']
    );

    await client.query('UPDATE pedidos SET estado = $1 WHERE id = $2', ['asignado', pedido_id]);
    await client.query('COMMIT');

    res.redirect('/admin/rutas');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error asignando entrega:', error);
    res.status(500).send('Error al asignar entrega');
  } finally {
    client.release();
  }
};






