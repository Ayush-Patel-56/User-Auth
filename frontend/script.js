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
// GLOBAL UTILITY: TOAST NOTIFICATIONS
// -------------------------------------------------------------
function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `fixed top-4 right-4 px-6 py-4 rounded-xl shadow-2xl z-50 transform transition-all duration-300 ease-out glass-card border ${type === 'success'
        ? 'border-green-500/30 bg-green-500/10'
        : type === 'error'
            ? 'border-red-500/30 bg-red-500/10'
            : 'border-blue-500/30 bg-blue-500/10'
        }`;

    const icon = type === 'success'
        ? '<i class="fas fa-check-circle text-green-400"></i>'
        : type === 'error'
            ? '<i class="fas fa-exclamation-circle text-red-400"></i>'
            : '<i class="fas fa-info-circle text-blue-400"></i>';

    toast.innerHTML = `
        <div class="flex items-center gap-3">
            ${icon}
            <span class="text-white font-medium">${message}</span>
        </div>
    `;

    // Initial state for animation
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';

    document.body.appendChild(toast);

    // Trigger animation
    setTimeout(() => {
        toast.style.opacity = '1';
        toast.style.transform = 'translateX(0)';
    }, 10);

    // Auto remove after 3 seconds
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%)';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}


// -------------------------------------------------------------
// GLOBAL UTILITY: JWT TOKEN REFRESH
// -------------------------------------------------------------
async function refreshAccessToken() {
    const refreshToken = localStorage.getItem('refresh');

    if (!refreshToken) {
        console.log('No refresh token found');
        return null;
    }

    try {
        const response = await fetch('/api/token/refresh/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ refresh: refreshToken })
        });

        if (response.ok) {
            const data = await response.json();
            localStorage.setItem('access', data.access);
            console.log('Access token refreshed successfully');
            return data.access;
        } else {
            console.log('Refresh token expired or invalid');
            localStorage.removeItem('access');
            localStorage.removeItem('refresh');
            return null;
        }
    } catch (error) {
        console.error('Error refreshing token:', error);
        return null;
    }
}

