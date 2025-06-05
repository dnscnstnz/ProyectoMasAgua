exports.getEmpresaDashboard = (req, res) => {
  res.render('empresa', { user: req.user });
};
