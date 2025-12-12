import { authFetch, showToast } from './utils.js';

// Utility: Format message timestamp with relative time
function formatMessageTime(createdAt) {
    const now = new Date();
    const msgDate = new Date(createdAt);
    const diffMs = now - msgDate;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);

    // Just now
    if (diffMins < 1) return 'Just now';

    // Minutes ago
    if (diffMins < 60) return `${diffMins}m ago`;

    // Hours ago (today)
    if (diffHours < 24 && now.toDateString() === msgDate.toDateString()) {
        return msgDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    // Yesterday
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    if (msgDate.toDateString() === yesterday.toDateString()) {
        return `Yesterday ${msgDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }

    // Older: show date + time
    return msgDate.toLocaleDateString([], { month: 'short', day: 'numeric' }) +
        ' ' + msgDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// Utility: Format relative time for thread list (shorter format)
function formatRelativeTime(timestamp) {
    const now = new Date();
    const date = new Date(timestamp);
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'now';
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;

    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

// WhatsApp-style emoji set for quick reactions
const QUICK_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];
const ALL_EMOJIS = [
    '😀', '😃', '😄', '😁', '😅', '😂', '🤣', '😊', '😇', '🙂',
    '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚', '😋', '😛',
    '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🥳', '😏', '😒',
    '😞', '😔', '😟', '😕', '🙁', '😣', '😖', '😫', '😩', '🥺',
    '😢', '😭', '😤', '😠', '😡', '🤬', '🤯', '😳', '🥵', '🥶',
    '😱', '😨', '😰', '😥', '😓', '🤗', '🤔', '🤭', '🤫', '🤥',
    '😶', '😐', '😑', '😬', '🙄', '😯', '😦', '😧', '😮', '😲',
    '🥱', '😴', '🤤', '😪', '😵', '🤐', '🥴', '🤢', '🤮', '🤧',
    '👍', '👎', '👏', '🙌', '👐', '🤝', '🙏', '✌️', '🤞', '🤟',
    '🤘', '🤙', '👈', '👉', '👆', '👇', '☝️', '👌', '🤏', '👊',
    '✊', '🤛', '🤜', '🤚', '👋', '🤟', '✋', '🖐', '🖖', '💪',
    '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔',
    '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '🔥', '⭐',
    '✨', '💫', '💥', '💯', '🎉', '🎊', '🎈', '🎁', '🏆', '🥇'
];

export function initDirectMessages() {
    if (!window.location.pathname.includes('/messages/')) return;

    const threadsEl = document.getElementById('dm-threads');
    const messagesEl = document.getElementById('dm-messages');
    const titleEl = document.getElementById('dm-title');
    const profileLinkEl = document.getElementById('dm-profile-link');

    const formEl = document.getElementById('dm-form');
    const inputEl = document.getElementById('dm-input');
    const sendBtnEl = document.getElementById('dm-send-btn');

    const userSearchInput = document.getElementById('dm-user-search-input');
    const userSearchResults = document.getElementById('dm-user-search-results');
    const emojiBtn = document.getElementById('dm-emoji-btn');

    let selectedThreadId = null;
    let isHoveringReactionMenu = false; // Track if user is hovering over reaction menu
    let selectedOtherUser = null;
    let pollTimer = null;
    let searchTimer = null;

    function setSelectedThreadFromStorage() {
        const saved = localStorage.getItem('selected_dm_thread_id');
        if (!saved) {
            selectedThreadId = null;
            return;
        }
        const id = Number(saved);
        selectedThreadId = Number.isFinite(id) ? id : null;
    }

    function persistSelectedThread() {
        if (!selectedThreadId) {
            localStorage.removeItem('selected_dm_thread_id');
            return;
        }
        localStorage.setItem('selected_dm_thread_id', String(selectedThreadId));
    }

    function setComposerEnabled(enabled) {
        inputEl.disabled = !enabled;
        sendBtnEl.disabled = !enabled;
        emojiBtn.disabled = !enabled;
        if (!enabled) inputEl.value = '';
    }

    function setHeader(otherUser) {
        const headerAvatar = document.getElementById('dm-header-avatar');
        const onlineDot = document.getElementById('dm-online-dot');
        const lastSeenEl = document.getElementById('dm-last-seen');

        if (!otherUser) {
            // No conversation selected - reset to default state
            titleEl.textContent = 'Select a conversation';
            headerAvatar.classList.add('hidden');
            onlineDot.classList.add('hidden');
            lastSeenEl.classList.add('hidden');
            profileLinkEl.classList.add('hidden');
            profileLinkEl.href = '#';
            return;
        }

        // Update title
        titleEl.textContent = otherUser.display_name || otherUser.username;

        // Update and show avatar
        const firstLetter = (otherUser.username?.[0] || '?').toUpperCase();
        if (otherUser.avatar) {
            headerAvatar.innerHTML = `
                <img src="${otherUser.avatar}" class="w-full h-full object-cover" alt="${otherUser.username}">
                <div id="dm-online-dot" class="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-400 rounded-full border-2 border-gray-900 hidden"></div>
            `;
        } else {
            headerAvatar.innerHTML = `
                <div class="w-full h-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-sm">
                    ${firstLetter}
                </div>
                <div id="dm-online-dot" class="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-400 rounded-full border-2 border-gray-900 hidden"></div>
            `;
        }
        headerAvatar.classList.remove('hidden');

        // Show online status (simulated - you can integrate real presence later)
        // For now, we'll show "active now" for demonstration
        const onlineDotNew = document.getElementById('dm-online-dot');
        if (Math.random() > 0.5) { // 50% chance to show as online (simulated)
            onlineDotNew.classList.remove('hidden');
            lastSeenEl.textContent = 'Active now';
            lastSeenEl.classList.remove('text-gray-500');
            lastSeenEl.classList.add('text-green-400');
        } else {
            onlineDotNew.classList.add('hidden');
            lastSeenEl.textContent = 'Last seen recently';
            lastSeenEl.classList.remove('text-green-400');
            lastSeenEl.classList.add('text-gray-500');
        }
        lastSeenEl.classList.remove('hidden');

        // Update profile link
        profileLinkEl.href = otherUser.profile_url || (`/u/${otherUser.username}/`);
        profileLinkEl.classList.remove('hidden');
    }

    function renderThreads(threads) {
        if (!threads || threads.length === 0) {
            threadsEl.innerHTML = '<div class="text-sm text-gray-400">No conversations yet. Search a user to start.</div>';
            return;
        }

        threadsEl.innerHTML = threads.map(t => {
            const other = t.other_user;
            const isSelected = t.id === selectedThreadId;

            // Unread handling (simulated if not provided by API)
            const unreadCount = t.unread_count || 0;
            const hasUnread = unreadCount > 0;
            const avatar = other && other.avatar
                ? `<img src="${other.avatar}" class="w-full h-full object-cover" />`
                : `<div class="w-full h-full bg-purple-500 flex items-center justify-center text-xs font-bold text-white">${(other?.username?.[0] || '?').toUpperCase()}</div>`;

            const lastText = t.last_message?.text ? t.last_message.text : 'No messages yet';
            const timestamp = t.updated_at ? formatRelativeTime(t.updated_at) : '';

            return `
                <button class="dm-thread w-full text-left px-3 py-3 rounded-2xl border transition relative
                    ${isSelected ? 'bg-white/10 border-cyan-500/30' : 'bg-white/5 border-white/10 hover:bg-white/10'}
                    ${hasUnread ? 'border-l-4 border-l-cyan-400' : ''}" 
                    data-id="${t.id}">
                    ${hasUnread ? '<div class="absolute top-2 right-2 w-2 h-2 bg-cyan-400 rounded-full animate-pulse"></div>' : ''}
                    <div class="flex items-center gap-3">
                        <div class="w-10 h-10 rounded-full overflow-hidden border border-white/10 shrink-0 relative">
                            ${avatar}
                            ${hasUnread ? '<div class="absolute inset-0 ring-2 ring-cyan-400/50 rounded-full"></div>' : ''}
                        </div>
                        <div class="min-w-0 flex-1">
                            <div class="flex items-center justify-between gap-2 mb-0.5">
                                <div class="text-sm font-bold truncate ${hasUnread ? 'text-white' : 'text-gray-300'}">${other?.display_name || other?.username || 'Unknown'}</div>
                                ${timestamp ? `<div class="text-[10px] text-gray-500 whitespace-nowrap">${timestamp}</div>` : ''}
                            </div>
                            <div class="flex items-center gap-2">
                                <div class="text-xs ${hasUnread ? 'text-gray-300 font-medium' : 'text-gray-500'} truncate flex-1">${lastText}</div>
                                ${unreadCount > 0 ? `<span class="text-[10px] bg-cyan-500 text-white px-2 py-0.5 rounded-full font-bold shrink-0">${unreadCount}</span>` : ''}
                            </div>
                        </div>
                        <i class="fas fa-chevron-right text-xs text-gray-600"></i>
                    </div>
                </button>
            `;
        }).join('');

        threadsEl.querySelectorAll('.dm-thread').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = Number(btn.getAttribute('data-id'));
                if (!Number.isFinite(id)) return;
                selectedThreadId = id;
                persistSelectedThread();
                loadThreads(true);
            });
        });
    }

    async function loadThreads(alsoLoadMessages = false) {
        const res = await authFetch('/api/dm/threads/');
        if (!res.ok) {
            threadsEl.innerHTML = '<div class="text-sm text-gray-400">Unable to load inbox.</div>';
            return;
        }

        const threads = await res.json();

        // Fix selection
        if (selectedThreadId) {
            const found = threads.find(t => t.id === selectedThreadId);
            if (!found) {
                selectedThreadId = null;
                selectedOtherUser = null;
                persistSelectedThread();
            } else {
                selectedOtherUser = found.other_user;
            }
        }

        if (!selectedThreadId && threads.length) {
            selectedThreadId = threads[0].id;
            selectedOtherUser = threads[0].other_user;
            persistSelectedThread();
            alsoLoadMessages = true;
        }

        setHeader(selectedOtherUser);
        setComposerEnabled(!!selectedThreadId);

        renderThreads(threads);

        if (alsoLoadMessages && selectedThreadId) {
            await loadMessages();
        }
    }

    // =============================================
    // EMOJI PICKER
    // =============================================
    function showEmojiPicker() {
        // Remove existing picker
        document.getElementById('emoji-picker')?.remove();

        const picker = document.createElement('div');
        picker.id = 'emoji-picker';
        picker.className = 'fixed bottom-24 left-6 z-50 glass-card rounded-2xl p-4 border border-white/10 shadow-2xl w-80 max-h-96 overflow-y-auto custom-scrollbar';
        picker.innerHTML = `
            <div class="grid grid-cols-8 gap-2">
                ${ALL_EMOJIS.map(emoji => `
                    <button class="emoji-btn text-2xl hover:scale-125 transition p-1" data-emoji="${emoji}">${emoji}</button>
                `).join('')}
            </div>
        `;

        document.body.appendChild(picker);

        // Add click handlers
        picker.querySelectorAll('.emoji-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const emoji = btn.getAttribute('data-emoji');
                inputEl.value += emoji;
                inputEl.focus();
                picker.remove();
            });
        });

        // Close on outside click
        setTimeout(() => {
            document.addEventListener('click', function closePicker(e) {
                if (!picker.contains(e.target) && e.target !== emojiBtn) {
                    picker.remove();
                    document.removeEventListener('click', closePicker);
                }
            });
        }, 100);
    }

    emojiBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        showEmojiPicker();
    });

    // =============================================
    // MESSAGE REACTIONS
    // =============================================
    async function addReaction(messageId, emoji) {
        const res = await authFetch(`/api/dm/messages/${messageId}/react/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ emoji })
        });

        if (res.ok) {
            await loadMessages();
        }
    }

    async function removeReaction(messageId, emoji) {
        const res = await authFetch(`/api/dm/messages/${messageId}/react/`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ emoji })
        });

        if (res.ok) {
            await loadMessages();
        }
    }

    function renderMessages(messages) {
        // Don't re-render if user is actively hovering over reaction menu
        if (isHoveringReactionMenu) {
            return;
        }
        messagesEl.innerHTML = '';

        if (!messages || messages.length === 0) {
            messagesEl.innerHTML = '<div class="text-center text-gray-500 py-20"><p>No messages yet. Say hi!</p></div>';
            return;
        }

        messages.forEach(msg => {
            const isMe = msg.is_me;
            const div = document.createElement('div');
            div.className = `flex gap-3 mb-4 ${isMe ? 'flex-row-reverse' : 'flex-row'} group`;

            const avatarHtml = `
                <div class="w-8 h-8 rounded-full bg-gray-700 overflow-hidden border border-white/20 shrink-0 mt-1">
                    ${msg.avatar
                    ? `<img src="${msg.avatar}" class="w-full h-full object-cover">`
                    : `<div class="w-full h-full bg-purple-500 flex items-center justify-center text-[10px] font-bold">${msg.username[0].toUpperCase()}</div>`
                }
                </div>
            `;

            const bubbleClass = isMe
                ? 'bg-gradient-to-br from-blue-600 to-blue-700 text-white rounded-l-2xl rounded-tr-2xl'
                : 'bg-white/10 backdrop-blur-md border border-white/10 text-white rounded-r-2xl rounded-tl-2xl';

            const deleteBtn = isMe
                ? `<button class="dm-delete-msg text-xs text-red-400 hover:text-red-300 ml-2 opacity-50 hover:opacity-100 transition" data-id="${msg.id}"><i class="fas fa-trash"></i></button>`
                : '';

            // Quick reactions menu (WhatsApp style)
            const quickReactions = `
                <div class="quick-reaction-menu absolute -top-8 ${isMe ? 'right-0' : 'left-0'} bg-gray-800/95 backdrop-blur-md rounded-full px-2 py-1 hidden group-hover:flex items-center gap-1 shadow-lg border border-white/10 z-10">
                    ${QUICK_EMOJIS.map(emoji => `
                        <button class="quick-react-btn text-lg hover:scale-125 transition" data-msg-id="${msg.id}" data-emoji="${emoji}">${emoji}</button>
                    `).join('')}
                </div>
            `;

            // Render existing reactions
            const reactionsHtml = msg.reactions && msg.reactions.length > 0 ? `
                <div class="flex flex-wrap gap-1 mt-1">
                    ${msg.reactions.map(r => {
                const hasUserReacted = r.users.some(u => u.is_me);
                return `
                            <button class="reaction-bubble px-2 py-0.5 rounded-full text-xs flex items-center gap-1 transition
                                ${hasUserReacted ? 'bg-cyan-500/30 border border-cyan-400/50' : 'bg-white/10 border border-white/20'}
                                hover:scale-105" 
                                data-msg-id="${msg.id}" data-emoji="${r.emoji}">
                                <span>${r.emoji}</span>
                                <span class="font-bold">${r.count}</span>
                            </button>
                        `;
            }).join('')}
                </div>
            ` : '';

            div.innerHTML = `
                ${avatarHtml}
                <div class="flex flex-col max-w-[70%] ${isMe ? 'items-end' : 'items-start'} relative">
                    ${quickReactions}
                    <div class="flex items-center gap-2 mb-1 px-1">
                        <span class="text-[10px] font-bold text-gray-400 uppercase tracking-wide">${msg.username}</span>
                        ${deleteBtn}
                    </div>
                    <div class="${bubbleClass} px-4 py-2 shadow-sm break-words text-sm leading-relaxed">${msg.text}</div>
                    <span class="text-[9px] text-gray-500 mt-1 px-1">${formatMessageTime(msg.created_at)}</span>
                    ${reactionsHtml}
                </div>
            `;

            messagesEl.appendChild(div);
        });

        // Track hover state on reaction menus to prevent re-render interruption
        messagesEl.querySelectorAll('.quick-reaction-menu').forEach(menu => {
            menu.addEventListener('mouseenter', () => {
                isHoveringReactionMenu = true;
            });
            menu.addEventListener('mouseleave', () => {
                isHoveringReactionMenu = false;
            });
        });

        // Add event listeners for quick reactions
        messagesEl.querySelectorAll('.quick-react-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const msgId = btn.getAttribute('data-msg-id');
                const emoji = btn.getAttribute('data-emoji');
                await addReaction(msgId, emoji);
            });
        });

        // Add event listeners for reaction bubbles (click to remove)
        messagesEl.querySelectorAll('.reaction-bubble').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const msgId = btn.getAttribute('data-msg-id');
                const emoji = btn.getAttribute('data-emoji');
                const reaction = messages.find(m => m.id == msgId)?.reactions.find(r => r.emoji === emoji);
                const hasUserReacted = reaction?.users.some(u => u.is_me);

                if (hasUserReacted) {
                    await removeReaction(msgId, emoji);
                } else {
                    await addReaction(msgId, emoji);
                }
            });
        });

        messagesEl.querySelectorAll('.dm-delete-msg').forEach(btn => {
            btn.addEventListener('click', deleteMessage);
        });

        messagesEl.scrollTop = messagesEl.scrollHeight;
    }

    async function loadMessages() {
        if (!selectedThreadId) return;
        const res = await authFetch(`/api/dm/threads/${selectedThreadId}/messages/`);
        if (!res.ok) {
            if (res.status === 403) {
                messagesEl.innerHTML = '<div class="text-center mt-10"><p class="text-gray-400">You are not allowed to view this chat.</p></div>';
            }
            return;
        }
        const messages = await res.json();
        renderMessages(messages);
    }

    async function deleteMessage(e) {
        if (!confirm('Delete this message?')) return;
        const id = e.currentTarget.getAttribute('data-id');
        const res = await authFetch(`/api/dm/messages/${id}/`, { method: 'DELETE' });
        if (res.ok) {
            await loadMessages();
            await loadThreads(false);
        }
    }

    formEl.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!selectedThreadId) return;

        const text = inputEl.value.trim();
        if (!text) return;

        inputEl.value = '';

        const res = await authFetch(`/api/dm/threads/${selectedThreadId}/messages/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text }),
        });

        if (res.ok) {
            await loadMessages();
            await loadThreads(false);
        }
    });

    async function createOrGetThread(username) {
        const res = await authFetch('/api/dm/threads/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username }),
        });

        if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            showToast(data.detail || 'Unable to start chat', 'error');
            return null;
        }
        return await res.json();
    }

    async function performUserSearch(query) {
        if (!query || query.trim().length < 2) {
            userSearchResults.classList.add('hidden');
            userSearchResults.innerHTML = '';
            return;
        }

        const res = await authFetch(`/api/search/users/?q=${encodeURIComponent(query.trim())}`);
        if (!res.ok) {
            userSearchResults.classList.add('hidden');
            return;
        }

        const users = await res.json();
        if (!users.length) {
            userSearchResults.innerHTML = '<div class="px-4 py-4 text-sm text-gray-400">No users found</div>';
            userSearchResults.classList.remove('hidden');
            return;
        }

        userSearchResults.innerHTML = users.map(u => {
            const avatar = u.avatar
                ? `<img src="${u.avatar}" class="w-full h-full object-cover" />`
                : `<div class="w-full h-full bg-purple-500 flex items-center justify-center text-xs font-bold text-white">${u.username[0].toUpperCase()}</div>`;

            return `
                <div class="flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition">
                    <div class="w-8 h-8 rounded-full overflow-hidden border border-white/10 shrink-0">${avatar}</div>
                    <div class="flex-1 min-w-0">
                        <div class="text-sm font-bold truncate">${u.display_name}</div>
                        <div class="text-xs text-gray-500 truncate">@${u.username}</div>
                    </div>
                    <button class="btn-secondary text-xs dm-start-btn" data-username="${u.username}">Message</button>
                </div>
            `;
        }).join('');

        userSearchResults.classList.remove('hidden');

        userSearchResults.querySelectorAll('.dm-start-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const username = e.currentTarget.getAttribute('data-username');
                const thread = await createOrGetThread(username);
                if (!thread) return;

                selectedThreadId = thread.id;
                selectedOtherUser = thread.other_user;
                persistSelectedThread();

                userSearchInput.value = '';
                userSearchResults.classList.add('hidden');

                await loadThreads(true);
                showToast(`Chat started with @${username}`, 'success');
            });
        });
    }

    userSearchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimer);
        const q = e.target.value;
        searchTimer = setTimeout(() => performUserSearch(q), 250);
    });

    document.addEventListener('click', (e) => {
        if (!userSearchResults.contains(e.target) && !userSearchInput.contains(e.target)) {
            userSearchResults.classList.add('hidden');
        }
    });

    async function startPolling() {
        if (pollTimer) clearInterval(pollTimer);
        pollTimer = setInterval(async () => {
            // Refresh messages in current conversation
            if (selectedThreadId) {
                await loadMessages();
            }
            // Also refresh thread list to update unread counts
            await loadThreads(false);
        }, 1000); // 1 second for near real-time updates
    }

    (async () => {
        if (!localStorage.getItem('access')) {
            threadsEl.innerHTML = '<div class="text-center mt-10"><p class="text-gray-400 mb-4">Please login to use direct messages.</p><a href="/" class="btn-primary">Login</a></div>';
            return;
        }

        setSelectedThreadFromStorage();
        await loadThreads(true);
        await startPolling();
    })();
}

