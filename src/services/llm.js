require('dotenv').config();
const { GoogleGenerativeAI } = require("@google/generative-ai");
const genAI = new GoogleGenerativeAI(process.env.GEMINI_APIKEY);

async function generateEmbeding(text) {
    try {
        const model = genAI.getGenerativeModel({ model: "text-embedding-004" });
        const result = await model.embedContent(text);
        const embedding = result.embedding.values;
        return embedding;
    } catch (error) {
        console.error('Error generating embedding:', error);
        throw new Error('Failed to generate embedding');
    }
}

const getResponse = async (prompt) => {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });

    const result = await model.generateContent(prompt);
    const response = result.response.text();  
    return response;
}

async function analyzeSentiment(text) {
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });
        const prompt = `Analyze the sentiment of the following text and respond with ONLY ONE of these exact words: positive, negative, or neutral. Do not include any other text or explanation.

Text: ${text}`;
        
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const sentiment = response.text().toLowerCase().trim();
        
        // Validate sentiment value
        if (!['positive', 'negative', 'neutral'].includes(sentiment)) {
            throw new Error(`Invalid sentiment value: ${sentiment}`);
        }
        
        return sentiment;
    } catch (error) {
        console.error('Error analyzing sentiment:', error);
        throw new Error('Failed to analyze sentiment');
    }
}

module.exports = {
    generateEmbeding,
    getResponse,
    analyzeSentiment
};
