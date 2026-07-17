const express = require('express');
const router = express.Router();
const choferesController = require('../controllers/choferesController');
const { estaLogueado, esAdmin } = require('../middlewares/authMiddleware');

// Listar choferes
router.get('/', estaLogueado, esAdmin, choferesController.listarChoferes);

// Mostrar formulario agregar
router.get('/nuevo', estaLogueado, esAdmin, choferesController.formularioNuevoChofer);

// Procesar agregar
router.post('/nuevo', estaLogueado, esAdmin, choferesController.guardarNuevoChofer);

// Mostrar formulario editar
router.get('/editar/:id', estaLogueado, esAdmin, choferesController.formularioEditarChofer);

// Procesar editar
router.post('/editar/:id', estaLogueado, esAdmin, choferesController.guardarChoferEditado);

// Eliminar chofer
router.post('/eliminar/:id', estaLogueado, esAdmin, choferesController.eliminarChofer);

module.exports = router;
