function estaLogueado(req, res, next) {
  if (req.user) return next();
  res.redirect('/login.html');
}

function esAdmin(req, res, next) {
  if (req.user && req.user.rol === 'admin') return next();
  res.status(403).send('Acceso denegado - solo administradores');
}

function isEmpresa(req, res, next) {
  if (req.user && req.user.tipo === 'empresa') return next();
  res.redirect('/login.html');
}

function isCliente(req, res, next) {
  if (req.user && req.user.rol === 'cliente') return next();
  res.status(403).send('Acceso denegado - solo clientes');
}

module.exports = { estaLogueado, esAdmin, isEmpresa, isCliente };
