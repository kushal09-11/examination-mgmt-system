const express = require('express');
const router = express.Router();
const dashboardReportController = require('../controllers/dashboardReportController');
const { authenticate, authorize } = require('../middleware/auth');

// Dashboard metrics (role tailored)
router.get('/dashboard', authenticate, dashboardReportController.getDashboardMetrics);

// Reports & Analytics
router.get('/reports/performance', authenticate, authorize('Admin', 'Faculty', 'Examiner'), dashboardReportController.getReports);
router.get('/reports/export-excel', authenticate, authorize('Admin', 'Faculty', 'Examiner'), dashboardReportController.exportExcel);

// Audit Logs (Admin only, append-only)
router.get('/audit-logs', authenticate, authorize('Admin'), dashboardReportController.getAuditLogs);

// System Settings & Grading Policies
router.get('/settings', authenticate, authorize('Admin'), dashboardReportController.getSettings);
router.put('/settings', authenticate, authorize('Admin'), dashboardReportController.updateSetting);

module.exports = router;
