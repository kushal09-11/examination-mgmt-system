const express = require('express');
const router = express.Router();
const attendanceMarksController = require('../controllers/attendanceMarksController');
const { authenticate, authorize } = require('../middleware/auth');

// Attendance
router.post('/attendance', authenticate, authorize('Admin', 'Faculty'), attendanceMarksController.markAttendance);
router.get('/attendance/:scheduleId', authenticate, authorize('Admin', 'Faculty'), attendanceMarksController.getAttendance);

// Marks Entry
router.post('/marks', authenticate, authorize('Admin', 'Faculty', 'Examiner'), attendanceMarksController.enterMarks);

// Results & Moderation
router.get('/results', authenticate, attendanceMarksController.getResults);
router.put('/results/moderate', authenticate, authorize('Admin', 'Examiner'), attendanceMarksController.moderate);
router.put('/results/publish/:examId', authenticate, authorize('Admin'), attendanceMarksController.togglePublishResults);

// Student Summary & PDF Grade Card
router.get('/results/student/:studentId', authenticate, attendanceMarksController.getStudentSummary);
router.get('/results/student/:studentId/pdf', authenticate, attendanceMarksController.downloadGradeSheet);

module.exports = router;
