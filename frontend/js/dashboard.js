import { setButtonLoading, showToast, authFetch } from './utils.js';

export function initDashboard() {
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
        const genderInput = document.getElementById('gender-input');

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
                    if (genderInput) genderInput.value = data.gender || '';

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
        let cropperUploadType = 'avatar'; // Track what we're cropping: 'avatar' or 'gallery'
        let galleryCaption = ''; // Store caption for gallery uploads

        const cropperModal = document.getElementById('cropper-modal');
        const cropperImage = document.getElementById('cropper-image');

        // 1. Intercept Avatar File Selection
        avatarInput.addEventListener('change', (e) => {
            console.log("Avatar file selected:", e.target.files[0]);
            const file = e.target.files[0];
            if (file) {
                cropperUploadType = 'avatar';
                openCropperModal(file);
            }
            // Clear input so same file can be selected again
            e.target.value = '';
        });

        // Helper function to open cropper modal
        function openCropperModal(file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                cropperImage.src = e.target.result;
                cropperModal.classList.remove('hidden');

                // Init Cropper
                if (cropper) cropper.destroy();
                cropper = new Cropper(cropperImage, {
                    aspectRatio: cropperUploadType === 'avatar' ? 1 : 1, // Both use 1:1 for now
                    viewMode: 1,
                });
            };
            reader.readAsDataURL(file);
        }

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

                if (cropperUploadType === 'avatar') {
                    // Upload as avatar
                    formData.append('avatar', blob, 'avatar.png');

                    await authFetch('/api/profile/', {
                        method: 'PATCH',
                        body: formData
                    });

                    // Update avatar preview
                    avatarPreview.src = URL.createObjectURL(blob);
                } else if (cropperUploadType === 'gallery') {
                    // Upload as gallery photo
                    formData.append('image', blob, 'cropped.jpg');
                    formData.append('caption', galleryCaption);

                    await authFetch('/api/photos/', {
                        method: 'POST',
                        body: formData
                    });

                    // Reload gallery
                    loadPhotos();

                    // Reset caption
                    galleryCaption = '';
                    document.getElementById('caption-input').value = '';

                    // Close photo modal
                    photoModal.classList.add('hidden');
                }

                cropperModal.classList.add('hidden');
                cropper.destroy();
                cropper = null;

                // Remove loading state
                setButtonLoading(saveBtn, false);
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
                gmail: gmailInput.value,
                gender: genderInput.value
            };

            // Set loading state
            setButtonLoading(submitBtn, true);

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

            // Show success toast
            showToast('Profile updated successfully!', 'success');
        });

        // Logout
        document.getElementById('logout-btn').addEventListener('click', () => {
            localStorage.clear();
            window.location.href = '/';
        });

        // Share Profile Link
        const shareBtn = document.getElementById('share-profile-btn');
        if (shareBtn) {
            shareBtn.addEventListener('click', () => {
                // Get the processed absolute URL from the view-public-btn
                const url = viewPublicBtn.href;
                navigator.clipboard.writeText(url).then(() => {
                    showToast('Profile link copied to clipboard!', 'success');
                }).catch(err => {
                    console.error('Failed to copy:', err);
                    showToast('Failed to copy', 'error');
                });
            });
        }

        // ---------------------------------------------------------
        // GALLERY LOGIC
        // ---------------------------------------------------------
        const photoModal = document.getElementById('photo-modal');
        const photoInput = document.getElementById('photo-input');

        document.getElementById('add-photo-btn').onclick = () => photoModal.classList.remove('hidden');
        document.getElementById('photo-cancel').onclick = () => photoModal.classList.add('hidden');

        // Load Photos
        async function loadPhotos() {
            const res = await authFetch('/api/photos/');
            if (res.ok) {
                const photos = await res.json();

                // Update photo count display
                const countSpan = document.getElementById('photo-count');
                if (countSpan) {
                    countSpan.textContent = `(${photos.length}/6)`;
                }

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

        // Photo Preview on File Select
        photoInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    const previewImg = document.getElementById('photo-preview-img');
                    const placeholder = document.getElementById('photo-placeholder');
                    const filenameP = document.getElementById('photo-filename');

                    // Show preview, hide placeholder
                    previewImg.src = event.target.result;
                    previewImg.classList.remove('hidden');
                    placeholder.classList.add('hidden');

                    // Update filename if element exists
                    if (filenameP) {
                        filenameP.textContent = file.name;
                    }
                };
                reader.readAsDataURL(file);
            }
        });

        // Photo Input - Initialize Cropper Inside Upload Modal
        let photoCropper = null; // Separate cropper instance for gallery photos

        photoInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    const previewImg = document.getElementById('photo-preview-img');
                    const placeholder = document.getElementById('photo-placeholder');

                    // Show preview image, hide placeholder
                    previewImg.src = event.target.result;
                    previewImg.classList.remove('hidden');
                    placeholder.classList.add('hidden');

                    // Hide file input so it doesn't block cropper interaction
                    photoInput.classList.add('hidden');

                    // Destroy previous cropper if exists
                    if (photoCropper) {
                        photoCropper.destroy();
                    }

                    // Initialize cropper on the preview image (SAME as avatar cropper)
                    photoCropper = new Cropper(previewImg, {
                        aspectRatio: 1,
                        viewMode: 1,
                        dragMode: 'crop', // Drag crop box, not image
                    });
                };
                reader.readAsDataURL(file);
            }
        });

        // Upload Photo - Get Cropped Image
        document.getElementById('photo-form').addEventListener('submit', async (e) => {
            e.preventDefault();

            const submitBtn = e.target.querySelector('button[type="submit"]');

            // Check if cropper exists
            if (!photoCropper) {
                showToast('Please select an image first', 'error');
                return;
            }

            // Set loading state
            setButtonLoading(submitBtn, true);

            // Get cropped canvas and convert to blob
            photoCropper.getCroppedCanvas().toBlob(async (blob) => {
                const formData = new FormData();
                formData.append('image', blob, 'cropped.jpg');
                formData.append('caption', document.getElementById('caption-input').value);

                const res = await authFetch('/api/photos/', {
                    method: 'POST',
                    body: formData
                });

                if (res.ok) {
                    // Clean up
                    photoModal.classList.add('hidden');
                    photoCropper.destroy();
                    photoCropper = null;
                    e.target.reset();

                    // Reset preview
                    const previewImg = document.getElementById('photo-preview-img');
                    const placeholder = document.getElementById('photo-placeholder');
                    previewImg.classList.add('hidden');
                    placeholder.classList.remove('hidden');

                    // Show file input again
                    photoInput.classList.remove('hidden');

                    // Reload gallery
                    loadPhotos();

                    setButtonLoading(submitBtn, false);
                } else {
                    const data = await res.json();
                    showToast(data.detail || "Upload failed. Limit reached?", 'error');
                    setButtonLoading(submitBtn, false);
                }
            });
        });

        // Delete Photo (Global function for onclick)
        window.deletePhoto = async (id) => {
            await authFetch(`/api/photos/${id}/`, {
                method: 'DELETE'
            });

            loadPhotos();

            // Show success toast
            showToast('Photo deleted successfully!', 'success');
        };


        // -------------------------------------------------------------
        // USER SEARCH (Desktop + Mobile)
        // -------------------------------------------------------------
        const searchInput = document.getElementById('user-search-input');
        const searchDropdown = document.getElementById('search-dropdown');
        const searchInputMobile = document.getElementById('user-search-input-mobile');
        const searchDropdownMobile = document.getElementById('search-dropdown-mobile');
        let searchTimeout = null;

        async function performSearch(query, dropdownElement) {
            if (!query || query.trim().length < 2) {
                if (dropdownElement) dropdownElement.classList.add('hidden');
                return;
            }

            try {
                const response = await authFetch(`/api/search/users/?q=${encodeURIComponent(query.trim())}`);
                if (!response.ok) throw new Error();

                const users = await response.json();
                renderSearchResults(users, dropdownElement);
            } catch (err) {
                console.error('Search failed:', err);
                if (dropdownElement) dropdownElement.classList.add('hidden');
            }
        }

        function renderSearchResults(users, dropdownElement) {
            if (!dropdownElement) return;

            if (users.length === 0) {
                dropdownElement.innerHTML = `
                    <div class="px-4 py-6 text-center text-gray-500 text-sm">
                        <i class="fas fa-user-slash mb-2 text-2xl"></i>
                        <p>No users found</p>
                    </div>
                `;
                dropdownElement.classList.remove('hidden');
                return;
            }

            dropdownElement.innerHTML = users.map(user => `
                <div class="flex items-center gap-3 px-4 py-3 hover:bg-white/5 cursor-pointer transition user-result" data-url="${user.profile_url}">
                    <!-- Avatar (32px circle) -->
                    <div class="w-8 h-8 rounded-full bg-gray-700 overflow-hidden border border-white/20 shrink-0">
                        ${user.avatar
                    ? `<img src="${user.avatar}" class="w-full h-full object-cover" alt="${user.username}">`
                    : `<div class="w-full h-full bg-purple-500 flex items-center justify-center text-xs font-bold text-white">${user.username[0].toUpperCase()}</div>`
                }
                    </div>
                    
                    <!-- Names -->
                    <div class="flex-1 min-w-0">
                        <div class="font-bold text-white text-sm truncate">${user.display_name}</div>
                        <div class="text-gray-500 text-xs truncate">@${user.username}</div>
                    </div>
                </div>
            `).join('');

            // Add click listeners to results
            dropdownElement.querySelectorAll('.user-result').forEach(result => {
                result.addEventListener('click', (e) => {
                    const url = e.currentTarget.getAttribute('data-url');
                    window.open(url, '_blank');
                });
            });

            dropdownElement.classList.remove('hidden');
        }

        function setupSearchInput(inputElement, dropdownElement) {
            if (!inputElement || !dropdownElement) return;

            // Debounced search input
            inputElement.addEventListener('input', (e) => {
                clearTimeout(searchTimeout);
                const query = e.target.value;

                if (query.trim().length < 2) {
                    dropdownElement.classList.add('hidden');
                    return;
                }

                searchTimeout = setTimeout(() => {
                    performSearch(query, dropdownElement);
                }, 300); // 300ms debounce
            });

            // Close dropdown on outside click
            document.addEventListener('click', (e) => {
                if (!inputElement.contains(e.target) && !dropdownElement.contains(e.target)) {
                    dropdownElement.classList.add('hidden');
                }
            });

            // Re-search on focus if there's existing text
            inputElement.addEventListener('focus', (e) => {
                if (e.target.value.trim().length >= 2) {
                    performSearch(e.target.value, dropdownElement);
                }
            });
        }

        // Setup both desktop and mobile search
        setupSearchInput(searchInput, searchDropdown);
        setupSearchInput(searchInputMobile, searchDropdownMobile);


        // Init
        loadProfile();
        loadPhotos();
    }
}
