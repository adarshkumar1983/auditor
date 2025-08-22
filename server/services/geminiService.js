const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Use a valid model name
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
// or: const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });

const generateContent = async (prompt) => {
  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error('Error generating content from Gemini API:', error);
    throw new Error('Failed to get response from AI assistant.');
  }
};

module.exports = { generateContent };