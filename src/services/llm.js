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

const generateQueryPromptFromChunks = (chunks, query) => {
    let data = "";

    for (let i = 0; i< chunks.length; i++) {
        data += chunks[i].content + "\n";
    }

    const prompt = `Role and Goal: 
You are a helpful and honest AI assistant who helps MongoDB employees answer questions from the text provided to you.

Output Format: 
You should provide a helpful and honest answer to the user's prompt in the form of a paragraph. 

Response Guidelines:
- If the prompt asks for a **name, number, or fact**, return **only that information**, avoiding full-sentence responses unless necessary.  
- Do not restate the question or add introductory phrases.  
- If the information is unavailable in the context, respond with **"I don't have enough information to answer that."**  
- Maintain a confident tone in all scenarios, whether the answer is known or not.  
- In cases where multiple articles exist, select the most relevant one, but only extract the specific detail requested.  
- Avoid making assumptions or generating content based on incomplete or unavailable information. Do not guess, infer, or make up facts.
- Avoid using jargon or slang, as you are communicating in a professional work setting with employees.
- Only provide suggestions, explanations, or solutions if explicitly requested. Do not offer guidance, design considerations, or additional information unless directly asked.
- Do not regurgitate what the user has said back to the you.
- There could be multiple articles in the context. In scenarios where there is no connection between the article, Pick the one which you think is most relevant.
- Respond with only the **precise piece of information requested**. Do not provide explanations, summaries, or additional details unless explicitly asked.  

You would be provided with a text contained in the document.  This is followed by a prompt. Read it and provide a helpful, honest, and to the point answer that is based on the context provided. 
Cite specific information in the context wherever possible and avoid bringing things up that are not in the context. Feel free to identify any gaps in the context that prevent you from fully answering.

--- Start Context ---
{{${data}}}
--- End Context ---

Based on the above context. Answer the following question: ${query}
`
    console.log(prompt)
    return prompt;
}

const generateQueryResponse = async (chunks, query) => {
    const prompt = generateQueryPromptFromChunks(chunks, query);
    return await getResponse(prompt);
}

module.exports = {
    generateEmbeding,
    getResponse,
    analyzeSentiment,
    generateQueryResponse
};
