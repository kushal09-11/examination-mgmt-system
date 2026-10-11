const questionBankService = require('../services/questionBankService');
const { questionSchema, paperGenerationSchema } = require('../validators/questionValidator');

async function getQuestions(req, res, next) {
  try {
    const questions = await questionBankService.getQuestions(req.query, req.user);
    res.json({ success: true, data: questions });
  } catch (err) {
    next(err);
  }
}

async function createQuestion(req, res, next) {
  try {
    const validated = questionSchema.parse(req.body);
    const question = await questionBankService.createQuestion(validated, req.user, req);
    res.status(201).json({ success: true, data: question });
  } catch (err) {
    next(err);
  }
}

async function updateQuestion(req, res, next) {
  try {
    const validated = questionSchema.partial().parse(req.body);
    const question = await questionBankService.updateQuestion(Number(req.params.id), validated, req.user, req);
    res.json({ success: true, data: question });
  } catch (err) {
    next(err);
  }
}

async function generatePaper(req, res, next) {
  try {
    const validated = paperGenerationSchema.parse(req.body);
    const paper = await questionBankService.generateQuestionPaper(validated, req.user, req);
    res.status(201).json({
      success: true,
      message: 'Question paper generated successfully and submitted for Examiner review.',
      data: paper,
    });
  } catch (err) {
    next(err);
  }
}

async function getPapers(req, res, next) {
  try {
    const papers = await questionBankService.getQuestionPapers(req.query);
    res.json({ success: true, data: papers });
  } catch (err) {
    next(err);
  }
}

async function reviewPaper(req, res, next) {
  try {
    const { status, examiner_feedback } = req.body;
    const paper = await questionBankService.reviewQuestionPaper(Number(req.params.id), { status, examiner_feedback }, req.user, req);
    res.json({
      success: true,
      message: `Question paper ${status.toLowerCase()} successfully.`,
      data: paper,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getQuestions,
  createQuestion,
  updateQuestion,
  generatePaper,
  getPapers,
  reviewPaper,
};
