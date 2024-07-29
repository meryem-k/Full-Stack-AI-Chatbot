const db = require('../models/db');
const multer = require('multer');
const { formatResponseWithOpenAI } = require('../middlewares/openaiHelper');
const prompts = require('../prompts');

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

const sessionState = {}; // In-memory session storage

exports.initialTicketRequest = async (req, res) => {
  const { sessionId } = req.body;
  console.log('Received initial ticket request with sessionId:', sessionId);

  try {
    sessionState[sessionId] = { step: 'awaitingTicketInfo' }; // Initialize session state
    console.log('Initialized session state:', sessionState);
    const initialResponse = 'Please provide your order number, a description of the issue, and a photo of the damage.';
    const formattedResponse = await formatResponseWithOpenAI(initialResponse, prompts.initialTicketPrompt);
    res.json({ response: formattedResponse });
  } catch (err) {
    console.error('Error processing initial request:', err.stack);
    res.status(500).send('Server error');
  }
};

exports.submitTicket = (req, res) => {
  upload.single('photo')(req, res, async (err) => {
    if (err) {
      return res.status(500).json({ error: 'Error uploading file.' });
    }

    const { orderNumber, issueDescription, sessionId } = req.body;
    const photo = req.file ? req.file.buffer : null;

    if (!sessionState[sessionId]) {
      return res.status(400).json({ response: 'Session expired or invalid. Please start a new query.' });
    }

    try {
      const order = await db.query('SELECT * FROM orders WHERE order_number = $1', [orderNumber]);
      if (order.rows.length === 0) {
        return res.status(400).json({ response: 'Invalid order number.' });
      }

      const result = await db.query(
        'INSERT INTO tickets (order_number, issue_description, photo) VALUES ($1, $2, $3) RETURNING *',
        [orderNumber, issueDescription, photo]
      );

      const initialResponse = `Thank you for filling out the form. Your ticket has been submitted successfully! Our claim department will be evaluating the case. To help us expedite the process, I need to ask you a few more questions.\n\nWhen did you receive the delivery?`;
      sessionState[sessionId] = {
        step: 'awaitingDeliveryDate',
        ticketId: result.rows[0].ticket_id,
      };

      console.log('Session State:', sessionState);

      const formattedResponse = await formatResponseWithOpenAI(initialResponse, prompts.additionalTicketPrompt);
      res.status(201).json({ response: formattedResponse });
    } catch (err) {
      console.error('Error submitting ticket:', err.stack);
      res.status(500).send('Server error');
    }
  });
};

exports.submitAdditionalInfo = (req, res) => {
  upload.single('additionalPhoto')(req, res, async (err) => {
    if (err) {
      return res.status(500).json({ error: 'Error uploading file.' });
    }

    const { sessionId, answer } = req.body;
    const session = sessionState[sessionId];

    if (!session) {
      return res.status(400).json({ response: 'Invalid session.' });
    }

    try {
      let responseMessage = '';
      let systemMessage = '';

      switch (session.step) {
        case 'awaitingDeliveryDate':
          sessionState[sessionId].receivedDate = answer;
          sessionState[sessionId].step = 'awaitingPackagingDamage';
          responseMessage = 'Thank you. Was the packaging damaged from the outside?';
          systemMessage = 'You are an assistant helping the customer with a damaged product claim. They have provided the delivery date of their order. Now, ask if the packaging was damaged from the outside.';
          break;
        case 'awaitingPackagingDamage':
          if (/yes|damaged|broken|crushed|torn/i.test(answer)) {
            sessionState[sessionId].packagingDamage = true;
            sessionState[sessionId].step = 'awaitingPackagingPhoto';
            responseMessage = 'Do you have photos of the damaged packaging? Please upload the photo.';
            systemMessage = 'You are an assistant helping the customer with a damaged product claim. They infomred the packaging was damaged. Now, kindly request photos of the damaged packaging from the customer.';
          } else {
            sessionState[sessionId].packagingDamage = false;
            sessionState[sessionId].step = 'awaitingOriginalPackaging';
            responseMessage = 'Do you have the original packaging and the box?';
            systemMessage = 'You are an assistant helping the customer with a damaged product claim. They have confirmed the packaging was not damaged. Now, ask if they have the original packaging and the box.';
          }
          break;
        case 'awaitingPackagingPhoto':
          sessionState[sessionId].additionalPhoto = req.file ? req.file.buffer : null;
          sessionState[sessionId].step = 'awaitingOriginalPackaging';
          responseMessage = 'Thank you for providing the photo. Do you have the original packaging and the box?';
          systemMessage = 'You are an assistant helping the customer with a damaged product claim. They have provided photos of the damaged packaging. Now, ask if they have the original packaging and the box.';
          break;
        case 'awaitingOriginalPackaging':
          if (/yes|have|kept|retained|still have/i.test(answer)) {
            sessionState[sessionId].originalPackaging = true;
          } else {
            sessionState[sessionId].originalPackaging = false;
          }
          await db.query(
            'UPDATE tickets SET received_date = $1, packaging_damage = $2, original_packaging = $3, additional_photo = $4 WHERE ticket_id = $5',
            [
              sessionState[sessionId].receivedDate,
              sessionState[sessionId].packagingDamage,
              sessionState[sessionId].originalPackaging,
              sessionState[sessionId].additionalPhoto,
              session.ticketId,
            ]
          );
          delete sessionState[sessionId];
          responseMessage = 'Thank you for providing all the details. Our customer representatives will reach back to you via phone call and email to evaluate the claim.';
          systemMessage = 'You are an assistant helping the customer with a damaged product claim. They have provided all the necessary information. Thank them and inform them that a customer representative will reach out to them soon.';
          break;
        default:
          return res.status(400).json({ error: 'Invalid session step.' });
      }

      console.log('Session State:', sessionState);

      const formattedResponse = await formatResponseWithOpenAI(responseMessage, systemMessage);

      res.json({ response: formattedResponse });
    } catch (err) {
      console.error('Error submitting additional info:', err.stack);
      res.status(500).send('Server error');
    }
  });
};
