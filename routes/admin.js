const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { estaLogueado, esAdmin } = require('../middlewares/authMiddleware');

router.get('/', estaLogueado, esAdmin, adminController.getDashboard);
router.get('/pedidos', estaLogueado, esAdmin, adminController.getPedidos);
router.post('/pedidos/:id/estado', estaLogueado, esAdmin, adminController.cambiarEstadoPedido);
router.get('/planes', estaLogueado, esAdmin, adminController.getPlanesContratados);
router.post('/planes/:id/estado', estaLogueado, esAdmin, adminController.cambiarEstadoPlanContratado);


module.exports = router;