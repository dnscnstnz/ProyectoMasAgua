exports.getClienteDashboard = (req, res) => {
  res.render('cliente', { user: req.user });
};
