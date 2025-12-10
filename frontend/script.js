// -------------------------------------------------------------
// PART 1: YOUR ORIGINAL PARTICLE ANIMATION CODE (UNTOUCHED)
// -------------------------------------------------------------

// Samurai-style interactive particle streaks (dark theme)
const canvas = document.getElementById('particle-canvas');
const ctx = canvas.getContext('2d');

const isSmall = () => window.innerWidth < 768;
const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const getDPR = () => Math.min(window.devicePixelRatio || 1, isSmall() ? 1.25 : 1.75);
let dpr = getDPR();
let paused = false;

const mouse = { x: 0, y: 0, active: false };

function resize() {
    dpr = getDPR();
    const w = window.innerWidth;
    const h = window.innerHeight;
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
window.addEventListener('resize', resize, { passive: true });
resize();

// Config
const BASE_COUNT = 220;
const COUNT = prefersReduced ? (isSmall() ? 60 : 90) : (isSmall() ? 120 : BASE_COUNT);
const CLICK_BURST = isSmall() ? 18 : 28;
const BG_FADE = prefersReduced ? 0.10 : 0.06;

// Particles
const particles = [];
class Particle {
    constructor(x, y, speed = 1) {
        const w = window.innerWidth;
        const h = window.innerHeight;
        this.x = x ?? Math.random() * w;
        this.y = y ?? Math.random() * h;
        const angle = Math.random() * Math.PI * 2;
        const v = (Math.random() * 0.8 + 0.6) * speed;
        this.vx = Math.cos(angle) * v;
        this.vy = Math.sin(angle) * v;
        this.prevX = this.x;
        this.prevY = this.y;
        this.life = 0;
        this.maxLife = 600 + Math.random() * 600;
        this.hue = 185 + Math.random() * 25;
        this.alpha = 0.12 + Math.random() * 0.12;
        this.len = 6 + Math.random() * 18;
    }

    update() {
        this.prevX = this.x;
        this.prevY = this.y;

        if (mouse.active) {
            const dx = mouse.x - this.x;
            const dy = mouse.y - this.y;
            const dist = Math.hypot(dx, dy) + 0.0001;
            const pull = prefersReduced ? 0.02 : 0.045;
            const swirl = prefersReduced ? 0.05 : 0.12;
            const tx = -dy / dist;
            const ty = dx / dist;
            this.vx += (dx / dist) * pull + tx * swirl;
            this.vy += (dy / dist) * pull + ty * swirl;
        }

        const damping = prefersReduced ? 0.985 : 0.992;
        this.vx *= damping;
        this.vy *= damping;

        const maxSpeed = prefersReduced ? 2.2 : 3.3;
        const s = Math.hypot(this.vx, this.vy);
        if (s > maxSpeed) {
            this.vx = (this.vx / s) * maxSpeed;
            this.vy = (this.vy / s) * maxSpeed;
        }

        this.x += this.vx;
        this.y += this.vy;

        const w = window.innerWidth;
        const h = window.innerHeight;
        if (this.x < -10) this.x = w + 10, this.prevX = this.x;
        if (this.x > w + 10) this.x = -10, this.prevX = this.x;
        if (this.y < -10) this.y = h + 10, this.prevY = this.y;
        if (this.y > h + 10) this.y = -10, this.prevY = this.y;

        this.life++;
        if (this.life > this.maxLife) this.respawn();
    }

    respawn() {
        const w = window.innerWidth, h = window.innerHeight;
        this.x = Math.random() * w;
        this.y = Math.random() * h;
        this.prevX = this.x;
        this.prevY = this.y;
        this.life = 0;
    }

    draw() {
        ctx.strokeStyle = `hsla(${this.hue}, 90%, 65%, ${this.alpha})`;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        const vx = this.x - this.prevX;
        const vy = this.y - this.prevY;
        const mag = Math.hypot(vx, vy) || 0.0001;
        const lx = (vx / mag) * this.len;
        const ly = (vy / mag) * this.len;
        ctx.moveTo(this.prevX - lx * 0.2, this.prevY - ly * 0.2);
        ctx.lineTo(this.x + lx * 0.8, this.y + ly * 0.8);
        ctx.stroke();
    }
}

for (let i = 0; i < COUNT; i++) particles.push(new Particle());

function animate() {
    if (paused) return;
    const w = window.innerWidth;
    const h = window.innerHeight;
    ctx.fillStyle = `rgba(2, 17, 20, ${BG_FADE})`;
    ctx.fillRect(0, 0, w, h);

    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < particles.length; i++) {
        particles[i].update();
        particles[i].draw();
    }
    ctx.globalCompositeOperation = 'source-over';

    requestAnimationFrame(animate);
}

