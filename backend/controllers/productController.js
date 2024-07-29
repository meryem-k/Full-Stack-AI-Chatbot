const db = require('../models/db');
const axios = require('axios');
const { extractProductName, formatResponseWithOpenAI } = require('../middlewares/openaiHelper');
const prompts = require('../prompts');
const handleGenericResponse = require('../utils/genericResponseHandler');

const sessionState = {}; // In-memory session storage

exports.initialProductInformationRequest = async (req, res) => {
  const { sessionId } = req.body;
  console.log('Received initial product information request with sessionId:', sessionId);

  try {
    sessionState[sessionId] = { step: 'awaitingProductName' }; // Initialize session state
    console.log('Initialized session state:', sessionState);
    const initialResponse = 'Sure, I can help with that! Please provide the full title of the product so I can further assist you.';
    const formattedResponse = await formatResponseWithOpenAI(initialResponse, prompts.initialProductInfoPrompt);
    res.json({ response: formattedResponse });
  } catch (err) {
    console.error('Error processing initial request:', err.stack);
    res.status(500).send('Server error');
  }
};

exports.followUpProductInformationRequest = async (req, res) => {
  const { question, sessionId } = req.body;
  console.log('Received follow-up product information request with sessionId:', sessionId);
  const session = sessionState[sessionId]; // Retrieve session state

  if (!session) {
    console.error('Session expired or invalid for sessionId:', sessionId);
    res.json({ response: 'Session expired or invalid. Please start a new query.' });
    return;
  }

  console.log('Current session state:', session);
  console.log('Received follow-up product information request:', question);

  try {
    if (session.step === 'awaitingProductName') {
      const productName = await extractProductName(question);
      console.log('Extracted product name:', productName);

      if (productName) {
        const result = await db.query('SELECT * FROM products WHERE name ILIKE $1', [productName]);
        if (result.rows.length > 0) {
          const productInfo = result.rows[0];
          const initialResponse = `I found the product you're looking for!\nProduct Description: ${productInfo.description}`;
          const followUpPrompt = 'Please let me know if you need any additional information, such as dimensions, price, or stock, so I can assist you further.';
          const formattedResponse = await formatResponseWithOpenAI(`${initialResponse}\n\n${followUpPrompt}`, prompts.followUpProductInfoPrompt);
          sessionState[sessionId] = { productInfo, step: 'description' };
          console.log('Updated session state after extracting product:', sessionState);
          res.json({ response: formattedResponse });
        } else {
          const notFoundResponse = 'Sorry, I could not find a product with this product name. Could you please make sure to provide the full product title so I can better assist you?';
          const formattedResponse = await formatResponseWithOpenAI(notFoundResponse, prompts.notFoundPrompt);
          sessionState[sessionId].step = 'awaitingProductName';
          res.json({ response: formattedResponse });
        }
      } else {
        const invalidResponse = 'Sorry, I could not locate the product. Please provide a valid product title or name.';
        const formattedResponse = await formatResponseWithOpenAI(invalidResponse, prompts.invalidProductPrompt);
        sessionState[sessionId].step = 'awaitingProductName';
        res.json({ response: formattedResponse });
      }
    } else {
      const { productInfo } = session;
      let responseMessage = '';
      let prompt = '';

      if (/dimension|size/i.test(question)) {
        responseMessage = `Product Dimensions: ${productInfo.dimensions}`;
        prompt = prompts.followUpDimensionsPrompt;
        sessionState[sessionId].step = 'dimensions';
      } else if (/price|cost/i.test(question)) {
        responseMessage = `Product Price: $${productInfo.price}`;
        prompt = prompts.followUpPricePrompt;
        sessionState[sessionId].step = 'price';
      } else if (/stock|inventory|availability/i.test(question)) {
        responseMessage = `Stock Information: We have ${productInfo.stock} left in stock.`;
        prompt = prompts.followUpStockPrompt;
        sessionState[sessionId].step = 'stock';
      } else if (/thank/i.test(question)) {
        responseMessage = 'You’re welcome! If you have any other questions, feel free to ask.';
        sessionState[sessionId].step = 'general';
      } else {
        // Call the generic response handler
        return await handleGenericResponse(question, sessionId, res, sessionState);
      }

      const formattedResponse = await formatResponseWithOpenAI(responseMessage, prompt);
      console.log('Updated session state after follow-up question:', sessionState);
      res.json({ response: formattedResponse });
    }
  } catch (err) {
    console.error('Error fetching product info:', err.stack);
    res.status(500).send('Server error');
  }
};
