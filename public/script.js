const chatForm = document.getElementById('chat-form');
const userInput = document.getElementById('user-input');
const chatContainer = document.getElementById('chat-container');
const sendButton = document.getElementById('send-button');

chatForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const message = userInput.value.trim();
    if (!message) return;

    // 1. Add User Message to Chat
    appendMessage(message, 'user');
    userInput.value = '';
    
    // Disable input while loading to prevent multiple submissions
    userInput.disabled = true;
    sendButton.disabled = true;
    
    // Add loading indicator
    const loadingId = appendLoadingIndicator();

    try {
        // 2. Send Message to Server API
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ message })
        });

        // Parse JSON response or throw error
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || `Server error: ${response.status}`);
        }
        
        // Remove loading indicator
        removeElement(loadingId);
        
        // 3. Add AI Response to Chat
        appendMessage(data.reply, 'ai');

    } catch (error) {
        console.error('Error fetching chat response:', error);
        removeElement(loadingId);
        // Graceful error handling in UI
        appendMessage(`System Error: ${error.message}. Please try again later.`, 'error');
    } finally {
        // Re-enable input
        userInput.disabled = false;
        sendButton.disabled = false;
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
        // Parse markdown if available (marked.js included in HTML), else plain text
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
    
    // Trigger reflow for fade-in animation
    setTimeout(() => {
        messageDiv.classList.remove('opacity-0');
        messageDiv.classList.add('opacity-100');
    }, 10);

    scrollToBottom();
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
        // Fade out animation before removing
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

// Basic HTML sanitizer to prevent XSS in user input display
function escapeHtml(unsafe) {
    return unsafe
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
}
