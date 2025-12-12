export function initPublicProfile() {
    if (!window.location.pathname.includes('/u/')) return;

    console.log("Initializing Public Profile Lightbox...");

    const galleryItems = document.querySelectorAll('.gallery-item');
    const lightboxModal = document.getElementById('lightbox-modal');
    const lightboxImg = document.getElementById('lightbox-img');
    const lightboxCaption = document.getElementById('lightbox-caption');
    const lightboxClose = document.getElementById('lightbox-close');

    // UI Elements for Likes/Comments
    const likeBtn = document.getElementById('like-btn');
    const likeCount = document.getElementById('like-count');
    const commentsList = document.getElementById('comments-list');
    const commentForm = document.getElementById('comment-form');
    const commentInput = document.getElementById('comment-input');
    const postCommentBtn = document.getElementById('post-comment-btn');

    let currentPhotoId = null;
    let currentUser = null;
    let pollingInterval = null; // Store polling interval
    const accessToken = localStorage.getItem('access');

    if (!lightboxModal) return;

    // Helper: Auth Header
    function getAuthHeaders() {
        return {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
        };
    }

    // --- Fetch Current User ---
    async function fetchCurrentUser() {
        if (!accessToken) return null; // Add return value
        try {
            const res = await fetch('/api/me/', { headers: getAuthHeaders() });
            if (res.ok) {
                currentUser = await res.json();
                return currentUser;
            }
        } catch (err) {
            console.error("Failed to fetch user:", err);
        }
        return null;
    }
    // Initial fetch (fire and forget)
    fetchCurrentUser();

    // --- 1. Load Data (Likes & Comments) ---
    async function loadPhotoData(photoId, isPolling = false) {
        if (!isPolling) {
            // First load: Show loading state
            currentPhotoId = photoId;
            commentsList.innerHTML = '<p class="text-xs text-gray-500 text-center">Loading interactions...</p>';
            likeCount.textContent = '...';
            likeBtn.innerHTML = '<i class="fas fa-infinity"></i>';
            likeBtn.style.color = ''; // Reset
            likeBtn.dataset.liked = "false";

            // Ensure currentUser is loaded before checks
            if (accessToken && !currentUser) {
                await fetchCurrentUser();
            }
        }

        try {
            // A. Fetch Likes Status
            const likeHeaders = accessToken ? getAuthHeaders() : { 'Content-Type': 'application/json' };
            const likeRes = await fetch(`/api/photos/${photoId}/like/`, { headers: likeHeaders });

            if (likeRes.ok) {
                const likeData = await likeRes.json();
                updateLikeUI(likeData.is_liked, likeData.like_count);
            }

            // B. Fetch Comments
            const commentsRes = await fetch(`/api/photos/${photoId}/comments/`, { headers: likeHeaders });
            if (commentsRes.ok) {
                const comments = await commentsRes.json();
                renderComments(comments);
            }
        } catch (err) {
            console.error("Error loading photo data:", err);
            if (!isPolling) commentsList.innerHTML = '<p class="text-xs text-red-500">Failed to load data.</p>';
        }

        // C. Update UI based on Login State (Only needed on first load)
        if (!isPolling) {
            if (!accessToken) {
                commentInput.placeholder = "Login to comment";
                commentInput.disabled = true;
                postCommentBtn.disabled = true;
            } else {
                commentInput.placeholder = "Add a comment...";
                commentInput.disabled = false;
            }
        }
    }

    function updateLikeUI(isLiked, count) {
        likeCount.textContent = `${count} x Aura`;
        likeBtn.dataset.liked = isLiked ? "true" : "false";
        if (isLiked) {
            likeBtn.innerHTML = '<i class="fas fa-infinity"></i>'; // Active
            likeBtn.style.color = '#00b4d8';
        } else {
            likeBtn.innerHTML = '<i class="fas fa-infinity"></i>'; // Inactive
            likeBtn.style.color = '';
        }
    }

    // State for Reply
    let replyingToId = null;
    let replyingToUser = null;

    // --- 2. Action Handlers --- 

    // Helper to render single comment (recursive)
    function createCommentHTML(comment, isNested = false) {
        const currentUsername = currentUser ? currentUser.username : null;
        const pathParts = window.location.pathname.split('/');
        const profileOwnerUsername = pathParts[2];
        const isAuthor = currentUsername === comment.username;
        const isProfileOwner = currentUsername === profileOwnerUsername;
        const isOwner = currentUsername && (isAuthor || isProfileOwner);

        const deleteBtn = isOwner
            ? `<button class="delete-comment-btn absolute right-0 top-0 text-gray-500 hover:text-red-500 opacity-0 group-hover:opacity-100 transition px-2" data-id="${comment.id}"><i class="fas fa-trash"></i></button>`
            : '';

        const replyBtn = (accessToken && !isNested)
            ? `<button class="reply-comment-btn text-xs text-gray-400 hover:text-white mt-1" data-id="${comment.id}" data-username="${comment.username}">Reply</button>`
            : '';

        const nestedClass = isNested ? 'ml-10 mt-2 border-l-2 border-white/10 pl-3' : 'mb-3';

        let html = `
            <div class="relative group ${nestedClass}">
                <div class="flex gap-3 text-sm">
                    <div class="w-8 h-8 shrink-0 rounded-full bg-gray-700 overflow-hidden border border-white/20">
                        ${comment.avatar
                ? `<img src="${comment.avatar}" class="w-full h-full object-cover">`
                : `<div class="w-full h-full bg-purple-500 flex items-center justify-center text-[8px] font-bold">${comment.username[0].toUpperCase()}</div>`
            }
                    </div>
                    <div class="flex-1">
                        <div class="flex items-center justify-between">
                            <span class="font-bold text-white mr-2">${comment.username}</span>
                        </div>
                        <span class="text-gray-300 break-words">${comment.text}</span>
                        <div class="flex gap-4">
                            ${replyBtn}
                        </div>
                    </div>
                    ${deleteBtn}
                </div>
        `;

        // Recursively render replies
        if (comment.replies && comment.replies.length > 0) {
            comment.replies.forEach(reply => {
                html += createCommentHTML(reply, true);
            });
        }

        html += `</div>`;
        return html;
    }

    function renderComments(comments) {
        const container = document.getElementById('lightbox-comments-container');
        const scrollPos = container ? container.scrollTop : 0;
        const wasAtBottom = container ? (container.scrollHeight - container.scrollTop === container.clientHeight) : false;

        commentsList.innerHTML = '';
        if (comments.length === 0) {
            commentsList.innerHTML = '<p class="text-xs text-gray-600 text-center py-4">No comments yet. Be the first!</p>';
            return;
        }

        commentsList.innerHTML = comments.map(c => createCommentHTML(c)).join('');

        // Listeners
        document.querySelectorAll('.delete-comment-btn').forEach(btn => {
            btn.addEventListener('click', handleDeleteComment);
        });

        document.querySelectorAll('.reply-comment-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.target.getAttribute('data-id');
                const username = e.target.getAttribute('data-username');
                startReply(id, username);
            });
        });

        // Restore scroll
        if (container) {
            if (wasAtBottom) container.scrollTop = container.scrollHeight;
            else container.scrollTop = scrollPos;
        }
    }

    function startReply(id, username) {
        replyingToId = id;
        replyingToUser = username;
        commentInput.placeholder = `Replying to @${username}...`;
        commentInput.focus();

        // Add visual indicator (optional)
        postCommentBtn.textContent = 'Reply';
    }

    // Like Toggle (unchanged)
    if (likeBtn) {
        likeBtn.addEventListener('click', async () => {
            // Re-using existing like logic for cleanliness
            if (!accessToken) {
                alert("Please login to like photos!");
                return;
            };

            const isLiked = likeBtn.dataset.liked === "true";
            let count = parseInt(likeCount.textContent) || 0;
            updateLikeUI(!isLiked, isLiked ? count - 1 : count + 1);

            try {
                const res = await fetch(`/api/photos/${currentPhotoId}/like/`, {
                    method: 'POST',
                    headers: getAuthHeaders()
                });
                if (!res.ok) throw new Error();
                const data = await res.json();
                updateLikeUI(data.is_liked, data.like_count);
            } catch (err) {
                console.error("Like failed", err);
                updateLikeUI(isLiked, count);
            }
        });
    }

    // Post Comment
    if (commentInput) {
        commentInput.addEventListener('input', (e) => {
            postCommentBtn.disabled = e.target.value.trim().length === 0;
        });

        commentInput.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && replyingToId) {
                replyingToId = null;
                replyingToUser = null;
                commentInput.placeholder = "Add a comment...";
                postCommentBtn.textContent = 'Post';
            }
        });
    }

    if (commentForm) {
        commentForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const text = commentInput.value.trim();
            if (!text || !currentPhotoId || !accessToken) return;

            const originalBtnText = postCommentBtn.textContent;
            postCommentBtn.textContent = '...';
            postCommentBtn.disabled = true;

            const payload = { text };
            if (replyingToId) {
                payload.parent_id = replyingToId;
            }

            try {
                const res = await fetch(`/api/photos/${currentPhotoId}/comments/`, {
                    method: 'POST',
                    headers: getAuthHeaders(),
                    body: JSON.stringify(payload)
                });

                if (res.ok) {
                    commentInput.value = '';
                    // Reset Reply State
                    replyingToId = null;
                    replyingToUser = null;
                    commentInput.placeholder = "Add a comment...";
                    postCommentBtn.textContent = 'Post';

                    loadPhotoData(currentPhotoId, true); // Refresh immediately
                }
            } catch (err) {
                console.error("Comment failed", err);
            } finally {
                postCommentBtn.textContent = originalBtnText === 'Reply' ? 'Post' : 'Post';
                postCommentBtn.disabled = true;
            }
        });
    }


    // --- 3. Lightbox Open Logic ---
    galleryItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.stopPropagation();
            const imgSrc = item.getAttribute('src');
            const caption = item.getAttribute('data-caption');
            const photoId = item.getAttribute('data-photo-id');

            if (imgSrc) {
                lightboxImg.src = imgSrc;
                if (lightboxCaption) lightboxCaption.textContent = caption || '';

                lightboxModal.classList.remove('hidden');
                document.body.style.overflow = 'hidden';

                if (photoId) {
                    loadPhotoData(photoId, false); // Initial Load

                    // Start Polling
                    pollingInterval = setInterval(() => {
                        // Check if still open and visible
                        const isOpen = currentPhotoId && !document.getElementById('lightbox-modal').classList.contains('hidden');

                        // Check if user is interacting (replying or typing)
                        const isInteracting = replyingToId !== null || (commentInput && commentInput.value.trim().length > 0);

                        if (isOpen && !isInteracting) {
                            loadPhotoData(currentPhotoId, true);
                        }
                    }, 3000);
                }
            }
        });
    });

    // Close Interaction
    function closeLightbox() {
        lightboxModal.classList.add('hidden');
        lightboxImg.src = '';
        currentPhotoId = null;
        document.body.style.overflow = '';
        if (pollingInterval) {
            clearInterval(pollingInterval);
            pollingInterval = null;
        }
    }

    if (lightboxClose) lightboxClose.addEventListener('click', closeLightbox);

    lightboxModal.addEventListener('click', (e) => {
        if (e.target === lightboxModal || e.target.classList.contains('flex')) {
            closeLightbox();
        }
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !lightboxModal.classList.contains('hidden')) {
            closeLightbox();
        }
    });
}
