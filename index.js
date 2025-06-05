const express = require('express');
const path = require('path');
const session = require('express-session');
const bcrypt = require('bcrypt');
const pool = require('./db');

const adminRoutes = require('./routes/admin');
const clienteRoutes = require('./routes/cliente');
const empresaRoutes = require('./routes/empresa');
const flotaRoutes = require('./routes/flota');
const choferesRouter = require('./routes/choferes');

const app = express();
const PORT = 3000;

// Motor de vistas
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middlewares base
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
  secret: 'miSecretoSuperSecreto123!',
  resave: false,
  saveUninitialized: false,
}));

// Middleware para cargar usuario desde la sesión
app.use(async (req, res, next) => {
  if (req.session.userId) {
    try {
      const result = await pool.query('SELECT * FROM usuarios WHERE id = $1', [req.session.userId]);
      req.user = result.rows[0];
    } catch (error) {
      console.error('Error al cargar usuario:', error);
    }
  }
  next();
});

// Middleware para validar rol cliente
function isCliente(req, res, next) {
  if (req.user && req.user.rol === 'cliente') return next();
  return res.redirect('/login.html');
}

// Middleware para validar rol admin
function isAdmin(req, res, next) {
  if (req.user && req.user.rol === 'admin') return next();
  return res.redirect('/login.html');
}

// --- Rutas registro, login, logout ---

app.get('/register', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'register.html'));
});

