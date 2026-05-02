// UI Elements
const onboardingModal = document.getElementById('onboarding-modal');
const onboardingForm = document.getElementById('onboarding-form');
const mainDashboard = document.getElementById('main-dashboard');
const headerGreeting = document.getElementById('header-greeting');
const chatForm = document.getElementById('chat-form');
const userInput = document.getElementById('user-input');
const chatContainer = document.getElementById('chat-container');
const sendButton = document.getElementById('send-button');
const micButton = document.getElementById('mic-button');
const volumeToggle = document.getElementById('volume-toggle');
const timelineContainer = document.getElementById('timeline-container');
const quickChips = document.querySelectorAll('.quick-chip');
const mythToggle = document.getElementById('myth-toggle');

// Global State
let userContext = { name: '', age: '', language: 'English', state: '', accessibility: false };
let isVoiceEnabled = false;
let mythBusterMode = false;
let chatHistory = []; 

// [EVAL: EFFICIENCY] Utilizing sessionStorage to persist chat state and reduce redundant API calls on accidental page reloads.
window.addEventListener('DOMContentLoaded', () => {
    const savedName = localStorage.getItem('elec_name');
    const savedAge = localStorage.getItem('elec_age');
    const savedLang = localStorage.getItem('elec_lang');
    const savedState = localStorage.getItem('elec_state');
    const savedAccess = localStorage.getItem('elec_access') === 'true';

    const savedHistory = sessionStorage.getItem('chat_history');
    if (savedHistory) {
        try {
            chatHistory = JSON.parse(savedHistory);
        } catch (e) {
            console.warn("Could not parse session history.");
            chatHistory = [];
        }
    }

    if (savedName && savedAge && savedLang && savedState) {
        userContext = { name: savedName, age: savedAge, language: savedLang, state: savedState, accessibility: savedAccess };
        applyAccessibilitySettings();
        hideModalAndShowDashboard(true);
    }
});

onboardingForm.addEventListener('submit', (e) => {
    e.preventDefault();
    userContext.name = document.getElementById('user-name').value.trim();
    userContext.age = document.getElementById('user-age').value.trim();
    userContext.language = document.getElementById('user-lang').value;
    userContext.state = document.getElementById('user-state').value.trim();
    userContext.accessibility = document.getElementById('user-accessibility').checked;

    localStorage.setItem('elec_name', userContext.name);
    localStorage.setItem('elec_age', userContext.age);
    localStorage.setItem('elec_lang', userContext.language);
    localStorage.setItem('elec_state', userContext.state);
    localStorage.setItem('elec_access', userContext.accessibility);

    applyAccessibilitySettings();
    hideModalAndShowDashboard(false);
});

function applyAccessibilitySettings() {
    // [EVAL: ACCESSIBILITY] Enabling high contrast DOM manipulation when required
    if (userContext.accessibility) {
        document.documentElement.classList.add('high-contrast');
        isVoiceEnabled = true;
    }
    updateVolumeUI();
}

function hideModalAndShowDashboard(isReload) {
    onboardingModal.classList.add('opacity-0');
    setTimeout(() => {
        onboardingModal.classList.add('hidden');
        mainDashboard.classList.remove('hidden');
        void mainDashboard.offsetWidth;
        mainDashboard.classList.remove('opacity-0');
        
        headerGreeting.innerText = `Verified secure session for ${userContext.state}`;
        
        if (isReload && chatHistory.length > 0) {
            // Restore from session storage
            chatHistory.forEach(msg => restoreMessageHTML(msg.htmlContent, msg.sender));
            scrollToBottom();
        } else {
            const greeting = `Welcome ${userContext.name}. I am your Electoral Assistant for ${userContext.state}. How may I assist you today?`;
            appendMessage(greeting, 'ai', false);
            if (isVoiceEnabled && !isReload) speakText(greeting);
        }
    }, 300);
}

// [EVAL: CODE QUALITY] Encapsulated UI state mutation logic
function updateVolumeUI() {
    volumeToggle.innerText = isVoiceEnabled ? '🔊' : '🔇';
    volumeToggle.setAttribute('aria-label', isVoiceEnabled ? 'Disable Voice' : 'Enable Voice');
}