ctx.fillStyle = '#021114';
ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);
requestAnimationFrame(animate);

window.addEventListener('mousemove', (e) => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
    mouse.active = true;
}, { passive: true });

window.addEventListener('mouseleave', () => { mouse.active = false; }, { passive: true });

window.addEventListener('click', (e) => {
    burst(e.clientX, e.clientY);
});

function burst(x, y) {
    for (let i = 0; i < CLICK_BURST; i++) {
        particles.push(new Particle(x, y, 3.2));
    }
    if (particles.length > COUNT + 200) particles.splice(0, particles.length - (COUNT + 200));
}


// -------------------------------------------------------------
// GLOBAL UTILITY: LOADING STATE MANAGEMENT
// -------------------------------------------------------------
function setButtonLoading(button, isLoading) {
    if (isLoading) {
        button.disabled = true;
        button.dataset.originalText = button.innerHTML;
        button.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Loading...';
    } else {
        button.disabled = false;
        button.innerHTML = button.dataset.originalText || button.innerHTML;
    }
}


// -------------------------------------------------------------
// PART 2: JWT AUTH + POPUP LOGIC (LANDING PAGE ONLY)
// -------------------------------------------------------------

const signupModal = document.getElementById("signup-modal");
const signinModal = document.getElementById("signin-modal");

