# Election Process Assistant

## Chosen Vertical
Challenge 2 - Election Process Education

## Approach and Logic
Our approach breaks down complex, often intimidating electoral procedures into a conversational, highly accessible format. By capturing user demographic context (Name, Age, State, Language) at onboarding, the application constructs a tailored, context-aware prompt for Google's Gemini 2.5 Flash model. We utilize Structured JSON Outputs (`responseSchema` and `responseMimeType`) to ensure the model responds with a strictly typed JSON payload, guaranteeing predictable rendering of speech summaries, interactive timelines, and inline quizzes on the frontend without parsing errors.

## How the solution works
**Local Run:**
1. Clone the repository and run `npm install`.
2. Create a `.env` file and insert your `GEMINI_API_KEY`.
3. Run `npm start` (or `node server.js`) to launch the Express backend.
4. Navigate to `http://localhost:8080`.

**Cloud Run Deployment Structure:**
1. The `package.json` natively defines `"scripts": { "start": "node server.js" }`.
2. The `server.js` listens to `process.env.PORT || 8080`, instantly binding to Cloud Run's default exposed port.
3. Deploy directly via the Google Cloud CLI: `gcloud run deploy --source .`

## Assumptions made
- Users have access to modern browsers (Chrome/Edge/Safari) supporting the native Web Speech API for both Speech Recognition (Mic input) and Speech Synthesis (Voice output).
- The user's device allows `sessionStorage` and `localStorage` to persist the chat state and onboarding context.
- API rate limits (HTTP 429) from the Generative AI service will occur under heavy load, requiring explicit UI fallbacks instead of server crashes.

## Evaluation Focus Areas

- **Code Quality**: Modularized, single-page architecture with clean DOM manipulation. We used `@google/generative-ai`'s `SchemaType` to force JSON output, preventing unreliable markdown parsing.
- **Security**: The `GEMINI_API_KEY` is completely isolated server-side via `dotenv`. The backend sanitizes responses, explicitly catches HTTP 429 and HTTP 500 exceptions, and never leaks raw error stack traces to the client. HTML escaping prevents XSS.
- **Efficiency**: Extensive use of `sessionStorage` automatically rebuilds the DOM on accidental page reloads, entirely preventing redundant API calls to the LLM. The Node.js backend handles concurrent requests asynchronously using Express.
- **Testing**: We implemented robust `try...catch` blocks wrapping all network calls. Explicit testing for `HTTP 429` (Rate Limiting) guarantees the app fails gracefully, returning a structured JSON warning rather than crashing the instance.
- **Accessibility**: 
  - *ARIA & Roles*: Semantic HTML (`role="main"`, `role="complementary"`) and exhaustive `aria-label` tags.
  - *WCAG*: High-contrast mode natively enforces AAA standard contrast ratios.
  - *Voice Tools*: Implemented both native Text-to-Speech (`window.speechSynthesis`) and Speech-to-Text (`webkitSpeechRecognition`) for visually and mobility-impaired users.
- **Google Services**: Deep integration with Google Cloud Run (port 8080 bindings) and the `@google/generative-ai` SDK utilizing the cutting-edge `gemini-2.5-flash` model.