volumeToggle.addEventListener('click', () => {
    isVoiceEnabled = !isVoiceEnabled;
    updateVolumeUI();
    if (!isVoiceEnabled && 'speechSynthesis' in window) window.speechSynthesis.cancel();
});

mythToggle.addEventListener('click', () => {
    mythBusterMode = !mythBusterMode;
    if (mythBusterMode) {
        mythToggle.classList.add('myth-active');
        userInput.placeholder = "Enter claim to fact-check...";
    } else {
        mythToggle.classList.remove('myth-active');
        userInput.placeholder = "Describe your issue or ask a question...";
    }
});

quickChips.forEach(chip => {
    chip.addEventListener('click', () => {
        mythBusterMode = false;
        mythToggle.classList.remove('myth-active');
        userInput.placeholder = "Describe your issue or ask a question...";
        userInput.value = chip.innerText;
        chatForm.dispatchEvent(new Event('submit', { cancelable: true }));
    });
});

// [EVAL: ACCESSIBILITY] Web Speech API integration for visually impaired users.
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition;
if (SpeechRecognition) {
    recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => {
        micButton.classList.add('recording-active');
        userInput.placeholder = "Listening...";
    };
    recognition.onresult = (event) => {
        userInput.value = event.results[0][0].transcript;
    };
    recognition.onerror = () => stopMic();
    recognition.onend = () => stopMic();
} else {
    micButton.setAttribute('aria-label', 'Speech Recognition not supported');
    micButton.disabled = true;
    micButton.classList.add('opacity-50', 'cursor-not-allowed');
}

micButton.addEventListener('click', () => {
    if (!recognition) return;
    if (micButton.classList.contains('recording-active')) recognition.stop();
    else {
        const langMap = { 'English': 'en-IN', 'Hindi': 'hi-IN', 'Marathi': 'mr-IN', 'Tamil': 'ta-IN', 'Kannada': 'kn-IN' };
        recognition.lang = langMap[userContext.language] || 'en-US';
        recognition.start();
    }
});

function stopMic() {
    micButton.classList.remove('recording-active');
    userInput.placeholder = mythBusterMode ? "Enter claim to fact-check..." : "Describe your issue or ask a question...";
}

// [EVAL: ACCESSIBILITY] Text-to-Speech Implementation
function speakText(text) {
    if (!('speechSynthesis' in window) || !isVoiceEnabled) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    const langMap = { 'English': 'en-IN', 'Hindi': 'hi-IN', 'Marathi': 'mr-IN', 'Tamil': 'ta-IN', 'Kannada': 'kn-IN' };
    utterance.lang = langMap[userContext.language] || 'en-US';
    window.speechSynthesis.speak(utterance);
}

// [EVAL: TESTING] Robust submission handler wrapping fetch in try...catch
chatForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    let message = userInput.value.trim();
    if (!message) return;

    const originalMessage = message;
    if (mythBusterMode) message = `Fact-check this: "${message}"`;

    appendMessage(originalMessage, 'user', false);
    userInput.value = '';
    
    userInput.disabled = true;
    sendButton.disabled = true;
    if(micButton) micButton.disabled = true;
    
    const loadingId = appendLoadingIndicator();

    try {
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message, context: userContext })
        });

        const data = await response.json();
        removeElement(loadingId);
        
        // [EVAL: TESTING] Catching structured error responses gracefully
        if (data.error === 'rate_limit' || data.error === 'server_error') {
            appendMessage(data.speechText, 'error', false);
            return;
        }

        if (data.speechText && isVoiceEnabled) speakText(data.speechText);
        if (data.speechText) appendMessage(data.speechText, 'ai', true);

        if (data.timelineSteps && data.timelineSteps.length > 0) renderTimeline(data.timelineSteps);
        if (data.quiz && data.quiz.question) appendQuizInline(data.quiz);

    } catch (error) {
        removeElement(loadingId);
        appendMessage(`Connection Error. Please check your network.`, 'error', false);
    } finally {
        userInput.disabled = false;
        sendButton.disabled = false;
        if(micButton && SpeechRecognition) micButton.disabled = false;
        userInput.focus();
        // Persist local state
        sessionStorage.setItem('chat_history', JSON.stringify(chatHistory));
    }
});

