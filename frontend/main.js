import { initAnimations } from './js/animations.js';
import { initAuth } from './js/signup_signin.js';
import { initDashboard } from './js/dashboard.js';
import { initPublicProfile } from './js/public_profile.js';

console.log("Main script loaded");

// Initialize Animations (Global, runs on all pages)
console.log("Initializing animations...");
initAnimations();

// Initialize Auth (Landing page logic)
console.log("Initializing auth...");
initAuth();

// Initialize Dashboard (Dashboard logic)
console.log("Initializing dashboard...");
initDashboard();

// Initialize Public Profile (Lightbox)
console.log("Initializing Public Profile...");
initPublicProfile();
