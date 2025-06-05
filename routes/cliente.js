// routes/cliente.js
const express = require('express');
const router = express.Router();

const clienteController = require('../controllers/clienteController');
const { estaLogueado } = require('../middlewares/authMiddleware');

router.get('/', estaLogueado, clienteController.getClienteDashboard);
router.get('/pedidos', estaLogueado, clienteController.verPedidos);

module.exports = router;
