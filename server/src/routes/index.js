const express = require('express');
const router = express.Router();

const authRoutes = require('./authRoutes');
const academicRoutes = require('./academicRoutes');
const examRoutes = require('./examRoutes');
const hallTicketRoutes = require('./hallTicketRoutes');
const questionPaperRoutes = require('./questionPaperRoutes');
const onlineExamRoutes = require('./onlineExamRoutes');
const attendanceMarksRoutes = require('./attendanceMarksRoutes');
const dashboardReportRoutes = require('./dashboardReportRoutes');
const notificationRoutes = require('./notificationRoutes');

router.use('/auth', authRoutes);
router.use('/academic', academicRoutes);
router.use('/exams', examRoutes);
router.use('/hall-tickets', hallTicketRoutes);
router.use('/bank', questionPaperRoutes);
router.use('/online-exam', onlineExamRoutes);
router.use('/eval', attendanceMarksRoutes);
router.use('/ops', dashboardReportRoutes);
router.use('/notifications', notificationRoutes);

module.exports = router;