async function fetchWithTokenRefresh(url, options = {}) {
    const token = localStorage.getItem('access');

    // Add authorization header if not present
    if (token && !options.headers) {
        options.headers = {};
    }
    if (token) {
        options.headers['Authorization'] = `Bearer ${token}`;
    }

    // Make the initial request
    let response = await fetch(url, options);

    // If 401 Unauthorized, try to refresh token and retry
    if (response.status === 401) {
        console.log('Access token expired, attempting refresh...');

        const newToken = await refreshAccessToken();

        if (newToken) {
            // Retry request with new token
            options.headers['Authorization'] = `Bearer ${newToken}`;
            response = await fetch(url, options);
            console.log('Request retried with new token');
        } else {
            // Refresh failed, redirect to login
            console.log('Token refresh failed, redirecting to login...');
            window.location.href = '/';
            return response;
        }
    }

    return response;
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
    // USERNAME LENGTH VALIDATION
    // -------------------------------------------------------------
    const signupForm = document.getElementById("signup-form");
    const usernameInput = signupForm.querySelector('input[name="username"]');
    const usernameError = document.getElementById('username-error');

    function validateUsername() {
        const username = usernameInput.value.trim();

        if (username.length > 0 && username.length < 3) {
            // Show error if less than 3 characters
            usernameError.classList.remove('hidden');
            usernameInput.classList.add('border-red-500', 'border-2');
            return false;
        } else {
            // Hide error if 3+ characters or empty
            usernameError.classList.add('hidden');
            usernameInput.classList.remove('border-red-500', 'border-2');
            return username.length >= 3;
        }
    }

    // Validate in real-time as user types
    usernameInput.addEventListener('input', validateUsername);


    // -------------------------------------------------------------
    // PASSWORD STRENGTH VALIDATION
    // -------------------------------------------------------------
    const passwordInput = signupForm.querySelector('input[name="password"]');
    const passwordStrengthDiv = document.getElementById('password-strength');
    const strengthBar = document.getElementById('strength-bar');
    const strengthText = document.getElementById('strength-text');

    const reqLength = document.getElementById('req-length');
    const reqUppercase = document.getElementById('req-uppercase');
    const reqNumber = document.getElementById('req-number');
    const reqSpecial = document.getElementById('req-special');

    function checkPasswordStrength() {
        const password = passwordInput.value;

        // Show/hide strength indicator
        if (password.length === 0) {
            passwordStrengthDiv.classList.add('hidden');
            return { score: 0, isStrong: false };
        } else {
            passwordStrengthDiv.classList.remove('hidden');
        }

        // Check each requirement
        const hasLength = password.length >= 8;
        const hasUppercase = /[A-Z]/.test(password);
        const hasNumber = /[0-9]/.test(password);
        const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);

        // Update requirement indicators
        updateRequirement(reqLength, hasLength);
        updateRequirement(reqUppercase, hasUppercase);
        updateRequirement(reqNumber, hasNumber);
        updateRequirement(reqSpecial, hasSpecial);

        // Calculate strength score
        const score = [hasLength, hasUppercase, hasNumber, hasSpecial].filter(Boolean).length;

        // Show/hide requirements checklist based on strength
        const requirementsList = passwordStrengthDiv.querySelector('ul');
        if (score === 4) {
            // Hide checklist when all requirements are met
            requirementsList.classList.add('hidden');
        } else {
            // Show checklist when requirements are not fully met
            requirementsList.classList.remove('hidden');
        }

        // Update strength bar and text
        if (score === 0) {
            strengthBar.style.width = '0%';
            strengthBar.style.backgroundColor = '#ef4444'; // red
            strengthText.textContent = '';
        } else if (score === 1 || score === 2) {
            strengthBar.style.width = '33%';
            strengthBar.style.backgroundColor = '#ef4444'; // red
            strengthText.textContent = 'Weak';
            strengthText.className = 'text-xs font-medium text-red-400';
        } else if (score === 3) {
            strengthBar.style.width = '66%';
            strengthBar.style.backgroundColor = '#f59e0b'; // orange
            strengthText.textContent = 'Medium';
            strengthText.className = 'text-xs font-medium text-orange-400';
        } else {
            strengthBar.style.width = '100%';
            strengthBar.style.backgroundColor = '#10b981'; // green
            strengthText.textContent = 'Strong';
            strengthText.className = 'text-xs font-medium text-green-400';
        }

        return { score, isStrong: score === 4 };
    }

    function updateRequirement(element, isMet) {
        const icon = element.querySelector('i');
        const span = element.querySelector('span');

        if (isMet) {
            icon.className = 'fas fa-check text-xs text-green-400';
            span.style.color = '#10b981'; // green
        } else {
            icon.className = 'fas fa-circle text-[6px]';
            element.classList.add('text-gray-400');
            span.style.color = '#9ca3af'; // gray
        }
    }

    // Validate in real-time as user types password
    passwordInput.addEventListener('input', () => {
        checkPasswordStrength();
        // Also re-check password match if confirm password has content
        if (password2Input.value.length > 0) {
            validatePasswordMatch();
        }
    });


    // -------------------------------------------------------------
    // PASSWORD MATCH VALIDATION
    // -------------------------------------------------------------
    const password2Input = signupForm.querySelector('input[name="password2"]');
    const passwordMatchError = document.getElementById("password-match-error");

    function validatePasswordMatch() {
        const password1 = passwordInput.value;
        const password2 = password2Input.value;

        // Only validate if user has started typing in password2
        if (password2.length === 0) {
            // Hide error and reset styling when confirm password is empty
            passwordMatchError.classList.add('hidden');
            password2Input.classList.remove('border-red-500', 'border-2');
            return true;
        }

        // Check if passwords match from the first character
        if (password1 !== password2) {
            // Show error message and red border
            passwordMatchError.classList.remove('hidden');
            password2Input.classList.add('border-red-500', 'border-2');
            return false;
        } else {
            // Hide error and reset styling when passwords match
            passwordMatchError.classList.add('hidden');
            password2Input.classList.remove('border-red-500', 'border-2');
            return true;
        }
    }

    // Validate in real-time as user types in confirm password field
    password2Input.addEventListener('input', validatePasswordMatch);

    // Also re-validate when password1 changes (if password2 has content)
    passwordInput.addEventListener('input', () => {
        if (password2Input.value.length > 0) {
            validatePasswordMatch();
        }
    });



    // -------------------------------------------------------------
    // SIGNUP FORM SUBMIT
    // -------------------------------------------------------------
    document.getElementById("signup-form").addEventListener("submit", async (e) => {
        e.preventDefault();

        const form = e.target;
        const submitBtn = form.querySelector('button[type="submit"]');

        // Validate username length
        if (!validateUsername()) {
            showToast('Username must be at least 3 characters', 'error');
            return;
        }

        // Validate password strength
        const strengthCheck = checkPasswordStrength();
        if (!strengthCheck.isStrong) {
            showToast('Please meet all password requirements', 'error');
            return;
        }

        // Validate password match before submitting
        if (!validatePasswordMatch()) {
            // Just keep the red border, error message is already showing
            return;
        }

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

    const token = localStorage.getItem('access');
    if (!token) window.location.href = '/'; // Redirect if not logged in

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

    // -------------------------------------------------------------
    // VALIDATION FUNCTIONS
    // -------------------------------------------------------------
    function validateSocialLink(input, platform) {
        const value = input.value.trim();

        // Empty is allowed (optional field)
        if (!value) {
            clearValidationError(input);
            return true;
        }

        let isValid = false;
        let errorMsg = '';

        switch (platform) {
            case 'instagram':
                isValid = value.toLowerCase().includes('instagram.com');
                errorMsg = 'Must be a valid Instagram URL';
                break;
            case 'linkedin':
                isValid = value.toLowerCase().includes('linkedin.com');
                errorMsg = 'Must be a valid LinkedIn URL ';
                break;
            case 'github':
                isValid = value.toLowerCase().includes('github.com');
                errorMsg = 'Must be a valid GitHub URL ';
                break;
            case 'gmail':
                // Email validation regex
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                isValid = emailRegex.test(value);
                errorMsg = 'Please enter a valid email address';
                break;
        }

        if (isValid) {
            clearValidationError(input);
            return true;
        } else {
            showValidationError(input, errorMsg);
            return false;
        }
    }

    function showValidationError(input, message) {
        // Add red border
        input.classList.add('border-red-500', 'border-2');
        input.classList.remove('border-white/10');

        // Check if error message already exists
        let errorElement = input.parentElement.querySelector('.validation-error');
        if (!errorElement) {
            errorElement = document.createElement('p');
            errorElement.className = 'validation-error text-red-400 text-xs mt-1';
            input.parentElement.appendChild(errorElement);
        }
        errorElement.textContent = message;
    }

    function clearValidationError(input) {
        // Remove red border
        input.classList.remove('border-red-500', 'border-2');
        input.classList.add('border-white/10');

        // Remove error message
        const errorElement = input.parentElement.querySelector('.validation-error');
        if (errorElement) {
            errorElement.remove();
        }
    }

    // Load Profile Data
    async function loadProfile() {
        console.log("Loading profile data...");
        try {
            const res = await fetchWithTokenRefresh('/api/profile/', {});
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

    // -------------------------------------------------------------
    // ATTACH VALIDATION LISTENERS
    // -------------------------------------------------------------
    if (instagramInput) {
        instagramInput.addEventListener('blur', () => validateSocialLink(instagramInput, 'instagram'));
        instagramInput.addEventListener('input', () => {
            // Clear error while typing, re-validate on blur
            if (instagramInput.value.trim() === '') clearValidationError(instagramInput);
        });
    }

    if (linkedinInput) {
        linkedinInput.addEventListener('blur', () => validateSocialLink(linkedinInput, 'linkedin'));
        linkedinInput.addEventListener('input', () => {
            if (linkedinInput.value.trim() === '') clearValidationError(linkedinInput);
        });
    }

    if (githubInput) {
        githubInput.addEventListener('blur', () => validateSocialLink(githubInput, 'github'));
        githubInput.addEventListener('input', () => {
            if (githubInput.value.trim() === '') clearValidationError(githubInput);
        });
    }

    if (gmailInput) {
        gmailInput.addEventListener('blur', () => validateSocialLink(gmailInput, 'gmail'));
        gmailInput.addEventListener('input', () => {
            if (gmailInput.value.trim() === '') clearValidationError(gmailInput);
        });
    }


    // ---------------------------------------------------------
    // CROPPER LOGIC
    // ---------------------------------------------------------
    let cropper = null;
    const cropperModal = document.getElementById('cropper-modal');
    const cropperImage = document.getElementById('cropper-image');

    // 1. Intercept File Selection
    avatarInput.addEventListener('change', (e) => {
        console.log("File selected:", e.target.files[0]);
        const file = e.target.files[0];
        if (file) {
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
        }
        // Clear input so same file can be selected again
        e.target.value = '';
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

        // Set loading state
        setButtonLoading(saveBtn, true);

        cropper.getCroppedCanvas().toBlob(async (blob) => {
            const formData = new FormData();
            formData.append('avatar', blob, 'avatar.png');

            await fetchWithTokenRefresh('/api/profile/', {
                method: 'PATCH',
                body: formData
            });

            // Update UI
            avatarPreview.src = URL.createObjectURL(blob);
            cropperModal.classList.add('hidden');
            cropper.destroy();
            cropper = null;

            // Remove loading state
            setButtonLoading(saveBtn, false);
            // alert('Profile picture updated!');
        });
    });

    // Update Profile (Text Only)
    document.getElementById('profile-form').addEventListener('submit', async (e) => {
        e.preventDefault();

        // Button is outside the form, so we can't use e.target.querySelector
        const submitBtn = document.querySelector('button[form="profile-form"]');

        // Validate all social links before submitting
        const instagramValid = validateSocialLink(instagramInput, 'instagram');
        const linkedinValid = validateSocialLink(linkedinInput, 'linkedin');
        const githubValid = validateSocialLink(githubInput, 'github');
        const gmailValid = validateSocialLink(gmailInput, 'gmail');

        // If any validation fails, don't submit
        if (!instagramValid || !linkedinValid || !githubValid || !gmailValid) {
            showToast('Please fix validation errors before saving', 'error');
            return;
        }

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

        await fetchWithTokenRefresh('/api/profile/', {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        loadProfile();

        // Remove loading state
        setButtonLoading(submitBtn, false);

        // Show success toast
        showToast('Profile updated successfully!', 'success');
    });

    // Logout
    document.getElementById('logout-btn').addEventListener('click', () => {
        localStorage.clear();
        window.location.href = '/';
    });

    // ---------------------------------------------------------
    // GALLERY LOGIC
    // ---------------------------------------------------------
    const photoModal = document.getElementById('photo-modal');
    const photoInput = document.getElementById('photo-input');

    document.getElementById('add-photo-btn').onclick = () => photoModal.classList.remove('hidden');
    document.getElementById('photo-cancel').onclick = () => photoModal.classList.add('hidden');

    // Load Photos
    async function loadPhotos() {
        const res = await fetchWithTokenRefresh('/api/photos/', {});
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
        const file = photoInput.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('image', file);
        formData.append('caption', document.getElementById('caption-input').value);

        // Set loading state
        setButtonLoading(submitBtn, true);

        const res = await fetchWithTokenRefresh('/api/photos/', {
            method: 'POST',
            body: formData
        });

        if (res.ok) {
            photoModal.classList.add('hidden');
            loadPhotos();
            e.target.reset();
            setButtonLoading(submitBtn, false);
        } else {
            const data = await res.json();
            alert(data.detail || "Upload failed. Limit reached?");
            setButtonLoading(submitBtn, false);
        }
    });

    // Delete Photo (Global function for onclick)
    window.deletePhoto = async (id) => {
        await fetchWithTokenRefresh(`/api/photos/${id}/`, {
            method: 'DELETE'
        });

        loadPhotos();

        // Show success toast
        showToast('Photo deleted successfully!', 'success');
    };

    // Init
    loadProfile();
    loadPhotos();
}
