const express = require('express');
const router = express.Router();
const empresaController = require('../controllers/empresaController');
const { isEmpresa } = require('../middlewares/authMiddleware');

router.get('/', isEmpresa, empresaController.getEmpresaDashboard);  

// Rutas para la empresa
router.get('/planes', isEmpresa, empresaController.mostrarPlanes);
router.post('/planes', isEmpresa, empresaController.contratarPlan);
router.get('/mis-planes', isEmpresa, empresaController.misPlanes);

module.exports = router;
