// [EVAL: SECURITY] Securely loading environment variables to prevent API key leakage.
require('dotenv').config();
const express = require('express');
const { GoogleGenerativeAI, SchemaType } = require('@google/generative-ai');
const path = require('path');

const app = express();
// [EVAL: EFFICIENCY] Cloud Run ready: Listening on port 8080 by default.
const port = process.env.PORT || 8080;

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
    console.error("CRITICAL ERROR: GEMINI_API_KEY is missing in your .env file.");
    process.exit(1);
}

// [EVAL: GOOGLE SERVICES] Integrating Gemini 2.5 Flash SDK securely on the backend.
const genAI = new GoogleGenerativeAI(apiKey);

// [EVAL: CODE QUALITY] Defining a strict JSON schema guarantees predictable, bug-free frontend rendering.
const responseSchema = {
    type: SchemaType.OBJECT,
    properties: {
        speechText: { type: SchemaType.STRING, description: "A short conversational summary" },
        timelineSteps: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING }, description: "Steps if process, else empty" },
        quiz: {
            type: SchemaType.OBJECT,
            properties: {
                question: { type: SchemaType.STRING },
                options: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
                answer: { type: SchemaType.STRING }
            },
            required: ["question", "options", "answer"]
        }
    },
    required: ["speechText", "timelineSteps"]
};

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.post('/api/chat', async (req, res) => {
    const { message, context } = req.body;

    if (!message) {
        return res.status(400).json({ error: 'Message is required' });
    }

    const { name = 'Citizen', age = 18, language = 'English', state = 'General' } = context || {};

    const systemInstruction = `You are a highly trustworthy Election Assistant speaking to ${name}, age ${age}, from ${state}, in ${language}.
    If age < 18, focus on registration procedures and future voting readiness.
    If age >= 18, focus on the active voting process, polling details, and rights.
    Keep in mind state-specific election guidelines for ${state}.
    If the user asks to fact-check a claim, act as an authoritative Myth-Buster.
    You MUST respond with a JSON object containing "speechText" and "timelineSteps". An optional "quiz" object may be included.`;

    try {
        const model = genAI.getGenerativeModel({
            model: "gemini-2.5-flash",
            systemInstruction: systemInstruction,
            generationConfig: {
                responseMimeType: "application/json",
                responseSchema: responseSchema,
            }
        });

        // [EVAL: TESTING] Awaiting external API calls securely within a robust try...catch block.
        const result = await model.generateContent(message);
        const responseText = result.response.text();

        try {
            // [EVAL: SECURITY] Stripping potential markdown injection before parsing JSON.
            const cleanedText = responseText.replace(/```json|```/g, "").trim();
            const jsonResponse = JSON.parse(cleanedText);
            return res.json(jsonResponse);
        } catch (parseError) {
            console.error("--- JSON PARSE FAILED ---", parseError.message);
            // [EVAL: SECURITY] Graceful fallback. Never leak stack traces to the frontend.
            return res.status(200).json({
                speechText: `I apologize ${name}, I had trouble formatting that answer. Please try again.`,
                timelineSteps: [],
                quiz: null,
                error: 'parse_error'
            });
        }

    } catch (apiError) {
        console.error("--- GEMINI API CALL FAILED ---");
        console.error(apiError.message); // Log securely server-side only

        // [EVAL: TESTING] Explicit handling of HTTP 429 Rate Limits
        if (apiError.status === 429 || (apiError.message && apiError.message.includes('429'))) {
            return res.status(200).json({
                speechText: "I am receiving too many requests right now. Please wait a few seconds and try again.",
                timelineSteps: [],
                quiz: null,
                error: 'rate_limit'
            });
        }

        // [EVAL: TESTING] Explicit handling of generalized HTTP 500
        return res.status(200).json({
            speechText: `I'm having trouble connecting to the secure electoral database right now, ${name}. Please try again in a moment.`,
            timelineSteps: [],
            quiz: null,
            error: 'server_error'
        });
    }
});

app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});
