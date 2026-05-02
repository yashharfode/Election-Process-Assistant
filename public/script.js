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

// Global State
let userContext = { name: '', age: '', language: 'English' };
let isVoiceEnabled = true;

// 1. ONBOARDING MODAL LOGIC
window.addEventListener('DOMContentLoaded', () => {
    const savedName = localStorage.getItem('elec_name');
    const savedAge = localStorage.getItem('elec_age');
    const savedLang = localStorage.getItem('elec_lang');

    if (savedName && savedAge && savedLang) {
        userContext = { name: savedName, age: savedAge, language: savedLang };
        hideModalAndShowDashboard();
    }
});

onboardingForm.addEventListener('submit', (e) => {
    e.preventDefault();
    userContext.name = document.getElementById('user-name').value.trim();
    userContext.age = document.getElementById('user-age').value.trim();
    userContext.language = document.getElementById('user-lang').value;

    localStorage.setItem('elec_name', userContext.name);
    localStorage.setItem('elec_age', userContext.age);
    localStorage.setItem('elec_lang', userContext.language);

    hideModalAndShowDashboard();
});

function hideModalAndShowDashboard() {
    onboardingModal.classList.add('opacity-0');
    setTimeout(() => {
        onboardingModal.classList.add('hidden');
        mainDashboard.classList.remove('hidden');
        // Trigger reflow for transition
        void mainDashboard.offsetWidth;
        mainDashboard.classList.remove('opacity-0');
        
        headerGreeting.innerText = `Ask me anything about electoral procedures.`;
        
        // Initial greeting
        const greeting = `Hello ${userContext.name}! I am ready to assist you in ${userContext.language}. How can I help you with the election process today?`;
        appendMessage(greeting, 'ai');
        if (isVoiceEnabled) speakText(greeting);

    }, 300);
}

// 2. VOICE TOGGLE LOGIC
volumeToggle.addEventListener('click', () => {
    isVoiceEnabled = !isVoiceEnabled;
    volumeToggle.innerText = isVoiceEnabled ? '🔊' : '🔇';
    volumeToggle.title = isVoiceEnabled ? 'Disable Voice' : 'Enable Voice';
    if (!isVoiceEnabled && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
    }
});

// 3. QUICK CHIPS LOGIC
quickChips.forEach(chip => {
    chip.addEventListener('click', () => {
        userInput.value = chip.innerText;
        // Trigger submit
        chatForm.dispatchEvent(new Event('submit', { cancelable: true }));
    });
});

// Web Speech API (Speech-to-Text)
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
        const transcript = event.results[0][0].transcript;
        userInput.value = transcript;
    };

    recognition.onerror = (event) => {
        console.error("Speech Recognition Error:", event.error);
        stopMic();
    };

    recognition.onend = () => {
        stopMic();
    };
} else {
    micButton.title = "Speech Recognition not supported in this browser.";
    micButton.disabled = true;
    micButton.classList.add('opacity-50', 'cursor-not-allowed');
}

micButton.addEventListener('click', () => {
    if (!recognition) return;
    if (micButton.classList.contains('recording-active')) {
        recognition.stop();
    } else {
        const langMap = { 'English': 'en-IN', 'Hindi': 'hi-IN', 'Marathi': 'mr-IN', 'Tamil': 'ta-IN', 'Kannada': 'kn-IN' };
        recognition.lang = langMap[userContext.language] || 'en-US';
        recognition.start();
    }
});

function stopMic() {
    micButton.classList.remove('recording-active');
    userInput.placeholder = "Type your message here...";
}

// Text-to-Speech (SpeechSynthesis)
function speakText(text) {
    if (!('speechSynthesis' in window) || !isVoiceEnabled) return;
    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    const langMap = { 'English': 'en-IN', 'Hindi': 'hi-IN', 'Marathi': 'mr-IN', 'Tamil': 'ta-IN', 'Kannada': 'kn-IN' };
    utterance.lang = langMap[userContext.language] || 'en-US';
    utterance.rate = 1;
    
    window.speechSynthesis.speak(utterance);
}

