const dashboardReportService = require('../services/dashboardReportService');

async function getDashboardMetrics(req, res, next) {
  try {
    const role = req.user.role;
    let data = {};

    if (role === 'Admin') {
      data = await dashboardReportService.getAdminDashboard();
    } else if (role === 'Faculty') {
      data = await dashboardReportService.getFacultyDashboard(req.user);
    } else if (role === 'Student') {
      data = await dashboardReportService.getStudentDashboard(req.user);
    } else if (role === 'Examiner') {
      data = await dashboardReportService.getExaminerDashboard();
    }

    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

async function getReports(req, res, next) {
  try {
    const report = await dashboardReportService.getPerformanceReport(req.query);
    res.json({ success: true, data: report });
  } catch (err) {
    next(err);
  }
}

async function exportExcel(req, res, next) {
  try {
    await dashboardReportService.exportPerformanceReportExcel(req.query, res);
  } catch (err) {
    next(err);
  }
}

async function getAuditLogs(req, res, next) {
  try {
    const result = await dashboardReportService.getAuditLogs(req.query);
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
}

async function getSettings(req, res, next) {
  try {
    const settings = await dashboardReportService.getSystemSettings();
    res.json({ success: true, data: settings });
  } catch (err) {
    next(err);
  }
}

async function updateSetting(req, res, next) {
  try {
    const { key, value } = req.body;
    const updated = await dashboardReportService.updateSystemSetting(key, value, req.user, req);
    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getDashboardMetrics,
  getReports,
  exportExcel,
  getAuditLogs,
  getSettings,
  updateSetting,
};
