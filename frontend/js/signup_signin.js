import { setButtonLoading, showToast } from './utils.js';

export function initAuth() {
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

        // Feature Not Available Toast for Apple
        const appleBtn = document.getElementById("apple-btn");
        if (appleBtn) {
            appleBtn.onclick = () => showToast("Sign up with Apple is coming soon!", "info");
        }

        // -------------------------------------------------------------
        // GOOGLE AUTH INITIALIZATION
        // -------------------------------------------------------------

        // Define handleCredentialResponse globally or attach to window
        window.handleGoogleCredentialResponse = async (response) => {
            console.log("Encoded JWT ID token: " + response.credential);

            try {
                // Send to backend
                const res = await fetch("/api/auth/google/", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ token: response.credential }),
                });

                const data = await res.json();

                if (res.ok) {
                    // Save JWT tokens
                    localStorage.setItem("access", data.access);
                    localStorage.setItem("refresh", data.refresh);

                    showToast("Login Successful!", "success");

                    // Redirect to dashboard
                    setTimeout(() => {
                        window.location.assign(window.location.origin + '/dashboard/');
                    }, 500);
                } else {
                    console.error("Google Auth Backend Error:", data);
                    showToast("Google Login Failed: " + (data.detail || "Unknown error"), "error");
                }
            } catch (error) {
                console.error("Google Auth Network Error:", error);
                showToast("Network error during Google Login", "error");
            }
        }

        const googleBtnContainer = document.getElementById("google-btn-container");

        if (googleBtnContainer) {
            const initializeGoogle = () => {
                if (window.google) {
                    const CLIENT_ID = "715843950550-diqg03nmv5dh756r366q9gq33bpu778p.apps.googleusercontent.com";

                    window.google.accounts.id.initialize({
                        client_id: CLIENT_ID,
                        callback: window.handleGoogleCredentialResponse,
                        use_fedcm_for_prompt: true,
                        ux_mode: 'popup'
                    });

                    // Render the official Google Button
                    window.google.accounts.id.renderButton(
                        googleBtnContainer,
                        {
                            type: "standard",
                            theme: "outline",
                            size: "large",
                            text: "signup_with",
                            shape: "pill",
                            width: 250
                        }
                    );

                    console.log("Google Auth (Official Button) initialized successfully");
                } else {
                    // Retry after 500ms if script is not yet loaded
                    setTimeout(initializeGoogle, 500);
                }
            };

            initializeGoogle();
        } else {
            console.error("Google button container not found in DOM");
        }


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
        // PASSWORD TOGGLE (SHOW/HIDE) FUNCTIONALITY
        // -------------------------------------------------------------
        function toggleVisibility(inputId, buttonId) {
            const input = document.getElementById(inputId);
            const button = document.getElementById(buttonId);
            const icon = button.querySelector('i');

            if (input.type === 'password') {
                input.type = 'text';
                icon.classList.remove('fa-eye');
                icon.classList.add('fa-eye-slash');
            } else {
                input.type = 'password';
                icon.classList.remove('fa-eye-slash');
                icon.classList.add('fa-eye');
            }
        }

        // Signup password toggles
        const toggleSignupPass = document.getElementById('toggle-signup-pass');
        const toggleSignupPass2 = document.getElementById('toggle-signup-pass2');

        if (toggleSignupPass) {
            toggleSignupPass.addEventListener('click', () => toggleVisibility('signup-pass', 'toggle-signup-pass'));
        }
        if (toggleSignupPass2) {
            toggleSignupPass2.addEventListener('click', () => toggleVisibility('signup-pass2', 'toggle-signup-pass2'));
        }




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

                // If OTP was sent
                if (data.detail && data.email) {
                    setButtonLoading(submitBtn, false);

                    // Switch Forms
                    document.getElementById("signup-form").classList.add("hidden");
                    const otpForm = document.getElementById("otp-form");
                    otpForm.classList.remove("hidden");

                    document.getElementById("otp-email-display").textContent = data.email;

                    // Setup OTP Handler
                    setupOtpHandler(data.email, baseUrl);
                    return;
                }

                // Fallback (Direct Login if backend changes back)
                localStorage.setItem("access", data.access);
                localStorage.setItem("refresh", data.refresh);

                console.log("Signup successful. Redirecting to dashboard...");
                window.location.assign(window.location.origin + '/dashboard/');

            } catch (error) {
                console.error("Signup error:", error);
                err.textContent = "Network error. Try again.";
                setButtonLoading(submitBtn, false);
            }
        });

        function setupOtpHandler(email, baseUrl) {
            const otpForm = document.getElementById("otp-form");

            // Remove old listeners to avoid duplicates if user retries
            const newForm = otpForm.cloneNode(true);
            otpForm.parentNode.replaceChild(newForm, otpForm);

            newForm.addEventListener("submit", async (e) => {
                e.preventDefault();
                const btn = newForm.querySelector("button[type='submit']");
                const err = document.getElementById("otp-error");
                const otp = newForm.querySelector("input[name='otp']").value.trim();

                err.textContent = "";
                setButtonLoading(btn, true);

                try {
                    const res = await fetch(baseUrl + "/api/verify-otp/", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ email, otp }),
                    });

                    const data = await res.json();

                    if (!res.ok) {
                        err.textContent = data.detail || "Verification failed";
                        setButtonLoading(btn, false);
                        return;
                    }

                    // Success
                    localStorage.setItem("access", data.access);
                    localStorage.setItem("refresh", data.refresh);

                    showToast("Account Verified!", "success");

                    setTimeout(() => {
                        window.location.assign(window.location.origin + '/dashboard/');
                    }, 500);

                } catch (error) {
                    console.error("OTP error:", error);
                    err.textContent = "Network error.";
                    setButtonLoading(btn, false);
                }
            });
        }


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


        // Signin password toggle
        const toggleSigninPass = document.getElementById('toggle-signin-pass');
        if (toggleSigninPass) {
            toggleSigninPass.addEventListener('click', () => toggleVisibility('signin-pass', 'toggle-signin-pass'));
        }
    }
}
