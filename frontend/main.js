import { initAnimations } from './js/animations.js';
import { initAuth } from './js/signup_signin.js';
import { initDashboard } from './js/dashboard.js';
import { initPublicProfile } from './js/public_profile.js';
import { initCommunity } from './js/community.js'; // Import Community

console.log("Main script loaded");

// 1. Initialize Animations (Global - runs on all pages)
console.log("Initializing animations...");
initAnimations();

const path = window.location.pathname;

// 2. Initialize Auth (Landing Page Only)
if (path === '/' || path === '/index.html') {
    console.log("Initializing auth (Landing Page)...");
    initAuth();
}

// 3. Initialize Dashboard (Dashboard Only)
if (path.includes('/dashboard/')) {
    console.log("Initializing dashboard...");
    initDashboard();
}

// 4. Initialize Public Profile (Public Profile Only)
if (path.includes('/u/')) {
    console.log("Initializing Public Profile...");
    initPublicProfile();
}

// 5. Initialize Community (Chat Only)
if (path.includes('/community/')) {
    initCommunity();
}
