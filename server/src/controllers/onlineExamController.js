const onlineExamService = require('../services/onlineExamService');

async function getAvailable(req, res, next) {
  try {
    const list = await onlineExamService.getAvailableOnlineExams(req.user);
    res.json({ success: true, data: list });
  } catch (err) {
    next(err);
  }
}

async function startExam(req, res, next) {
  try {
    const { schedule_id } = req.body;
    const session = await onlineExamService.startOnlineExam(Number(schedule_id), req.user, req);
    res.json({ success: true, data: session });
  } catch (err) {
    next(err);
  }
}

async function saveAnswer(req, res, next) {
  try {
    const { attempt_id, question_id, student_answer } = req.body;
    const response = await onlineExamService.saveResponse(
      Number(attempt_id),
      Number(question_id),
      student_answer,
      req.user
    );
    res.json({ success: true, data: response });
  } catch (err) {
    next(err);
  }
}

async function recordTabSwitch(req, res, next) {
  try {
    const { attempt_id } = req.body;
    await onlineExamService.recordTabSwitch(Number(attempt_id), req.user);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

async function submitExam(req, res, next) {
  try {
    const { attempt_id } = req.body;
    const result = await onlineExamService.submitExam(Number(attempt_id), req.user, false, req);
    res.json({
      success: true,
      message: 'Examination submitted successfully.',
      data: result,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getAvailable,
  startExam,
  saveAnswer,
  recordTabSwitch,
  submitExam,
};