// Handle Chat Form Submission
chatForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const message = userInput.value.trim();
    if (!message) return;

    appendMessage(message, 'user');
    userInput.value = '';
    
    userInput.disabled = true;
    sendButton.disabled = true;
    if(micButton) micButton.disabled = true;
    
    const loadingId = appendLoadingIndicator();

    try {
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            // Sending context with every request
            body: JSON.stringify({ message, context: userContext })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || `Server error: ${response.status}`);
        }
        
        removeElement(loadingId);
        
        if (data.speechText && isVoiceEnabled) {
            speakText(data.speechText);
        }

        if (data.speechText) {
            appendMessage(data.speechText, 'ai');
        }

        if (data.timelineSteps && Array.isArray(data.timelineSteps) && data.timelineSteps.length > 0) {
            renderTimeline(data.timelineSteps);
        } else if (data.timelineSteps) {
            timelineContainer.innerHTML = '<p class="text-gray-500 text-sm italic">Ask about an election process to see the steps here.</p>';
        }

        // 4. Render Inline Quiz
        if (data.quiz && data.quiz.question) {
            appendQuizInline(data.quiz);
        }

    } catch (error) {
        console.error('Error fetching chat response:', error);
        removeElement(loadingId);
        appendMessage(`System Error: ${error.message}. Please try again later.`, 'error');
    } finally {
        userInput.disabled = false;
        sendButton.disabled = false;
        if(micButton && SpeechRecognition) micButton.disabled = false;
        userInput.focus();
    }
});

// Append regular chat messages
function appendMessage(text, sender) {
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('flex', 'w-full', 'my-2', 'opacity-0', 'transition-opacity', 'duration-300');
    
    let innerHtml = '';

    if (sender === 'user') {
        messageDiv.classList.add('justify-end');
        innerHtml = `
            <div class="bg-accent text-white px-6 py-4 rounded-2xl rounded-tr-none max-w-[85%] shadow-lg">
                <p class="whitespace-pre-wrap leading-relaxed">${escapeHtml(text)}</p>
            </div>
        `;
    } else if (sender === 'ai') {
        messageDiv.classList.add('justify-start');
        const content = typeof marked !== 'undefined' ? marked.parse(text) : `<p class="whitespace-pre-wrap leading-relaxed">${escapeHtml(text)}</p>`;
        innerHtml = `
            <div class="bg-gray-800/80 text-gray-200 px-6 py-4 rounded-2xl rounded-tl-none max-w-[85%] shadow-md border border-gray-700 backdrop-blur-sm chat-message">
                ${content}
            </div>
        `;
    } else if (sender === 'error') {
        messageDiv.classList.add('justify-center');
        innerHtml = `
            <div class="bg-red-900/30 text-red-400 px-5 py-3 rounded-xl text-sm border border-red-800/50 flex items-center gap-2">
                <span>${escapeHtml(text)}</span>
            </div>
        `;
    }

    messageDiv.innerHTML = innerHtml;
    chatContainer.appendChild(messageDiv);
    
    setTimeout(() => {
        messageDiv.classList.remove('opacity-0');
        messageDiv.classList.add('opacity-100');
    }, 10);

    scrollToBottom();
}

