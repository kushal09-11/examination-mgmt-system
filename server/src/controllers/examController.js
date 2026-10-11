const examScheduleService = require('../services/examScheduleService');
const { examSchema, examScheduleSchema } = require('../validators/examValidator');

async function getExams(req, res, next) {
  try {
    const exams = await examScheduleService.getAllExams(req.query);
    res.json({ success: true, data: exams });
  } catch (err) {
    next(err);
  }
}

async function createExam(req, res, next) {
  try {
    const validated = examSchema.parse(req.body);
    const exam = await examScheduleService.createExam(validated, req.user.user_id, req);
    res.status(201).json({ success: true, data: exam });
  } catch (err) {
    next(err);
  }
}

async function getSchedules(req, res, next) {
  try {
    const schedules = await examScheduleService.getAllSchedules(req.query, req.user);
    res.json({ success: true, data: schedules });
  } catch (err) {
    next(err);
  }
}

async function checkConflict(req, res, next) {
  try {
    const { exam_date, start_time, end_time, venue, batch_year, excludeScheduleId } = req.body;
    const result = await examScheduleService.checkScheduleConflict({
      exam_date,
      start_time,
      end_time,
      venue,
      batch_year,
      excludeScheduleId: excludeScheduleId ? Number(excludeScheduleId) : null,
    });
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
}

async function createSchedule(req, res, next) {
  try {
    const validated = examScheduleSchema.parse(req.body);
    const schedule = await examScheduleService.createExamSchedule(validated, req.user.user_id, req);
    res.status(201).json({ success: true, data: schedule });
  } catch (err) {
    next(err);
  }
}

async function updateSchedule(req, res, next) {
  try {
    const validated = examScheduleSchema.partial().parse(req.body);
    const schedule = await examScheduleService.updateExamSchedule(Number(req.params.id), validated, req.user.user_id, req);
    res.json({ success: true, data: schedule });
  } catch (err) {
    next(err);
  }
}

async function togglePublishSchedule(req, res, next) {
  try {
    const { is_published } = req.body;
    const schedule = await examScheduleService.publishExamSchedule(Number(req.params.id), Boolean(is_published), req.user.user_id, req);
    res.json({
      success: true,
      message: `Schedule ${is_published ? 'published' : 'unpublished'} successfully.`,
      data: schedule,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getExams,
  createExam,
  getSchedules,
  checkConflict,
  createSchedule,
  updateSchedule,
  togglePublishSchedule,
};
