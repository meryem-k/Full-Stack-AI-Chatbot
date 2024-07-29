const express = require('express');
const router = express.Router();
const ticketController = require('../controllers/ticketController');

router.post('/initial-ticket-request', ticketController.initialTicketRequest);
router.post('/submit-ticket', ticketController.submitTicket);
router.post('/submit-additional-info', ticketController.submitAdditionalInfo);


module.exports = router;
