const express = require('express');
const router = express.Router();
const examController = require('../controllers/examController');
const { authenticate, authorize } = require('../middleware/auth');

router.get('/exams', authenticate, examController.getExams);
router.post('/exams', authenticate, authorize('Admin'), examController.createExam);

router.get('/schedules', authenticate, examController.getSchedules);
router.post('/schedules/check-conflict', authenticate, authorize('Admin'), examController.checkConflict);
router.post('/schedules', authenticate, authorize('Admin'), examController.createSchedule);
router.put('/schedules/:id', authenticate, authorize('Admin'), examController.updateSchedule);
router.put('/schedules/:id/publish', authenticate, authorize('Admin'), examController.togglePublishSchedule);

module.exports = router;
