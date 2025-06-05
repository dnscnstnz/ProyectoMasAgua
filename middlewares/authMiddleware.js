function estaLogueado(req, res, next) {
  if (req.user) return next();
  res.redirect('/login.html');
}

function esAdmin(req, res, next) {
  if (req.user && req.user.rol === 'admin') return next();
  res.status(403).send('Acceso denegado - solo administradores');
}

module.exports = { estaLogueado, esAdmin };
