const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { ensureAdmin } = require('../middleware/auth');

router.use(ensureAdmin);

router.get('/dashboard', adminController.getDashboard);
router.get('/models', adminController.getModels);
router.post('/models/retrain', adminController.postRetrainModels);
router.post('/models/activate', adminController.postActivateModel);

router.get('/users', adminController.getUsers);
router.post('/users/create', adminController.postCreateUser);

module.exports = router;
