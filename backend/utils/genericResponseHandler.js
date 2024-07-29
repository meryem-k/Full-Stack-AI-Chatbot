const axios = require('axios');
const prompts = require('../prompts');
const { formatResponseWithOpenAI } = require('../middlewares/openaiHelper');

const handleGenericResponse = async (question, sessionId, res, sessionState) => {
  try {
    const session = sessionState[sessionId];
    const productInfo = session ? session.productInfo : null;
    let genericPrompt = `The customer has a general question or statement: "${question}". Please respond in a helpful and friendly manner without providing the website link.`;
    
    if (productInfo) {
      genericPrompt += `\n\nProduct Info: ${JSON.stringify(productInfo)}`;
    }

    const genericResponse = await formatResponseWithOpenAI(genericPrompt, prompts.genericPrompt);
    res.json({ response: genericResponse });
  } catch (err) {
    console.error('Error handling generic response:', err.stack);
    res.status(500).send('Server error');
  }
};

module.exports = handleGenericResponse;
