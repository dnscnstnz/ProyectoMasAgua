const express = require('express');
const router = express.Router();
const flotaController = require('../controllers/flotaController');
const { estaLogueado, esAdmin } = require('../middlewares/authMiddleware');

router.get('/', estaLogueado, esAdmin, flotaController.verFlota);
router.post('/agregar', estaLogueado, esAdmin, flotaController.agregarVehiculo);
router.post('/eliminar/:id', estaLogueado, esAdmin, flotaController.eliminarVehiculo);
router.get('/editar/:id', flotaController.mostrarEditar);
router.post('/editar/:id', flotaController.editarVehiculo);

// Puedes agregar ruta para editar después

module.exports = router;
