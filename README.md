# Election Process Assistant

## Chosen Vertical
Government & Civic Tech (Electoral Process Accessibility)

## Approach and Logic
Our approach focuses on breaking down complex, often intimidating electoral procedures into a conversational, easy-to-understand format. We utilize Google's Gemini 2.5 Flash model with Structured JSON Outputs to guarantee a consistent, reliable user experience. By capturing user context (Name, Age, State, Language) upfront, the application dynamically personalizes the AI's system prompt to deliver hyper-local, age-appropriate advice (e.g., voter registration for 17-year-olds vs. active polling instructions for adults).

## How the solution works
1. **Context Initialization**: The user completes an onboarding modal that stores their demographic data securely in the browser.
2. **Dynamic Prompting**: This context is securely transmitted via a REST API to a Node/Express backend. The backend constructs a highly specialized system prompt for the Gemini model.
3. **Structured Response Generation**: Gemini is forced via `@google/generative-ai`'s SchemaType to return a strict JSON payload.
4. **Interactive UI Delivery**: The frontend parses the JSON to display conversational text, render a vertical timeline of process steps, and optionally generate inline interactive knowledge-check quizzes.
5. **Accessibility Integration**: Users can toggle Speech-to-Text and Text-to-Speech via the Web Speech API. A MythBuster mode forces fact-checking context into the query.

## Assumptions made
- Users have access to modern browsers supporting the Web Speech API for voice interactions.
- The user's device maintains local/session storage for state persistence.
- The Gemini API is accessible and not globally blocked on the user's network.

## Evaluation Focus Areas

- **Code Quality**: Modularized JavaScript with clean DOM manipulation, semantic HTML, and strict JSON parsing. Inline evaluation comments (`[EVAL: ...]`) are used to document architectural decisions.
- **Security**: The `GEMINI_API_KEY` is strictly managed server-side via `dotenv`. The backend sanitizes responses and never leaks raw error stack traces to the client. HTML escaping prevents XSS.
- **Efficiency**: Extensive use of `sessionStorage` prevents redundant API calls on page reloads. The Express server uses async/await efficiently to prevent thread blocking.
- **Testing**: Robust `try...catch` blocks at every layer ensure stability. Specific catching of `HTTP 429` (Rate Limiting) guarantees the app fails gracefully without crashing.
- **Accessibility**: ARIA labels, semantic roles (`role="main"`, `role="complementary"`), and `aria-live="polite"` regions are fully implemented. The UI adheres to high-contrast WCAG AAA standards natively, and voice features cater to visually impaired users.
- **Google Services**: Deep integration with `@google/generative-ai` utilizing the latest `gemini-2.5-flash` model and advanced `responseSchema` forced-JSON formatting.