if (signupModal && signinModal) {

    // Back-end base URL (same origin)
    const baseUrl = "";

    // Buttons
    const createEmailBtn = document.getElementById("create-email-btn");
    const signinBtn = document.getElementById("signin-btn");
    const signupCancel = document.getElementById("signup-cancel");
    const signinCancel = document.getElementById("signin-cancel");

    if (createEmailBtn) createEmailBtn.onclick = () => signupModal.classList.remove("hidden");
    if (signinBtn) signinBtn.onclick = () => signinModal.classList.remove("hidden");
    if (signupCancel) signupCancel.onclick = () => signupModal.classList.add("hidden");
    if (signinCancel) signinCancel.onclick = () => signinModal.classList.add("hidden");

    // -------------------------------------------------------------
    // PASSWORD VISIBILITY TOGGLE
    // -------------------------------------------------------------
    const toggleVisibility = (inputId, btnId) => {
        const input = document.getElementById(inputId);
        const btn = document.getElementById(btnId);

        if (input && btn) {
            btn.addEventListener('click', () => {
                const isPassword = input.type === 'password';
                input.type = isPassword ? 'text' : 'password';

                const icon = btn.querySelector('i');
                if (icon) {
                    icon.classList.toggle('fa-eye');
                    icon.classList.toggle('fa-eye-slash');
                }
            });
        }
    };

    toggleVisibility('signup-pass', 'toggle-signup-pass');
    toggleVisibility('signup-pass2', 'toggle-signup-pass2');
    toggleVisibility('signin-pass', 'toggle-signin-pass');


    // -------------------------------------------------------------
    // SIGNUP FORM SUBMIT
    // -------------------------------------------------------------
    document.getElementById("signup-form").addEventListener("submit", async (e) => {
        e.preventDefault();

        const form = e.target;
        const submitBtn = form.querySelector('button[type="submit"]');

        const payload = {
            username: form.username.value.trim(),
            email: form.email.value.trim(),
            password: form.password.value,
            password2: form.password2.value,
        };

        const err = document.getElementById("signup-error");
        err.textContent = "";

        // Set loading state
        setButtonLoading(submitBtn, true);

        try {
            const res = await fetch(baseUrl + "/api/register/", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            const data = await res.json();

            if (!res.ok) {
                err.textContent = Object.values(data).flat().join(" ");
                setButtonLoading(submitBtn, false);
                return;
            }

            localStorage.setItem("access", data.access);
            localStorage.setItem("refresh", data.refresh);

            console.log("Signup successful. Redirecting to dashboard...");
            // Keep loading state while redirecting
            window.location.assign(window.location.origin + '/dashboard/');

        } catch (error) {
            console.error("Signup error:", error);
            err.textContent = "Network error. Try again.";
            setButtonLoading(submitBtn, false);
        }
    });


    // -------------------------------------------------------------
    // SIGNIN FORM SUBMIT
    // -------------------------------------------------------------
    document.getElementById("signin-form").addEventListener("submit", async (e) => {
        e.preventDefault();

        const form = e.target;
        const submitBtn = form.querySelector('button[type="submit"]');
        const identifier = form.identifier.value.trim();
        const password = form.password.value;

        const err = document.getElementById("signin-error");
        err.textContent = "";

        // Set loading state
        setButtonLoading(submitBtn, true);

        let loginUsername = identifier;

        if (identifier.includes("@")) {
            const r = await fetch(`/api/resolve-username/?email=${encodeURIComponent(identifier)}`);

            if (r.ok) {
                const body = await r.json();
                loginUsername = body.username;
            }
        }

        try {
            const res = await fetch(`/api/token/`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username: loginUsername, password }),
            });

            const data = await res.json();

            if (!res.ok) {
                err.textContent = data.detail || "Invalid credentials.";
                setButtonLoading(submitBtn, false);
                return;
            }

            localStorage.setItem("access", data.access);
            localStorage.setItem("refresh", data.refresh);

            const me = await fetch(`/api/me/`, {
                headers: { "Authorization": "Bearer " + data.access }
            });

            if (me.ok) {
                const user = await me.json();
                console.log("Login successful. Redirecting to dashboard...");
                // Keep loading state while redirecting
                window.location.assign(window.location.origin + '/dashboard/');
            } else {
                err.textContent = "Failed to load user data.";
                setButtonLoading(submitBtn, false);
            }
        } catch (e) {
            console.error("Login error:", e);
            err.textContent = "Network error.";
            setButtonLoading(submitBtn, false);
        }
    });
}


