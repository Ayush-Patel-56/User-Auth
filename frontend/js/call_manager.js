import { authFetch } from './utils.js';

/**
 * Manages Audio/Video calls using Agora SDK.
 * Handles token fetching, stream management, and UI updates.
 */
export class CallManager {
    constructor() {
        // Ensure AgoraRTC is available globally from CDN
        if (typeof AgoraRTC === 'undefined') {
            console.error("Agora SDK not loaded");
            return;
        }
        this.client = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });
        this.localTracks = {
            videoTrack: null,
            audioTrack: null
        };
        this.remoteUsers = {};

        // UI Elements
        this.modal = document.getElementById('call-modal');
        this.localContainer = document.getElementById('video-local-container');
        this.remoteContainer = document.getElementById('video-remote-container');
        this.statusEl = document.getElementById('call-status');

        // Buttons
        this.btnMic = document.getElementById('btn-toggle-mic');
        this.btnCam = document.getElementById('btn-toggle-cam');
        this.btnEnd = document.getElementById('btn-end-call');

        this.setupEventListeners();
    }

    setupEventListeners() {
        this.btnEnd.onclick = () => this.leaveCall();
        this.btnMic.onclick = () => this.toggleMic();
        this.btnCam.onclick = () => this.toggleCam();

        // Callbacks
        this.onCallEnd = null;

        // Agora Events
        this.client.on("user-published", this.handleUserPublished.bind(this));
        this.client.on("user-unpublished", this.handleUserUnpublished.bind(this));
        this.client.on("user-left", this.handleUserLeft.bind(this));
    }

    async startCall(threadId, isVideo = true) {
        if (!AgoraRTC) {
            console.error("Agora SDK not loaded");
            return;
        }

        try {
            this.showModal(isVideo ? "Starting video call..." : "Starting voice call...");

            // 1. Get Token from Backend
            const response = await authFetch(`/api/call/token/${threadId}/`);
            if (!response.ok) throw new Error("Failed to get call token");

            const data = await response.json();

            // 2. Join Agora Channel
            await this.joinChannel(data.appId, data.channelName, data.token, data.uid, isVideo);

            return data.channelName;

        } catch (error) {
            console.error(error);
            this.hideModal();
            alert("Could not start call: " + error.message);
            throw error;
        }
    }

    async joinChannel(appId, channel, token, uid, isVideo = true) {
        try {
            // Join
            await this.client.join(appId, channel, token, uid);

            // Create & Publish Local Tracks
            this.localTracks.audioTrack = await AgoraRTC.createMicrophoneAudioTrack();

            if (isVideo) {
                this.localTracks.videoTrack = await AgoraRTC.createCameraVideoTrack();
                // Play Local Video
                this.localTracks.videoTrack.play(this.localContainer);
                // Publish
                await this.client.publish([this.localTracks.audioTrack, this.localTracks.videoTrack]);
            } else {
                // Audio Only - Show placeholder
                this.localContainer.innerHTML = '<div class="flex items-center justify-center h-full bg-gray-800 text-gray-500"><i class="fas fa-microphone-lines text-3xl animate-pulse"></i></div>';
                // Publish Audio Only
                await this.client.publish([this.localTracks.audioTrack]);
            }

            this.updateStatus("Connected. Waiting for others...");

        } catch (error) {
            console.error("Join error:", error);
            throw error;
        }
    }

    async handleUserPublished(user, mediaType) {
        await this.client.subscribe(user, mediaType);

        if (mediaType === 'video') {
            // Clear placeholder
            this.remoteContainer.innerHTML = '';

            // Create container for this user
            const remotePlayerContainer = document.createElement("div");
            remotePlayerContainer.id = user.uid.toString();
            remotePlayerContainer.style.width = "100%";
            remotePlayerContainer.style.height = "100%";
            this.remoteContainer.append(remotePlayerContainer);

            user.videoTrack.play(remotePlayerContainer);

            this.updateStatus("Connected");
        }

        if (mediaType === 'audio') {
            user.audioTrack.play();
        }
    }

    handleUserUnpublished(user) {
        const playerContainer = document.getElementById(user.uid.toString());
        if (playerContainer) playerContainer.remove();

        // If no remote users, show waiting message
        if (this.remoteContainer.childElementCount === 0) {
            this.remoteContainer.innerHTML = `
                <div class="flex items-center justify-center h-full text-gray-500">
                    <p>User disable camera.</p>
                </div>
           `;
        }
    }

    async handleUserLeft(user) {
        // When remote user leaves (hangs up)
        const playerContainer = document.getElementById(user.uid.toString());
        if (playerContainer) playerContainer.remove();

        // For 1:1 calls, if they leave, we should end the call automatically
        this.updateStatus("Remote user ended the call.");
        await new Promise(r => setTimeout(r, 1500)); // Show message for 1.5s
        await this.leaveCall();
    }

    async leaveCall() {
        for (let trackName in this.localTracks) {
            var track = this.localTracks[trackName];
            if (track) {
                track.stop();
                track.close();
                this.localTracks[trackName] = null;
            }
        }

        await this.client.leave();
        this.hideModal();
        this.remoteContainer.innerHTML = '<div class="flex items-center justify-center h-full text-gray-500"><p>Waiting for user to join...</p></div>';

        if (this.onCallEnd) {
            this.onCallEnd();
        }
    }

    toggleMic() {
        if (!this.localTracks.audioTrack) return;
        const isMuted = this.localTracks.audioTrack.muted;
        this.localTracks.audioTrack.setMuted(!isMuted);
        this.btnMic.classList.toggle('bg-red-500', !isMuted); // Red if muted
        this.btnMic.innerHTML = !isMuted ? '<i class="fas fa-microphone-slash"></i>' : '<i class="fas fa-microphone"></i>';
    }

    toggleCam() {
        if (!this.localTracks.videoTrack) return;
        const isMuted = this.localTracks.videoTrack.muted;
        this.localTracks.videoTrack.setMuted(!isMuted);
        this.btnCam.classList.toggle('bg-red-500', !isMuted);
        this.btnCam.innerHTML = !isMuted ? '<i class="fas fa-video-slash"></i>' : '<i class="fas fa-video"></i>';
    }

    showModal(statusText) {
        this.modal.classList.remove('hidden');
        this.updateStatus(statusText);
    }

    hideModal() {
        this.modal.classList.add('hidden');
    }

    updateStatus(text) {
        this.statusEl.innerText = text;
    }
}