// Render Inline Quiz inside the chat container
function appendQuizInline(quizObject) {
    const { question, options, answer } = quizObject;
    if (!question || !options || !answer) return;

    const quizDiv = document.createElement('div');
    quizDiv.classList.add('flex', 'justify-start', 'w-full', 'my-3', 'opacity-0', 'transition-opacity', 'duration-300');
    
    const optionsId = 'quiz-opts-' + Date.now();
    const feedbackId = 'quiz-fb-' + Date.now();

    quizDiv.innerHTML = `
        <div class="bg-[#1e1e1e] border-l-4 border-accent text-gray-200 p-5 rounded-2xl rounded-tl-none max-w-[85%] shadow-lg w-full">
            <div class="flex items-center gap-2 mb-3">
                <span class="text-accent text-xl">💡</span>
                <h4 class="font-bold text-xs uppercase tracking-widest text-accent">Quick Quiz</h4>
            </div>
            <p class="mb-4 font-medium text-[15px]">${escapeHtml(question)}</p>
            <div id="${optionsId}" class="space-y-2.5"></div>
            <div id="${feedbackId}" class="mt-4 text-sm font-semibold p-3 rounded-xl hidden transition-all"></div>
        </div>
    `;

    chatContainer.appendChild(quizDiv);
    
    const optionsContainer = document.getElementById(optionsId);
    const feedbackDiv = document.getElementById(feedbackId);

    options.forEach(opt => {
        const btn = document.createElement('button');
        btn.className = 'w-full text-left bg-gray-800 hover:bg-gray-700 text-gray-200 px-4 py-3 rounded-xl text-sm transition-colors border border-gray-700 focus:outline-none focus:ring-1 focus:ring-accent';
        btn.innerText = opt;
        
        btn.onclick = () => {
            Array.from(optionsContainer.children).forEach(b => {
                b.disabled = true;
                b.classList.remove('hover:bg-gray-700');
                b.classList.add('opacity-70', 'cursor-not-allowed');
            });
            btn.classList.remove('opacity-70');
            
            if (opt === answer) {
                btn.classList.add('bg-green-900/80', 'border-green-500', 'text-green-100');
                btn.classList.remove('bg-gray-800', 'text-gray-200', 'border-gray-700');
                feedbackDiv.innerText = '✅ Correct!';
                feedbackDiv.classList.add('bg-green-900/40', 'text-green-400', 'border', 'border-green-800/50');
                feedbackDiv.classList.remove('hidden');
            } else {
                btn.classList.add('bg-red-900/80', 'border-red-500', 'text-red-100');
                btn.classList.remove('bg-gray-800', 'text-gray-200', 'border-gray-700');
                feedbackDiv.innerText = `❌ Incorrect. The correct answer is: ${answer}`;
                feedbackDiv.classList.add('bg-red-900/40', 'text-red-400', 'border', 'border-red-800/50');
                feedbackDiv.classList.remove('hidden');
                
                // Highlight correct answer
                Array.from(optionsContainer.children).forEach(b => {
                    if (b.innerText === answer) {
                        b.classList.add('border-green-500', 'text-green-400', 'border-2', 'opacity-100');
                        b.classList.remove('opacity-70', 'border-gray-700');
                    }
                });
            }
        };
        optionsContainer.appendChild(btn);
    });

    setTimeout(() => {
        quizDiv.classList.remove('opacity-0');
        quizDiv.classList.add('opacity-100');
    }, 10);

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
            <div class="absolute w-4 h-4 bg-accent rounded-full -left-[9px] top-1 shadow-[0_0_8px_rgba(46,139,87,0.8)] border-2 border-card"></div>
            <h3 class="text-sm font-semibold text-gray-200 mb-1">Step ${index + 1}</h3>
            <p class="text-xs text-gray-400 leading-relaxed">${escapeHtml(step)}</p>
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
        <div class="bg-gray-800/80 text-gray-200 px-6 py-5 rounded-2xl rounded-tl-none shadow-md border border-gray-700 backdrop-blur-sm flex items-center gap-2.5">
            <div class="w-2.5 h-2.5 bg-accent rounded-full animate-bounce"></div>
            <div class="w-2.5 h-2.5 bg-accent rounded-full animate-bounce" style="animation-delay: 0.15s"></div>
            <div class="w-2.5 h-2.5 bg-accent rounded-full animate-bounce" style="animation-delay: 0.3s"></div>
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
    chatContainer.scrollTo({
        top: chatContainer.scrollHeight,
        behavior: 'smooth'
    });
}

function escapeHtml(unsafe) {
    return String(unsafe)
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
}
