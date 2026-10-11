const express = require('express');
const router = express.Router();
const hallTicketController = require('../controllers/hallTicketController');
const { authenticate, authorize } = require('../middleware/auth');

router.get('/', authenticate, hallTicketController.getTickets);
router.get('/eligibility/:studentId/:scheduleId', authenticate, hallTicketController.verifyEligibility);
router.post('/batch-generate', authenticate, authorize('Admin'), hallTicketController.generateBatch);
router.get('/:id/pdf', authenticate, hallTicketController.downloadPDF);

module.exports = router;
