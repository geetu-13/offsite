require('dotenv').config();
const { GoogleGenerativeAI } = require("@google/generative-ai");
const genAI = new GoogleGenerativeAI(process.env.GEMINI_APIKEY);

const generateEmbeding = async (prompt) => {
    const model = genAI.getGenerativeModel( { model: "text-embedding-004"} );
    return await model.embedContent(prompt);
}

const getResponse = async (prompt) => {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });

    const result = await model.generateContent(prompt);
    const response = result.response.text();  
    return response;
}

async function analyzeSentiment(text) {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });
    const prompt = `Analyze the sentiment of the following text and striclty classify it as either Positive, Neutral, or Negative: "${text}"`;
    const result = await model.generateContent(prompt);
    const response = result.response.text();
    return response;
}

module.exports = {generateEmbeding, getResponse, analyzeSentiment}
