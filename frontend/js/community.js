export function initCommunity() {
    if (!window.location.pathname.includes('/community/')) return;

    console.log("Initializing Community Chat...");

    const messagesContainer = document.getElementById('chat-messages');
    const chatForm = document.getElementById('chat-form');
    const chatInput = document.getElementById('chat-input');
    const sendBtn = document.getElementById('send-btn');
    const accessToken = localStorage.getItem('access');

    let currentUser = null;
    let isPolling = false;
    let lastMessageId = null; // To optimize polling? For now, fetch list.

    // Auth Header Helper
    function getAuthHeaders() {
        return {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
        };
    }

    // 1. Fetch User Info (to know 'is_me' for UI)
    async function fetchCurrentUser() {
        if (!accessToken) return;
        try {
            const res = await fetch('/api/me/', { headers: getAuthHeaders() });
            if (res.ok) {
                currentUser = await res.json();
            }
        } catch (err) {
            console.error(err);
        }
    }

    // 2. Load Messages (Poll)
    async function loadMessages() {
        if (!accessToken) {
            messagesContainer.innerHTML = '<div class="text-center mt-10"><p class="text-gray-400 mb-4">Please login to join the chat.</p><a href="/" class="btn-primary">Login</a></div>';
            return;
        }

        try {
            const res = await fetch('/api/chat/', { headers: getAuthHeaders() });
            if (res.ok) {
                const messages = await res.json();
                renderMessages(messages);
            }
        } catch (err) {
            console.error("Chat poll failed", err);
        }
    }

    function renderMessages(messages) {
        // Simple diffing: if last message ID is same, don't re-render entire list? 
        // For 'Flawless' feel without React, we can just re-render but check scroll position.
        // Or better: clear and append. For MVP polling (3s), full re-render is okay but might flicker.
        // Let's try smart update: only append NEW messages? 
        // Problem: Deletion. If we only append, we miss deletions.
        // Solution: Full re-render for now. 

        const wasAtBottom = messagesContainer.scrollHeight - messagesContainer.scrollTop === messagesContainer.clientHeight;

        messagesContainer.innerHTML = ''; // Reset

        if (messages.length === 0) {
            messagesContainer.innerHTML = '<div class="text-center text-gray-500 py-20"><p>No messages yet. Say hi! 👋</p></div>';
            return;
        }

        let lastDate = null;

        messages.forEach(msg => {
            // Date Divider (Optional, let's skip for speed)

            const isMe = msg.is_me; // API provides this now
            const div = document.createElement('div');
            // Alignment
            div.className = `flex gap-3 mb-4 ${isMe ? 'flex-row-reverse' : 'flex-row'}`;

            // Avatar Logic
            const avatarHtml = `
                <div class="w-8 h-8 rounded-full bg-gray-700 overflow-hidden border border-white/20 shrink-0 mt-1">
                    ${msg.avatar
                    ? `<img src="${msg.avatar}" class="w-full h-full object-cover">`
                    : `<div class="w-full h-full bg-purple-500 flex items-center justify-center text-[10px] font-bold">${msg.username[0].toUpperCase()}</div>`
                }
                </div>
            `;

            // Message Bubble
            // Me: Blue Gradient, Right
            // Others: Glass/Gray, Left
            const bubbleClass = isMe
                ? 'bg-gradient-to-br from-blue-600 to-blue-700 text-white rounded-l-2xl rounded-tr-2xl'
                : 'bg-white/10 dark:bg-gray-800/10 backdrop-blur-md border border-white/10 text-white rounded-r-2xl rounded-tl-2xl';

            const deleteBtn = isMe
                ? `<button class="delete-msg-btn text-xs text-red-400 hover:text-red-300 ml-2 opacity-50 hover:opacity-100 transition" data-id="${msg.id}"><i class="fas fa-trash"></i></button>`
                : '';

            div.innerHTML = `
                ${avatarHtml}
                <div class="flex flex-col max-w-[70%] ${isMe ? 'items-end' : 'items-start'}">
                    <div class="flex items-center gap-2 mb-1 px-1">
                        <span class="text-[10px] font-bold text-gray-400 uppercase tracking-wide">${msg.username}</span>
                        ${deleteBtn}
                    </div>
                    <div class="${bubbleClass} px-4 py-2 shadow-sm break-words text-sm leading-relaxed">
                        ${msg.text}
                    </div>
                    <span class="text-[9px] text-gray-500 mt-1 px-1">${new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
            `;

            messagesContainer.appendChild(div);
        });

        // Add Delete Listeners
        document.querySelectorAll('.delete-msg-btn').forEach(btn => {
            btn.addEventListener('click', deleteMessage);
        });

        // Scroll to bottom on first load or if user was at bottom
        // On first run `messagesContainer.scrollTop` is 0.
        // We'll use a hack: check if valid ScrollHeight > ClientHeight
        // Just always scroll to bottom for now as it's a chat.
        // Unless user scrolled up.
        // Implementing "Stick to Bottom":
        // This simple polling clears content, so scroll pos is lost.
        // We must restore it or scroll to bottom. 
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    // 3. Send Message
    chatForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const text = chatInput.value.trim();
        if (!text) return;

        // Optimistic UI? Or just wait 100ms?
        // Let's send and then reload immediately.

        chatInput.value = ''; // Clear early

        try {
            const res = await fetch('/api/chat/', {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify({ text })
            });

            if (res.ok) {
                // Fetch immediately
                loadMessages();
            }
        } catch (err) {
            console.error("Failed to send", err);
            chatInput.value = text; // Restore if fail
        }
    });

    // 4. Delete Message
    async function deleteMessage(e) {
        if (!confirm("Delete this message?")) return;
        const id = e.currentTarget.getAttribute('data-id');

        try {
            const res = await fetch(`/api/chat/${id}/`, {
                method: 'DELETE',
                headers: getAuthHeaders()
            });
            if (res.ok) {
                loadMessages(); // Refresh
            }
        } catch (err) {
            console.error("Failed to delete", err);
        }
    }

    // Init Logic
    (async () => {
        await fetchCurrentUser();
        loadMessages();
        // Start Polling (every 3 seconds)
        setInterval(loadMessages, 3000);
    })();
}
