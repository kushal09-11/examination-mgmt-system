const express = require('express');
const router = express.Router();
const questionPaperController = require('../controllers/questionPaperController');
const { authenticate, authorize } = require('../middleware/auth');

// Questions
router.get('/questions', authenticate, authorize('Admin', 'Faculty', 'Examiner'), questionPaperController.getQuestions);
router.post('/questions', authenticate, authorize('Admin', 'Faculty'), questionPaperController.createQuestion);
router.put('/questions/:id', authenticate, authorize('Admin', 'Faculty'), questionPaperController.updateQuestion);

// Question Papers
router.get('/papers', authenticate, authorize('Admin', 'Faculty', 'Examiner'), questionPaperController.getPapers);
router.post('/papers/generate', authenticate, authorize('Admin', 'Faculty'), questionPaperController.generatePaper);
router.put('/papers/:id/review', authenticate, authorize('Admin', 'Examiner'), questionPaperController.reviewPaper);

module.exports = router;
