const express = require('express');
const router = express.Router();
const clienteController = require('../controllers/clienteController');
const { estaLogueado, isCliente } = require('../middlewares/authMiddleware');

router.get('/', estaLogueado, isCliente, clienteController.getClienteDashboard);
router.get('/pedido', estaLogueado, isCliente, clienteController.getPedidoForm);
router.post('/pedido', estaLogueado, isCliente, clienteController.crearPedido);
router.get('/mis-pedidos', estaLogueado, isCliente, clienteController.verPedidos);

// NUEVAS RUTAS PARA PERFIL
router.get('/perfil', estaLogueado, isCliente, clienteController.verPerfil);
router.post('/perfil', estaLogueado, isCliente, clienteController.actualizarPerfil);

module.exports = router;
