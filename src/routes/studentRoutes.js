const express = require('express');
const router = express.Router();
const studentController = require('../controllers/studentController');
const { ensureStudent } = require('../middleware/auth');

router.use(ensureStudent);

router.get('/dashboard', studentController.getDashboard);
router.get('/notifications', studentController.getNotifications);

module.exports = router;
