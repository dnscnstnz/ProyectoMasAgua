const express = require('express');
const router = express.Router();
const choferesController = require('../controllers/choferesController');

router.get('/', choferesController.listarChoferes);
router.post('/agregar', choferesController.agregarChofer);
router.post('/eliminar/:id', choferesController.eliminarChofer);
router.get('/editar/:id', choferesController.obtenerChoferPorId);
router.post('/editar/:id', choferesController.actualizarChofer);

module.exports = router;
