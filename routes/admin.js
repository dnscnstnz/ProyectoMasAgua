const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { estaLogueado, esAdmin } = require('../middlewares/authMiddleware');

// Dashboard principal del admin
router.get('/', estaLogueado, esAdmin, adminController.getDashboard);

// Pedidos
router.get('/pedidos', estaLogueado, esAdmin, adminController.getPedidos);
router.post('/pedidos/:id/estado', estaLogueado, esAdmin, adminController.cambiarEstadoPedido);

// Planes contratados
router.get('/planes', estaLogueado, esAdmin, adminController.getPlanesContratados);
router.post('/planes/:id/estado', estaLogueado, esAdmin, adminController.cambiarEstadoPlanContratado);

// Gestión de rutas
router.get('/rutas', estaLogueado, esAdmin, adminController.verRutas);
router.post('/rutas', estaLogueado, esAdmin, adminController.crearRuta);

module.exports = router;
