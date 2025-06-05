const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { estaLogueado, esAdmin } = require('../middlewares/authMiddleware');

// Dashboard principal
router.get('/', estaLogueado, esAdmin, adminController.getDashboard);

// Vista pedidos
router.get('/pedidos', estaLogueado, esAdmin, adminController.getPedidos);

// Cambiar estado de pedido
router.post('/pedidos/:id/estado', estaLogueado, esAdmin, adminController.cambiarEstadoPedido);

module.exports = router;
