require('dotenv').config();
const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

// Initialize Google Generative AI with API key
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.warn("WARNING: GEMINI_API_KEY is not set in the environment variables.");
}

const genAI = new GoogleGenerativeAI(apiKey);
// Ensure we use the requested model
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

// Middleware to parse JSON and serve static files
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Chat API Route
app.post('/api/chat', async (req, res) => {
    try {
        const userMessage = req.body.message;
        
        if (!userMessage) {
            return res.status(400).json({ error: 'Message is required' });
        }

        // Generate content using Gemini
        const result = await model.generateContent({
            contents: [{ role: 'user', parts: [{ text: userMessage }] }]
        });
        
        const responseText = result.response.text();
        
        res.json({ reply: responseText });
    } catch (error) {
        console.error('Error calling Gemini API:', error);
        
        // Handle gracefully, send generic message to client or detailed error if needed
        res.status(500).json({ 
            error: 'Failed to generate response',
            details: error.message
        });
    }
});

// Start Server
app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});
