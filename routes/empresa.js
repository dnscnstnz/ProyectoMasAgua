const express = require('express');
const router = express.Router();
const empresaController = require('../controllers/empresaController');
const { estaLogueado } = require('../middlewares/authMiddleware');

router.get('/', estaLogueado, empresaController.getEmpresaDashboard);

module.exports = router;
