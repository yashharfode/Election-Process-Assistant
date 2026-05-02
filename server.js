require('dotenv').config();
const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

// 1. Initialize Google Generative AI
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
    console.error("CRITICAL ERROR: GEMINI_API_KEY is missing in your .env file.");
}

// Correct initialization using the API key
const genAI = new GoogleGenerativeAI(apiKey);

// Middleware to serve static files and parse JSON
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// 3. Robust /api/chat Endpoint with Context Awareness
app.post('/api/chat', async (req, res) => {
    const { message, context } = req.body;

    if (!message) {
        return res.status(400).json({ error: 'Message is required' });
    }

    // Extract User Context (defaults if not provided)
    const { name = 'User', age = 18, language = 'English' } = context || {};

    // 2. Dynamic System Prompt based on User Context
    const systemInstruction = `You are an expert Election Assistant speaking to ${name}, age ${age}, in ${language}.
    If age < 18, focus on registration procedures and future voting readiness.
    If age >= 18, focus on the active voting process, polling details, and rights.
    
    You MUST respond ONLY with a raw JSON object. 
    Do not include markdown backticks (like \`\`\`json), do not include a preamble, and do not include any text after the JSON.
    
    The structure MUST be:
    {
      "speechText": "A short conversational summary written in ${language} (max 2 sentences)",
      "timelineSteps": ["Step 1", "Step 2"], 
      "quiz": { "question": "...", "options": ["...", "..."], "answer": "..." } or null
    }
    
    Example output: {"speechText": "Voter registration is the first step.", "timelineSteps": ["Check eligibility", "Submit form"], "quiz": null}`;

    try {
        // Initialize the model per-request to apply the dynamic system instruction
        const model = genAI.getGenerativeModel({
            model: "gemini-2.5-flash",
            systemInstruction: systemInstruction,
        });

        // --- CALL GEMINI API ---
        const result = await model.generateContent(message);
        const response = await result.response;
        const responseText = response.text();

        // --- CLEAN THE RESPONSE ---
        const cleanedText = responseText.replace(/```json|```/g, "").trim();

        try {
            // --- STRICT JSON PARSING ---
            const jsonResponse = JSON.parse(cleanedText);
            return res.json(jsonResponse);
        } catch (parseError) {
            // --- LOG FAILURE AND RETURN FALLBACK ---
            console.error("--- JSON PARSE FAILED ---");
            console.error("RAW STRING RECEIVED FROM GEMINI:");
            console.error(responseText); 
            console.error("ERROR MESSAGE:", parseError.message);
            console.error("-------------------------");

            return res.status(200).json({
                speechText: `I'm sorry ${name}, I had trouble formatting that answer. Could you ask me in a different way?`,
                timelineSteps: [],
                quiz: null
            });
        }

    } catch (apiError) {
        // --- LOG API FAILURES (401, 429, etc.) ---
        console.error("--- GEMINI API CALL FAILED ---");
        console.error(apiError.stack || apiError);
        console.error("------------------------------");

        return res.status(200).json({
            speechText: `I'm having trouble connecting to my electoral database right now, ${name}. Please try again in a moment.`,
            timelineSteps: [],
            quiz: null
        });
    }
});

// Start the server
app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
    console.log("Ready to handle Context-Aware queries.");
});