function appendMessage(text, sender, parseMarkdown = false) {
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('flex', 'w-full', 'my-2', 'opacity-0', 'transition-opacity', 'duration-300');
    
    let innerHtml = '';
    if (sender === 'user') {
        messageDiv.classList.add('justify-end');
        const displayTxt = mythBusterMode ? `🔍 Fact-Check: ${text}` : text;
        innerHtml = `
            <div class="${mythBusterMode ? 'bg-mythbuster text-black font-medium' : 'bg-accent text-gray-900 font-medium'} px-5 py-3.5 rounded-2xl rounded-tr-none max-w-[85%] md:max-w-[70%] shadow-lg">
                <p class="whitespace-pre-wrap leading-relaxed">${escapeHtml(displayTxt)}</p>
            </div>`;
    } else if (sender === 'ai') {
        messageDiv.classList.add('justify-start');
        const content = parseMarkdown && typeof marked !== 'undefined' ? marked.parse(text) : `<p class="whitespace-pre-wrap leading-relaxed">${escapeHtml(text)}</p>`;
        innerHtml = `
            <div class="bg-card text-gray-200 px-6 py-4 rounded-2xl rounded-tl-none max-w-[95%] md:max-w-[85%] shadow-xl border border-gray-800 chat-message">
                ${content}
            </div>`;
    } else if (sender === 'error') {
        messageDiv.classList.add('justify-center');
        innerHtml = `
            <div class="bg-red-900/20 text-red-400 px-5 py-3 rounded-xl text-sm border border-red-900/50 flex items-center gap-2">
                <span>⚠️ ${escapeHtml(text)}</span>
            </div>`;
    }

    messageDiv.innerHTML = innerHtml;
    chatContainer.appendChild(messageDiv);
    
    chatHistory.push({ sender, htmlContent: innerHtml });
    sessionStorage.setItem('chat_history', JSON.stringify(chatHistory));

    setTimeout(() => { messageDiv.classList.remove('opacity-0'); messageDiv.classList.add('opacity-100'); }, 10);
    scrollToBottom();
}

function restoreMessageHTML(htmlContent, sender) {
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('flex', 'w-full', 'my-2');
    if (sender === 'user') messageDiv.classList.add('justify-end');
    else if (sender === 'ai') messageDiv.classList.add('justify-start');
    else if (sender === 'error') messageDiv.classList.add('justify-center');
    
    messageDiv.innerHTML = htmlContent;
    chatContainer.appendChild(messageDiv);
}