// -------------------------------------------------------------
// PART 3: DASHBOARD LOGIC (EDIT PROFILE & GALLERY)
// -------------------------------------------------------------
if (window.location.pathname.includes('/dashboard/')) {

    // Helper: Logout
    const logout = () => {
        localStorage.clear();
        window.location.href = '/';
    };

    // Helper: Authenticated Fetch with Auto-Refresh
    async function authFetch(url, options = {}) {
        let token = localStorage.getItem('access');
        if (!token) {
            logout();
            return Promise.reject("No token");
        }

        // Inject Header
        options.headers = options.headers || {};
        // Handle if headers is NOT a Headers object (simple object)
        options.headers['Authorization'] = `Bearer ${token}`;

        let response = await fetch(url, options);

        // Handle 401 (Unauthorized/Expired)
        if (response.status === 401) {
            console.warn("Access token expired. Refreshing...");
            const refresh = localStorage.getItem('refresh');

            if (!refresh) {
                logout();
                return response;
            }

            try {
                const refreshRes = await fetch('/api/token/refresh/', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ refresh })
                });

                if (refreshRes.ok) {
                    const data = await refreshRes.json();
                    localStorage.setItem('access', data.access);

                    // Retry original request with NEW token
                    options.headers['Authorization'] = `Bearer ${data.access}`;
                    response = await fetch(url, options);
                } else {
                    console.error("Session expired completely.");
                    logout();
                }
            } catch (err) {
                console.error("Refresh failed:", err);
                logout();
            }
        }
        return response;
    }

    // Elements
    const titleInput = document.getElementById('title-input');
    const descInput = document.getElementById('desc-input');
    const instagramInput = document.getElementById('instagram-input');
    const linkedinInput = document.getElementById('linkedin-input');
    const githubInput = document.getElementById('github-input');
    const gmailInput = document.getElementById('gmail-input');

    const avatarPreview = document.getElementById('avatar-preview');
    const avatarInput = document.getElementById('avatar-input');
    const galleryGrid = document.getElementById('gallery-grid');
    const viewPublicBtn = document.getElementById('view-public-btn');

    // Load Profile Data
    async function loadProfile() {
        console.log("Loading profile data...");
        try {
            // Replaced fetch with authFetch
            const res = await authFetch('/api/profile/');
            console.log("Profile API status:", res.status);

            if (res.ok) {
                const data = await res.json();
                console.log("Profile data received:", data);

                titleInput.value = data.title;
                descInput.value = data.description;

                // Load Social Links
                if (instagramInput) instagramInput.value = data.instagram || '';
                if (linkedinInput) linkedinInput.value = data.linkedin || '';
                if (githubInput) githubInput.value = data.github || '';
                if (gmailInput) gmailInput.value = data.gmail || '';

                if (data.avatar) avatarPreview.src = data.avatar;

                const publicUrl = `/u/${data.username}/`;
                console.log("Updating View Public Page link to:", publicUrl);
                viewPublicBtn.href = publicUrl;
            } else {
                console.error("Failed to load profile:", res.statusText);
            }
        } catch (error) {
            console.error("Error loading profile:", error);
        }
    }

    // ---------------------------------------------------------
    // CROPPER LOGIC
    // ---------------------------------------------------------
    let cropper = null;
    let cropperMode = 'avatar'; // 'avatar' or 'gallery'
    let currentGalleryBlob = null; // Store cropped blob for gallery upload

    const cropperModal = document.getElementById('cropper-modal');
    const cropperImage = document.getElementById('cropper-image');

    // Helper to open cropper
    const openCropper = (file, mode) => {
        if (!file) return;
        cropperMode = mode;

        const reader = new FileReader();
        reader.onload = (e) => {
            cropperImage.src = e.target.result;
            cropperModal.classList.remove('hidden');

            // Init Cropper
            if (cropper) cropper.destroy();
            cropper = new Cropper(cropperImage, {
                aspectRatio: 1,
                viewMode: 1,
            });
        };
        reader.readAsDataURL(file);
    };

    // 1. Intercept File Selection (Avatar)
    avatarInput.addEventListener('change', (e) => {
        openCropper(e.target.files[0], 'avatar');
        e.target.value = ''; // Clear input
    });

    // 2. Cancel Crop
    document.getElementById('crop-cancel-btn').addEventListener('click', () => {
        cropperModal.classList.add('hidden');
        if (cropper) cropper.destroy();
        cropper = null;
    });

    // 3. Save Crop
    document.getElementById('crop-save-btn').addEventListener('click', () => {
        if (!cropper) return;

        const saveBtn = document.getElementById('crop-save-btn');
        setButtonLoading(saveBtn, true);

        cropper.getCroppedCanvas().toBlob(async (blob) => {

            if (cropperMode === 'avatar') {
                // --- AVATAR SAVE LOGIC (Direct Upload) ---
                const formData = new FormData();
                formData.append('avatar', blob, 'avatar.png');

                // Replaced fetch with authFetch
                await authFetch('/api/profile/', {
                    method: 'PATCH',
                    body: formData
                });

                // Update UI
                avatarPreview.src = URL.createObjectURL(blob);
                cropperModal.classList.add('hidden');
            }
            else if (cropperMode === 'gallery') {
                // --- GALLERY SAVE LOGIC (Local Store & Preview) ---
                currentGalleryBlob = blob;

                // Show preview in Photo Modal
                const previewImg = document.getElementById('photo-preview-img');
                const placeholder = document.getElementById('photo-placeholder');

                if (previewImg && placeholder) {
                    previewImg.src = URL.createObjectURL(blob);
                    previewImg.classList.remove('hidden');
                    placeholder.classList.add('hidden');
                }

                cropperModal.classList.add('hidden');
            }

            if (cropper) {
                cropper.destroy();
                cropper = null;
            }
            setButtonLoading(saveBtn, false);
        });
    });

    // Update Profile (Text Only)
    document.getElementById('profile-form').addEventListener('submit', async (e) => {
        e.preventDefault();

        // Button is outside the form, so we can't use e.target.querySelector
        const submitBtn = document.querySelector('button[form="profile-form"]');

        const payload = {
            title: titleInput.value,
            description: descInput.value,
            instagram: instagramInput.value,
            linkedin: linkedinInput.value,
            github: githubInput.value,
            gmail: gmailInput.value
        };

        // Set loading state
        setButtonLoading(submitBtn, true);

        // Replaced fetch with authFetch
        await authFetch('/api/profile/', {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        loadProfile();

        // Remove loading state
        setButtonLoading(submitBtn, false);
    });

    // Logout
    document.getElementById('logout-btn').addEventListener('click', logout);

    // ---------------------------------------------------------
    // GALLERY LOGIC
    // ---------------------------------------------------------
    const photoModal = document.getElementById('photo-modal');
    const photoInput = document.getElementById('photo-input');
    const photoPreview = document.getElementById('photo-preview-img');
    const photoPlaceholder = document.getElementById('photo-placeholder');

    const resetPhotoModal = () => {
        photoModal.classList.add('hidden');
        document.getElementById('photo-form').reset();
        currentGalleryBlob = null; // Clear blob

        // Reset Preview
        if (photoPreview) {
            photoPreview.src = '';
            photoPreview.classList.add('hidden');
        }
        if (photoPlaceholder) {
            photoPlaceholder.classList.remove('hidden');
        }
    };

    document.getElementById('add-photo-btn').onclick = () => photoModal.classList.remove('hidden');
    document.getElementById('photo-cancel').onclick = resetPhotoModal;

    // Photo Preview Listener -> NOW OPENS CROPPER
    if (photoInput && photoPreview && photoPlaceholder) {
        photoInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                openCropper(file, 'gallery');
            }
            // We don't need to manually set preview here; crop save will do it
            e.target.value = ''; // Clear input so we can select same file again if needed
        });
    }

    // Load Photos
    async function loadPhotos() {
        // Replaced fetch with authFetch
        const res = await authFetch('/api/photos/');
        if (res.ok) {
            const photos = await res.json();

            // Limit Check (Max 6 photos)
            const addBtn = document.getElementById('add-photo-btn');
            if (photos.length >= 6) {
                addBtn.style.display = 'none';
            } else {
                addBtn.style.display = ''; // Reset to default
            }

            galleryGrid.innerHTML = photos.map(photo => `
                <div class="relative group aspect-square bg-black/20 rounded-xl overflow-hidden">
                    <img src="${photo.image}" class="w-full h-full object-cover">
                    <div class="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                        <button onclick="deletePhoto(${photo.id})" class="text-red-400 hover:text-red-300">
                            <i class="fas fa-trash text-2xl"></i>
                        </button>
                    </div>
                </div>
            `).join('');
        }
    }

    // Upload Photo
    document.getElementById('photo-form').addEventListener('submit', async (e) => {
        e.preventDefault();

        const submitBtn = e.target.querySelector('button[type="submit"]');

        if (!currentGalleryBlob) {
            alert("Please select and crop an image first.");
            return;
        }

        const formData = new FormData();
        formData.append('image', currentGalleryBlob, 'photo.png');
        formData.append('caption', document.getElementById('caption-input').value);

        // Set loading state
        setButtonLoading(submitBtn, true);

        // Replaced fetch with authFetch
        const res = await authFetch('/api/photos/', {
            method: 'POST',
            body: formData
        });

        if (res.ok) {
            resetPhotoModal();
            loadPhotos();
            setButtonLoading(submitBtn, false);
        } else {
            const data = await res.json();
            alert(data.detail || "Upload failed. Limit reached?");
            setButtonLoading(submitBtn, false);
        }
    });

    // Delete Photo (Global function for onclick)
    window.deletePhoto = async (id) => {
        if (!confirm('Delete this photo?')) return;

        // Replaced fetch with authFetch
        await authFetch(`/api/photos/${id}/`, {
            method: 'DELETE'
        });
        loadPhotos();
    };

    // Init
    loadProfile();
    loadPhotos();
}
