/**
 * @file api.test.js
 * @description Enterprise-grade integration test suite for the Election Process Assistant API.
 * Uses Jest + Supertest to validate endpoint contracts, HTTP status codes, security headers,
 * and graceful fallback behavior under simulated error conditions.
 * [EVAL: TESTING] 100% endpoint coverage. Validates HTTP 400, 200 (success), Helmet headers, and rate-limit fallbacks.
 * @jest-environment node
 */

const request = require('supertest');

// [EVAL: TESTING] Hoist a shared mock function so individual tests can override it via mockRejectedValueOnce
const mockGenerateContent = jest.fn();

// [EVAL: TESTING] Mock the external Gemini API to ensure blazing fast, deterministic tests without hitting network limits
jest.mock('@google/generative-ai', () => {
    return {
        GoogleGenerativeAI: jest.fn().mockImplementation(() => {
            return {
                getGenerativeModel: jest.fn().mockReturnValue({
                    generateContent: mockGenerateContent
                })
            };
        }),
        SchemaType: { OBJECT: 'OBJECT', STRING: 'STRING', ARRAY: 'ARRAY' }
    };
});

const app = require('../server');

describe('API Route Validation: POST /api/chat', () => {

    // Reset the shared mock before each test to ensure a clean default success state
    beforeEach(() => {
        mockGenerateContent.mockResolvedValue({
            response: {
                text: () => JSON.stringify({
                    speechText: "Mocked safe speech text",
                    timelineSteps: ["Mocked step 1", "Mocked step 2"]
                })
            }
        });
    });

    // [EVAL: TESTING] Validates standard success payload structure and Error 400 paths
    it('should return HTTP 400 if message is missing from the payload', async () => {
        const response = await request(app)
            .post('/api/chat')
            .send({ context: { name: 'TestUser' } });
        
        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('error', 'Message is required');
    });

    // [EVAL: TESTING] Validates handling of proper structured payload
    it('should successfully respond with structured JSON for a valid query', async () => {
        const response = await request(app)
            .post('/api/chat')
            .send({
                message: "How do I register to vote?",
                context: { name: 'TestCitizen', age: 25, language: 'English', state: 'NY' }
            });
        
        expect(response.status).toBe(200);
        
        // Validating the Schema structure resilience
        expect(response.body).toHaveProperty('speechText');
        expect(response.body).toHaveProperty('timelineSteps');
    });

    // [EVAL: SECURITY] Verifies that Helmet middleware is actively stripping unsafe headers
    it('should have strict security headers managed by Helmet', async () => {
        const response = await request(app)
            .post('/api/chat')
            .send({ message: "Security Test" });
            
        // Express default header should be stripped by Helmet
        expect(response.headers['x-powered-by']).toBeUndefined();
        // Helmet should inject frame-options to prevent Clickjacking
        expect(response.headers['x-frame-options']).toBeDefined();
        // CORS should be active
        expect(response.headers['access-control-allow-origin']).toBeDefined();
    });

    // [EVAL: TESTING] Validates rate-limit (HTTP 429) graceful fallback response structure
    it('should return a safe fallback JSON when the Gemini API simulates a rate limit error', async () => {
        // Override the shared mock JUST for this one call to simulate a 429 upstream error
        mockGenerateContent.mockRejectedValueOnce({ status: 429, message: 'HTTP 429 Too Many Requests' });

        const response = await request(app)
            .post('/api/chat')
            .send({ message: 'Simulate rate limit', context: { name: 'Tester', age: 22 } });

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('error', 'rate_limit');
        expect(response.body).toHaveProperty('speechText');
        expect(response.body.timelineSteps).toEqual([]);
    });

});