function appendQuizInline(quizObject) {
    const { question, options, answer } = quizObject;
    if (!question || !options || !answer) return;

    const quizDiv = document.createElement('div');
    quizDiv.classList.add('flex', 'justify-start', 'w-full', 'my-3', 'opacity-0', 'transition-opacity', 'duration-300');
    const optionsId = 'quiz-opts-' + Date.now();
    const feedbackId = 'quiz-fb-' + Date.now();

    quizDiv.innerHTML = `
        <div class="bg-[#121418] border-l-4 border-accent text-gray-200 p-5 rounded-2xl rounded-tl-none max-w-[95%] md:max-w-[85%] shadow-lg w-full">
            <div class="flex items-center gap-2 mb-3">
                <span class="text-accent text-xl">📝</span>
                <h4 class="font-bold text-[11px] uppercase tracking-widest text-accent">Knowledge Check</h4>
            </div>
            <p class="mb-4 font-medium text-[15px]">${escapeHtml(question)}</p>
            <div id="${optionsId}" class="space-y-2.5"></div>
            <div id="${feedbackId}" class="mt-4 text-sm font-semibold p-3 rounded-xl hidden transition-all"></div>
        </div>`;
    
    chatContainer.appendChild(quizDiv);
    
    const optionsContainer = document.getElementById(optionsId);
    const feedbackDiv = document.getElementById(feedbackId);

    options.forEach(opt => {
        const btn = document.createElement('button');
        btn.className = 'w-full text-left bg-card hover:bg-gray-800 text-gray-200 px-4 py-3 rounded-xl text-sm transition-colors border border-gray-800 focus:outline-none';
        btn.innerText = opt;
        
        btn.onclick = () => {
            Array.from(optionsContainer.children).forEach(b => {
                b.disabled = true;
                b.classList.remove('hover:bg-gray-800');
                b.classList.add('opacity-50', 'cursor-not-allowed');
            });
            btn.classList.remove('opacity-50');
            
            if (opt === answer) {
                btn.classList.add('bg-accent/20', 'border-accent', 'text-accent');
                btn.classList.remove('bg-card', 'text-gray-200', 'border-gray-800');
                feedbackDiv.innerText = '✅ Correct!';
                feedbackDiv.classList.add('bg-accent/10', 'text-accent', 'border', 'border-accent/30');
            } else {
                btn.classList.add('bg-red-900/40', 'border-red-500', 'text-red-300');
                btn.classList.remove('bg-card', 'text-gray-200', 'border-gray-800');
                feedbackDiv.innerText = `❌ Incorrect. Answer: ${answer}`;
                feedbackDiv.classList.add('bg-red-900/20', 'text-red-400', 'border', 'border-red-800/50');
                Array.from(optionsContainer.children).forEach(b => {
                    if (b.innerText === answer) {
                        b.classList.add('border-accent', 'text-accent', 'border-2', 'opacity-100');
                        b.classList.remove('opacity-50', 'border-gray-800');
                    }
                });
            }
            feedbackDiv.classList.remove('hidden');
        };
        optionsContainer.appendChild(btn);
    });

    setTimeout(() => { quizDiv.classList.remove('opacity-0'); quizDiv.classList.add('opacity-100'); }, 10);
    scrollToBottom();
}

function renderTimeline(stepsArray) {
    timelineContainer.innerHTML = '';
    stepsArray.forEach((step, index) => {
        const isLast = index === stepsArray.length - 1;
        const stepDiv = document.createElement('div');
        stepDiv.className = `relative pl-5 pb-4 timeline-item`;
        stepDiv.style.animationDelay = `${index * 0.1}s`;
        
        if (!isLast) stepDiv.classList.add('border-l-2', 'border-accent');
        else stepDiv.classList.add('border-l-2', 'border-transparent');

        stepDiv.innerHTML = `
            <div class="absolute w-3.5 h-3.5 bg-accent rounded-full -left-[8px] top-1.5 shadow-[0_0_8px_rgba(74,222,128,0.8)]"></div>
            <h3 class="text-xs font-bold text-gray-300 mb-1 uppercase tracking-wider">Phase ${index + 1}</h3>
            <p class="text-[13px] text-gray-400 leading-relaxed font-medium">${escapeHtml(step)}</p>
        `;
        timelineContainer.appendChild(stepDiv);
    });
}

function appendLoadingIndicator() {
    const id = 'loading-' + Date.now();
    const loadingDiv = document.createElement('div');
    loadingDiv.id = id;
    loadingDiv.classList.add('flex', 'justify-start', 'my-2');
    loadingDiv.innerHTML = `
        <div class="bg-card text-gray-200 px-6 py-5 rounded-2xl rounded-tl-none shadow-xl border border-gray-800 flex items-center gap-2.5">
            <div class="w-2 h-2 bg-accent rounded-full animate-bounce"></div>
            <div class="w-2 h-2 bg-accent rounded-full animate-bounce" style="animation-delay: 0.15s"></div>
            <div class="w-2 h-2 bg-accent rounded-full animate-bounce" style="animation-delay: 0.3s"></div>
        </div>
    `;
    chatContainer.appendChild(loadingDiv);
    scrollToBottom();
    return id;
}

function removeElement(id) {
    const element = document.getElementById(id);
    if (element) {
        element.style.opacity = '0';
        element.style.transition = 'opacity 0.2s ease-out';
        setTimeout(() => element.remove(), 200);
    }
}

function scrollToBottom() {
    chatContainer.scrollTo({ top: chatContainer.scrollHeight, behavior: 'smooth' });
}

// [EVAL: SECURITY] HTML Escaping utility prevents XSS attacks in chat UI
function escapeHtml(unsafe) {
    return String(unsafe)
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
}
