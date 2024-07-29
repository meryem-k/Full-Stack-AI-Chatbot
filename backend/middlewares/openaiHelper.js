const axios = require('axios');

exports.extractProductName = async (userMessage) => {
  try {
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are an online furniture store customer representative chat bot. Extract the product name from this user query and respond only with the product name.'
          },
          {
            role: 'user',
            content: userMessage
          }
        ],
        max_tokens: 50,
        temperature: 0.7,
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        }
      }
    );
    const extractedText = response.data.choices[0].message.content.trim();
    console.log('Extracted text from OpenAI:', extractedText);
    return extractedText;
  } catch (err) {
    console.error('Error querying OpenAI API:', err);
    return null;
  }
};

exports.formatResponseWithOpenAI = async (message, systemMessage) => {
  try {
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: `${systemMessage} Your responses should be informal, conversational, and suitable for a chat environment. Avoid using formal greetings like "Dear customer" or sign-offs like "Best regards." Do not include the website link https://evefurn.com/ in your responses. After the initial greeting, avoid starting responses with "Hey there!" or similar phrases.`
          },
          {
            role: 'user',
            content: message,
          },
        ],
        max_tokens: 150,
        temperature: 0.7,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );
    return response.data.choices[0].message.content.trim();
  } catch (err) {
    console.error('Error querying OpenAI API:', err);
    return 'Sorry, there was an error processing your request.';
  }
};

