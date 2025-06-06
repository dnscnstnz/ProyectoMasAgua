const express = require('express');
const router = express.Router();
const choferesController = require('../controllers/choferesController');

// Listar choferes
router.get('/', choferesController.listarChoferes);

// Mostrar formulario agregar
router.get('/nuevo', choferesController.formularioNuevoChofer);

// Procesar agregar
router.post('/nuevo', choferesController.guardarNuevoChofer);

// Mostrar formulario editar
router.get('/editar/:id', choferesController.formularioEditarChofer);

// Procesar editar
router.post('/editar/:id', choferesController.guardarChoferEditado);

// Eliminar chofer
router.post('/eliminar/:id', choferesController.eliminarChofer);

module.exports = router;
