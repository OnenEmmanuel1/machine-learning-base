const express = require('express');
const router = express.Router();
const lecturerController = require('../controllers/lecturerController');
const { ensureLecturerOrAdmin } = require('../middleware/auth');
const { validateScoreInput, validateAttendanceInput } = require('../middleware/validator');

router.use(ensureLecturerOrAdmin);

router.get('/dashboard', lecturerController.getDashboard);

router.get('/scores/entry', lecturerController.getScoreEntry);
router.post('/scores/entry', validateScoreInput, lecturerController.postScoreEntry);
router.post('/scores/batch', lecturerController.postBatchScoreEntry);

router.get('/attendance/entry', lecturerController.getAttendanceEntry);
router.post('/attendance/entry', lecturerController.postAttendanceEntry);

router.get('/students/:id', lecturerController.getStudentDetail);
router.post('/notifications/:id/acknowledge', lecturerController.postAcknowledgeAlert);

module.exports = router;
