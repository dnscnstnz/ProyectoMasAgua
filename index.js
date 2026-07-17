require('dotenv').config();

const express = require('express');
const path = require('path');
const session = require('express-session');
const bcrypt = require('bcrypt');
const pool = require('./db');

// Rutas
const adminRoutes = require('./routes/admin');
const clienteRoutes = require('./routes/cliente');
const empresaRoutes = require('./routes/empresa');
const flotaRoutes = require('./routes/flota');
const choferesRouter = require('./routes/choferes');


const app = express();
const PORT = 3000;

// --- Motor de vistas ---
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// --- Middlewares base ---
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
}));

// Middleware para cargar usuario desde la sesión
app.use(async (req, res, next) => {
  if (req.session.userId) {
    try {
      const result = await pool.query('SELECT * FROM usuarios WHERE id = $1', [req.session.userId]);
      req.user = result.rows[0];
      res.locals.user = req.user;
    } catch (error) {
      console.error('Error al cargar usuario:', error);
    }
  }
  if (!res.locals.user) {
    res.locals.user = null;
  }
  next();
});

// --- Middleware para roles ---
function isCliente(req, res, next) {
  if (req.user && req.user.rol === 'cliente' && req.user.tipo !== 'empresa') return next();
  return res.redirect('/login.html');
}

function isAdmin(req, res, next) {
  if (req.user && req.user.rol === 'admin') return next();
  return res.redirect('/login.html');
}

function isEmpresa(req, res, next) {
  if (req.user && req.user.tipo === 'empresa') return next();
  return res.redirect('/login.html');
}

function limpiarTexto(valor) {
  return String(valor || '').trim().replace(/\s+/g, ' ');
}

function normalizarRut(rut) {
  return limpiarTexto(rut).replace(/\./g, '').replace(/\s/g, '').toUpperCase();
}

function esRutValido(rut) {
  const rutLimpio = normalizarRut(rut);
  if (!/^\d{7,8}-[\dK]$/.test(rutLimpio)) return false;

  const [numero, digitoVerificador] = rutLimpio.split('-');
  let suma = 0;
  let multiplicador = 2;

  for (let i = numero.length - 1; i >= 0; i--) {
    suma += Number(numero[i]) * multiplicador;
    multiplicador = multiplicador === 7 ? 2 : multiplicador + 1;
  }

  const resto = 11 - (suma % 11);
  const digitoCalculado = resto === 11 ? '0' : resto === 10 ? 'K' : String(resto);
  return digitoCalculado === digitoVerificador;
}

function normalizarTelefono(telefono) {
  const soloDigitos = limpiarTexto(telefono).replace(/\D/g, '');
  if (soloDigitos.startsWith('56') && soloDigitos.length === 11) return `+${soloDigitos}`;
  if (soloDigitos.startsWith('9') && soloDigitos.length === 9) return `+56${soloDigitos}`;
  return limpiarTexto(telefono);
}

function validarRegistro(datos) {
  const tipo = limpiarTexto(datos.tipo).toLowerCase();
  const email = limpiarTexto(datos.email).toLowerCase();
  const password = String(datos.password || '');
  const nombre = limpiarTexto(datos.nombre);
  const rut = normalizarRut(datos.rut);
  const direccion = limpiarTexto(datos.direccion);
  const telefono = normalizarTelefono(datos.telefono);
  const errores = [];

  if (!['natural', 'empresa'].includes(tipo)) {
    errores.push('Selecciona un tipo de cliente valido.');
  }

  if (!/^[\p{L}\p{N} .,'&-]{3,80}$/u.test(nombre)) {
    errores.push('El nombre o razon social debe tener entre 3 y 80 caracteres y no incluir simbolos especiales.');
  }

  if (!esRutValido(rut)) {
    errores.push('Ingresa un RUT valido con digito verificador. Ejemplo: 12.345.678-5.');
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) || email.length > 120) {
    errores.push('Ingresa un correo electronico valido.');
  }

  if (!/^\+569\d{8}$/.test(telefono)) {
    errores.push('Ingresa un telefono celular chileno valido. Ejemplo: +56 9 1234 5678.');
  }

  if (direccion.length < 6 || direccion.length > 120) {
    errores.push('La direccion debe tener entre 6 y 120 caracteres.');
  }

  if (password.length < 8 || password.length > 72) {
    errores.push('La contrasena debe tener entre 8 y 72 caracteres.');
  }

  if (!/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/\d/.test(password)) {
    errores.push('La contrasena debe incluir al menos una mayuscula, una minuscula y un numero.');
  }

  return {
    datosLimpios: { tipo, email, password, nombre, rut, direccion, telefono },
    errores
  };
}

// --- Rutas de autenticación ---
app.get('/register', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'register.html'));
});

app.post('/register', async (req, res) => {
  const { datosLimpios, errores } = validarRegistro(req.body);
  const { email, password, tipo, nombre, rut, direccion, telefono } = datosLimpios;

  if (errores.length > 0) {
    return res.status(400).send(`Datos invalidos:<br><ul>${errores.map(error => `<li>${error}</li>`).join('')}</ul><a href="/register">Volver al registro</a>`);
  }

  try {
    const existe = await pool.query('SELECT * FROM usuarios WHERE email = $1 OR rut = $2', [email, rut]);
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

// --- Rutas importadas de módulos ---
app.use('/admin', adminRoutes);
app.use('/cliente', clienteRoutes);
app.use('/empresa', empresaRoutes);
app.use('/flota', flotaRoutes);
app.use('/choferes', choferesRouter);

// --- Ruta para probar conexión DB ---
app.get('/probar-db', async (req, res) => {
  try {
    const resultado = await pool.query('SELECT NOW()');
    res.send(`✅ Conexión exitosa a PostgreSQL. Fecha/hora: ${resultado.rows[0].now}`);
  } catch (error) {
    console.error('❌ Error al conectar a la DB:', error);
    res.status(500).send('No se pudo conectar a la base de datos.');
  }
});

// --- Iniciar servidor ---
app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});
