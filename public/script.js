const chatForm = document.getElementById('chat-form');
const userInput = document.getElementById('user-input');
const chatContainer = document.getElementById('chat-container');
const sendButton = document.getElementById('send-button');
const micButton = document.getElementById('mic-button');

const timelineContainer = document.getElementById('timeline-container');
const quizContainer = document.getElementById('quiz-container');
const closeQuizBtn = document.getElementById('close-quiz');

// Web Speech API Initialization (Speech-to-Text)
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition;

if (SpeechRecognition) {
    recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.lang = 'en-US';
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
        recognition.start();
    }
});

function stopMic() {
    micButton.classList.remove('recording-active');
    userInput.placeholder = "Type your message here...";
}

// Text-to-Speech Helper (SpeechSynthesis)
function speakText(text) {
    if (!('speechSynthesis' in window)) return;
    // Stop any ongoing speech
    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = 1;
    
    // Attempt to pick a good voice if available
    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find(v => v.name.includes('Google') || v.name.includes('Samantha') || v.name.includes('Natural'));
    if (preferredVoice) {
        utterance.voice = preferredVoice;
    }
    
    window.speechSynthesis.speak(utterance);
}

closeQuizBtn.addEventListener('click', () => {
    quizContainer.classList.add('hidden');
});

chatForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const message = userInput.value.trim();
    if (!message) return;

    // 1. Add User Message to Chat
    appendMessage(message, 'user');
    userInput.value = '';
    
    // Disable input while loading
    userInput.disabled = true;
    sendButton.disabled = true;
    if(micButton) micButton.disabled = true;
    
    // Add loading indicator
    const loadingId = appendLoadingIndicator();
    
    // Hide quiz if there's a new question being asked
    quizContainer.classList.add('hidden');

    try {
        // 2. Send Message to Server API
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ message })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || `Server error: ${response.status}`);
        }
        
        removeElement(loadingId);
        
        // 3. Process the Structured JSON Response
        if (data.speechText) {
            // Read the speech summary aloud
            speakText(data.speechText);
            // Also append the summary to the chat view
            appendMessage(data.speechText, 'ai');
        }

        // 4. Render dynamic timeline if present
        if (data.timelineSteps && Array.isArray(data.timelineSteps) && data.timelineSteps.length > 0) {
            renderTimeline(data.timelineSteps);
        } else if (data.timelineSteps) {
            // If empty array, we can choose to clear or show default text
            timelineContainer.innerHTML = '<p class="text-gray-500 text-sm italic">Ask about an election process to see the steps here.</p>';
        }

        // 5. Render interactive quiz if present
        if (data.quiz && data.quiz.question) {
            renderQuiz(data.quiz);
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
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
                </svg>
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

function renderTimeline(stepsArray) {
    timelineContainer.innerHTML = ''; // Clear current timeline

    stepsArray.forEach((step, index) => {
        const isLast = index === stepsArray.length - 1;
        
        const stepDiv = document.createElement('div');
        stepDiv.className = `relative pl-5 pb-4 timeline-item`;
        stepDiv.style.animationDelay = `${index * 0.1}s`;
        
        // Add border-l-2 unless it's the last item to connect the dots
        if (!isLast) {
            stepDiv.classList.add('border-l-2', 'border-accent');
        } else {
            stepDiv.classList.add('border-l-2', 'border-transparent');
        }

        stepDiv.innerHTML = `
            <div class="absolute w-4 h-4 bg-accent rounded-full -left-[9px] top-1 shadow-[0_0_8px_rgba(46,139,87,0.8)] border-2 border-card"></div>
            <h3 class="text-sm font-semibold text-gray-200 mb-1">Step ${index + 1}</h3>
            <p class="text-xs text-gray-400 leading-relaxed">${escapeHtml(step)}</p>
        `;
        
        timelineContainer.appendChild(stepDiv);
    });
}

function renderQuiz(quizObject) {
    const { question, options, answer } = quizObject;
    if (!question || !options || !answer) return;

    document.getElementById('quiz-question').innerText = question;
    const optionsContainer = document.getElementById('quiz-options');
    optionsContainer.innerHTML = '';
    
    const feedbackDiv = document.getElementById('quiz-feedback');
    feedbackDiv.classList.add('hidden');
    feedbackDiv.className = 'mt-3 text-xs font-semibold p-2 rounded-md hidden';

    options.forEach(opt => {
        const btn = document.createElement('button');
        btn.className = 'w-full text-left bg-gray-700 hover:bg-gray-600 text-gray-200 px-3 py-2 rounded-lg text-sm transition-colors border border-gray-600';
        btn.innerText = opt;
        
        btn.onclick = () => {
            // Disable all buttons after guess
            Array.from(optionsContainer.children).forEach(b => b.disabled = true);
            
            if (opt === answer) {
                btn.classList.add('bg-green-900', 'border-green-500', 'text-green-100');
                btn.classList.remove('bg-gray-700', 'hover:bg-gray-600', 'text-gray-200');
                feedbackDiv.innerText = '✅ Correct!';
                feedbackDiv.classList.add('bg-green-900/50', 'text-green-400', 'border', 'border-green-800');
                feedbackDiv.classList.remove('hidden');
            } else {
                btn.classList.add('bg-red-900', 'border-red-500', 'text-red-100');
                btn.classList.remove('bg-gray-700', 'hover:bg-gray-600', 'text-gray-200');
                feedbackDiv.innerText = `❌ Incorrect. The correct answer was: ${answer}`;
                feedbackDiv.classList.add('bg-red-900/50', 'text-red-400', 'border', 'border-red-800');
                feedbackDiv.classList.remove('hidden');
                
                // Highlight correct answer
                Array.from(optionsContainer.children).forEach(b => {
                    if (b.innerText === answer) {
                        b.classList.add('border-green-500', 'text-green-400');
                    }
                });
            }
        };
        optionsContainer.appendChild(btn);
    });

    quizContainer.classList.remove('hidden');
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
