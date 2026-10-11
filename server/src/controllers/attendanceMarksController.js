const attendanceMarksService = require('../services/attendanceMarksService');
const { bulkAttendanceSchema, bulkMarksSchema, moderationSchema } = require('../validators/marksValidator');

// Attendance
async function markAttendance(req, res, next) {
  try {
    const validated = bulkAttendanceSchema.parse(req.body);
    const records = await attendanceMarksService.markAttendance(validated, req.user, req);
    res.json({
      success: true,
      message: 'Attendance recorded successfully.',
      data: records,
    });
  } catch (err) {
    next(err);
  }
}

async function getAttendance(req, res, next) {
  try {
    const records = await attendanceMarksService.getAttendanceBySchedule(req.params.scheduleId);
    res.json({ success: true, data: records });
  } catch (err) {
    next(err);
  }
}

// Marks Entry
async function enterMarks(req, res, next) {
  try {
    const validated = bulkMarksSchema.parse(req.body);
    const records = await attendanceMarksService.enterMarks(validated, req.user, req);
    res.json({
      success: true,
      message: 'Marks entered and submitted for moderation.',
      data: records,
    });
  } catch (err) {
    next(err);
  }
}

// Moderation
async function moderate(req, res, next) {
  try {
    const validated = moderationSchema.parse(req.body);
    const record = await attendanceMarksService.moderateResult(validated, req.user, req);
    res.json({
      success: true,
      message: `Result marked as ${validated.moderation_status}.`,
      data: record,
    });
  } catch (err) {
    next(err);
  }
}

// Results
async function getResults(req, res, next) {
  try {
    const records = await attendanceMarksService.getResults(req.query, req.user);
    res.json({ success: true, data: records });
  } catch (err) {
    next(err);
  }
}

async function togglePublishResults(req, res, next) {
  try {
    const { is_published } = req.body;
    const { examId } = req.params;
    const result = await attendanceMarksService.publishResults(Number(examId), Boolean(is_published), req.user, req);
    res.json({
      success: true,
      message: `Results ${is_published ? 'published' : 'unpublished'} successfully.`,
      data: result,
    });
  } catch (err) {
    next(err);
  }
}

async function getStudentSummary(req, res, next) {
  try {
    const summary = await attendanceMarksService.getStudentAcademicSummary(req.params.studentId);
    res.json({ success: true, data: summary });
  } catch (err) {
    next(err);
  }
}

async function downloadGradeSheet(req, res, next) {
  try {
    await attendanceMarksService.streamStudentResultPDF(req.params.studentId, req.user, res);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  markAttendance,
  getAttendance,
  enterMarks,
  moderate,
  getResults,
  togglePublishResults,
  getStudentSummary,
  downloadGradeSheet,
};
