const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { estaLogueado, esAdmin } = require('../middlewares/authMiddleware');

// Dashboard principal del admin
router.get('/', estaLogueado, esAdmin, adminController.getDashboard);

// Clientes y reportes
router.get('/clientes', estaLogueado, esAdmin, adminController.getClientes);
router.get('/reportes', estaLogueado, esAdmin, adminController.getReportes);

// Pedidos
router.get('/pedidos', estaLogueado, esAdmin, adminController.getPedidos);
router.post('/pedidos/:id/estado', estaLogueado, esAdmin, adminController.cambiarEstadoPedido);

// Planes contratados
router.get('/planes', estaLogueado, esAdmin, adminController.getPlanesContratados);
router.post('/planes/:id/estado', estaLogueado, esAdmin, adminController.cambiarEstadoPlanContratado);

// Gestion de entregas
router.get('/rutas', estaLogueado, esAdmin, adminController.verEntregas);
router.post('/rutas', estaLogueado, esAdmin, adminController.asignarEntrega);

module.exports = router;

