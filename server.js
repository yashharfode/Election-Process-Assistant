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

// 2. Configure the model with a strict System Prompt
// This tells Gemini to act as an expert and ONLY return JSON
const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    systemInstruction: `You are an expert Election Assistant. 
    You MUST respond ONLY with a raw JSON object. 
    Do not include markdown backticks (like \`\`\`json), do not include a preamble, and do not include any text after the JSON.
    
    The structure MUST be:
    {
      "speechText": "A short conversational summary (max 2 sentences)",
      "timelineSteps": ["Step 1", "Step 2"], 
      "quiz": { "question": "...", "options": ["...", "..."], "answer": "..." } or null
    }
    
    Example output: {"speechText": "Voter registration is the first step.", "timelineSteps": ["Check eligibility", "Submit form"], "quiz": null}`,
});

// Middleware to serve static files and parse JSON
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// 3. Robust /api/chat Endpoint
app.post('/api/chat', async (req, res) => {
    const userMessage = req.body.message;

    if (!userMessage) {
        return res.status(400).json({ error: 'Message is required' });
    }

    try {
        // --- CALL GEMINI API ---
        const result = await model.generateContent(userMessage);
        const response = await result.response;
        const responseText = response.text();

        // --- CLEAN THE RESPONSE ---
        // Strip out markdown formatting (like ```json and ```) if they exist
        const cleanedText = responseText.replace(/```json|```/g, "").trim();

        try {
            // --- STRICT JSON PARSING ---
            const jsonResponse = JSON.parse(cleanedText);
            return res.json(jsonResponse);
        } catch (parseError) {
            // --- LOG FAILURE AND RETURN FALLBACK ---
            console.error("--- JSON PARSE FAILED ---");
            console.error("RAW STRING RECEIVED FROM GEMINI:");
            console.error(responseText); // Log the exact string to terminal
            console.error("ERROR MESSAGE:", parseError.message);
            console.error("-------------------------");

            // Return a safe 200 response with fallback content to keep the UI alive
            return res.status(200).json({
                speechText: "I'm sorry, I had trouble formatting that answer. Could you ask me in a different way?",
                timelineSteps: [],
                quiz: null
            });
        }

    } catch (apiError) {
        // --- LOG API FAILURES (401, 429, etc.) ---
        console.error("--- GEMINI API CALL FAILED ---");
        console.error(apiError.stack || apiError);
        console.error("------------------------------");

        // Return a graceful fallback instead of a 500 error
        return res.status(200).json({
            speechText: "I'm having trouble connecting to my electoral database right now. Please try again in a moment.",
            timelineSteps: [],
            quiz: null
        });
    }
});

// Start the server
app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
    console.log("Ready to handle Election Assistant queries.");
});
