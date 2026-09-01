const express = require('express');
const router = express.Router();
const exportController = require('../controllers/exportController');
const { ensureLecturerOrAdmin } = require('../middleware/auth');

router.use(ensureLecturerOrAdmin);

router.get('/cohort/csv', exportController.exportCohortCsv);
router.get('/cohort/print', exportController.printCohortReport);
router.get('/student/:id/csv', exportController.exportStudentCsv);
router.get('/student/:id/print', exportController.printStudentReport);

module.exports = router;
