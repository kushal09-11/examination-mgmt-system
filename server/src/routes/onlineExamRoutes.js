const express = require('express');
const router = express.Router();
const onlineExamController = require('../controllers/onlineExamController');
const { authenticate, authorize } = require('../middleware/auth');

router.get('/available', authenticate, authorize('Student'), onlineExamController.getAvailable);
router.post('/start', authenticate, authorize('Student'), onlineExamController.startExam);
router.post('/save-answer', authenticate, authorize('Student'), onlineExamController.saveAnswer);
router.post('/tab-switch', authenticate, authorize('Student'), onlineExamController.recordTabSwitch);
router.post('/submit', authenticate, authorize('Student'), onlineExamController.submitExam);

module.exports = router;
