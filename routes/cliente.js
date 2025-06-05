const express = require('express');
const router = express.Router();
const clienteController = require('../controllers/clienteController');
const { estaLogueado } = require('../middlewares/authMiddleware');

router.get('/', estaLogueado, clienteController.getClienteDashboard);

module.exports = router;
