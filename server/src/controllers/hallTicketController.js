const hallTicketService = require('../services/hallTicketService');

async function getTickets(req, res, next) {
  try {
    const tickets = await hallTicketService.getHallTickets(req.query, req.user);
    res.json({ success: true, data: tickets });
  } catch (err) {
    next(err);
  }
}

async function verifyEligibility(req, res, next) {
  try {
    const { studentId, scheduleId } = req.params;
    const result = await hallTicketService.checkEligibility(Number(studentId), Number(scheduleId));
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

async function generateBatch(req, res, next) {
  try {
    const { schedule_id } = req.body;
    const records = await hallTicketService.generateBatchHallTickets(Number(schedule_id), req.user.user_id, req);
    res.json({
      success: true,
      message: `Processed hall tickets for ${records.length} students based on eligibility threshold.`,
      data: records,
    });
  } catch (err) {
    next(err);
  }
}

async function downloadPDF(req, res, next) {
  try {
    await hallTicketService.streamHallTicketPDF(Number(req.params.id), req.user, res);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getTickets,
  verifyEligibility,
  generateBatch,
  downloadPDF,
};