app.post('/register', async (req, res) => {
  const { email, password, tipo, nombre, rut, direccion, telefono } = req.body;
  try {
    const existe = await pool.query('SELECT * FROM usuarios WHERE email = $1', [email]);
    if (existe.rows.length > 0) return res.send('Usuario ya existe.');

    const hashedPassword = await bcrypt.hash(password, 10);

    await pool.query(
      `INSERT INTO usuarios (email, password, rol, tipo, nombre, rut, direccion, telefono)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        email,
        hashedPassword,
        email === 'deniseconstanza@outlook.com' ? 'admin' : 'cliente',
        tipo,
        email === 'deniseconstanza@outlook.com' ? 'Denise Ulloa' : nombre,
        rut,
        direccion,
        telefono
      ]
    );

    console.log('Usuario registrado:', email);
    res.redirect('/gracias.html');
  } catch (error) {
    console.error('Error en registro:', error);
    res.send('Error al registrar usuario.');
  }
});

app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const result = await pool.query('SELECT * FROM usuarios WHERE email = $1', [email]);
    const usuario = result.rows[0];
    if (!usuario) return res.send('Usuario no encontrado.');
    const passOk = await bcrypt.compare(password, usuario.password);
    if (!passOk) return res.send('Contraseña incorrecta.');

    req.session.userId = usuario.id;

    if (usuario.rol === 'admin') {
      return res.redirect('/admin');
    } else if (usuario.tipo === 'empresa') {
      return res.redirect('/empresa');
    } else {
      return res.redirect('/cliente');
    }
  } catch (error) {
    console.error('Error en login:', error);
    res.send('Error al iniciar sesión.');
  }
});

app.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/login.html');
  });
});

// --- Rutas pedidos para cliente ---

// Mostrar página para hacer pedido con productos
app.get('/cliente/pedido', isCliente, async (req, res) => {
  try {
    const productos = await pool.query('SELECT * FROM productos');
    res.render('pedido', { user: req.user, productos: productos.rows });
  } catch (error) {
    console.error('Error cargando productos:', error);
    res.send('Error cargando productos');
  }
});

// Mostrar el último pedido con productos y cantidades para el cliente
app.get('/cliente/pedido/detalle', isCliente, async (req, res) => {
  try {
    // Obtener el último pedido del usuario
    const pedidoResult = await pool.query(
      `SELECT id, estado, fecha 
       FROM pedidos 
       WHERE usuario_id = $1 
       ORDER BY fecha DESC 
       LIMIT 1`,
      [req.user.id]
    );

    if (pedidoResult.rows.length === 0) {
      // No hay pedidos para mostrar
      return res.render('pedido-detalle', { pedido: null, productos: [] });
    }

    const pedido = pedidoResult.rows[0];

    // Obtener productos con cantidad para ese pedido
    const productosResult = await pool.query(
      `SELECT p.nombre, p.descripcion, p.precio, p.imagen, dp.cantidad
       FROM detalle_pedido dp
       JOIN productos p ON dp.producto_id = p.id
       WHERE dp.pedido_id = $1`,
      [pedido.id]
    );

    res.render('pedido-detalle', {
      pedido,
      productos: productosResult.rows,
      user: req.user
    });
  } catch (error) {
    console.error('Error cargando pedido detalle:', error);
    res.status(500).send('Error cargando pedido');
  }
});


// Procesar pedido enviado desde formulario
app.post('/cliente/pedido', isCliente, async (req, res) => {
  try {
    // Crear pedido pendiente
    const result = await pool.query(
      'INSERT INTO pedidos (usuario_id, estado) VALUES ($1, $2) RETURNING id',
      [req.user.id, 'pendiente']
    );
    const pedidoId = result.rows[0].id;

    // Insertar detalle del pedido con cantidades recibidas del formulario
    const productos = await pool.query('SELECT id FROM productos');
    for (const producto of productos.rows) {
      const cantidad = parseInt(req.body[`cantidad_${producto.id}`]) || 0;
      if (cantidad > 0) {
        await pool.query(
          'INSERT INTO detalle_pedido (pedido_id, producto_id, cantidad) VALUES ($1, $2, $3)',
          [pedidoId, producto.id, cantidad]
        );
      }
    }

    res.redirect('/cliente/mis-pedidos');
  } catch (error) {
    console.error('Error al guardar pedido:', error);
    res.send('Error al guardar pedido');
  }
});

// Mostrar pedidos del cliente con estado real
app.get('/cliente/mis-pedidos', isCliente, async (req, res) => {
  try {
    const pedidos = await pool.query(
      `SELECT p.id, p.estado, p.fecha,
       json_agg(json_build_object('nombre', pr.nombre, 'cantidad', dp.cantidad)) as productos
       FROM pedidos p
       JOIN detalle_pedido dp ON dp.pedido_id = p.id
       JOIN productos pr ON pr.id = dp.producto_id
       WHERE p.usuario_id = $1
       GROUP BY p.id
       ORDER BY p.fecha DESC`,
      [req.user.id]
    );
    res.render('mis-pedidos', { pedidos: pedidos.rows, user: req.user });

  } catch (error) {
    console.error('Error cargando pedidos:', error);
    res.send('Error cargando pedidos');
  }
});

// --- Rutas admin para gestionar pedidos ---

app.get('/admin/pedidos', isAdmin, async (req, res) => {
  try {
    const pedidos = await pool.query(
      `SELECT p.id, p.estado, p.fecha, u.nombre as cliente,
       json_agg(json_build_object('nombre', pr.nombre, 'cantidad', dp.cantidad)) as productos
       FROM pedidos p
       JOIN usuarios u ON u.id = p.usuario_id
       JOIN detalle_pedido dp ON dp.pedido_id = p.id
       JOIN productos pr ON pr.id = dp.producto_id
       GROUP BY p.id, u.nombre
       ORDER BY p.fecha DESC`
    );
    res.render('admin-pedidos', { pedidos: pedidos.rows });
  } catch (error) {
    console.error('Error cargando pedidos admin:', error);
    res.send('Error cargando pedidos admin');
  }
});

app.post('/admin/pedidos/:id/estado', isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { estado } = req.body;
    await pool.query('UPDATE pedidos SET estado = $1 WHERE id = $2', [estado, id]);
    res.redirect('/admin/pedidos');
  } catch (error) {
    console.error('Error actualizando estado pedido:', error);
    res.send('Error actualizando estado pedido');
  }
});

// --- Rutas de otros módulos ---

app.use('/admin', adminRoutes);
app.use('/cliente', clienteRoutes);
app.use('/empresa', empresaRoutes);
app.use('/flota', flotaRoutes);
app.use('/choferes', choferesRouter);


// Ruta para probar conexión DB
app.get('/probar-db', async (req, res) => {
  try {
    const resultado = await pool.query('SELECT NOW()');
    res.send(`✅ Conexión exitosa a PostgreSQL. Fecha/hora: ${resultado.rows[0].now}`);
  } catch (error) {
    console.error('❌ Error al conectar a la DB:', error);
    res.status(500).send('No se pudo conectar a la base de datos.');
  }
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});
