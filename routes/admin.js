const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { estaLogueado, esAdmin } = require('../middlewares/authMiddleware');

router.get('/', estaLogueado, esAdmin, adminController.getDashboard);

module.exports = router;
