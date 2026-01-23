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
            // Get Base64 String (JPEG 80% Quality)
            const base64Image = photoCropper.getCroppedCanvas().toDataURL('image/jpeg', 0.8);

            // Vercel Limit Check
            if (base64Image.length > 5.5 * 1024 * 1024) {
                showToast("Image is too large (Max 4MB).", 'error');
                setButtonLoading(submitBtn, false);
                return;
            }

            const payload = {
                image: base64Image,
                caption: document.getElementById('caption-input').value
            };

            const res = await authFetch('/api/photos/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
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
                const data = await res.json().catch(() => ({}));
                showToast(data.detail || "Upload failed.", 'error');
                setButtonLoading(submitBtn, false);
            }
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
                        <div class="font-bold text-white text-sm truncate">${user.display_name || user.username}</div>
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


        // -------------------------------------------------------------
        // EDUCATION MANAGEMENT
        // -------------------------------------------------------------
        const educationList = document.getElementById('education-list');
        const educationModal = document.getElementById('education-modal');
        const educationForm = document.getElementById('education-form');
        const educationIdInput = document.getElementById('education-id');
        const educationOrgInput = document.getElementById('education-org');
        const educationLocationInput = document.getElementById('education-location');
        const educationStartYearInput = document.getElementById('education-start-year');
        const educationEndYearInput = document.getElementById('education-end-year');
        const educationModalTitle = document.getElementById('education-modal-title');

        // Open Add Education Modal
        document.getElementById('add-education-btn').addEventListener('click', () => {
            educationForm.reset();
            educationIdInput.value = '';
            educationModalTitle.textContent = 'Add Education';
            educationModal.classList.remove('hidden');
        });

        // Close Education Modal
        document.getElementById('education-cancel').addEventListener('click', () => {
            educationModal.classList.add('hidden');
        });

        // Load Education Entries
        async function loadEducation() {
            try {
                const res = await authFetch('/api/education/');
                if (res.ok) {
                    const educations = await res.json();

                    if (educations.length === 0) {
                        educationList.innerHTML = `
                            <div class="text-center py-8 text-gray-400">
                                <i class="fas fa-graduation-cap text-4xl mb-3 opacity-50"></i>
                                <p>No education entries yet. Click "Add Education" to add one.</p>
                            </div>
                        `;
                        return;
                    }

                    educationList.innerHTML = educations.map(edu => `
                        <div class="glass-card p-4 rounded-xl hover:bg-white/5 transition">
                            <div class="flex justify-between items-start">
                                <div class="flex-1">
                                    <h3 class="font-bold text-lg text-white">${edu.organization}</h3>
                                    ${edu.location ? `<p class="text-sm text-gray-400 mb-1"><i class="fas fa-map-marker-alt mr-1"></i>${edu.location}</p>` : ''}
                                    <p class="text-sm text-cyan-400">
                                        <i class="fas fa-calendar mr-1"></i>
                                        ${edu.start_year} - ${edu.end_year || 'Present'}
                                    </p>
                                </div>
                                <div class="flex gap-2">
                                    <button onclick="editEducation(${edu.id})" class="text-blue-400 hover:text-blue-300 transition">
                                        <i class="fas fa-edit"></i>
                                    </button>
                                    <button onclick="deleteEducation(${edu.id})" class="text-red-400 hover:text-red-300 transition">
                                        <i class="fas fa-trash"></i>
                                    </button>
                                </div>
                            </div>
                        </div>
                    `).join('');
                }
            } catch (error) {
                console.error('Error loading education:', error);
            }
        }

        // Save Education Entry (Create or Update)
        educationForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const submitBtn = e.target.querySelector('button[type="submit"]');
            setButtonLoading(submitBtn, true);

            const payload = {
                organization: educationOrgInput.value.trim(),
                location: educationLocationInput.value.trim(),
                start_year: parseInt(educationStartYearInput.value),
                end_year: educationEndYearInput.value ? parseInt(educationEndYearInput.value) : null
            };

            const educationId = educationIdInput.value;
            const method = educationId ? 'PUT' : 'POST';
            const url = educationId ? `/api/education/${educationId}/` : '/api/education/';

            try {
                const res = await authFetch(url, {
                    method: method,
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(payload)
                });

                if (res.ok) {
                    educationModal.classList.add('hidden');
                    loadEducation();
                    showToast(`Education ${educationId ? 'updated' : 'added'} successfully!`, 'success');
                } else {
                    const data = await res.json();
                    showToast(data.detail || 'Failed to save education', 'error');
                }
            } catch (error) {
                console.error('Error saving education:', error);
                showToast('An error occurred', 'error');
            } finally {
                setButtonLoading(submitBtn, false);
            }
        });

        // Edit Education Entry (Global function for onclick)
        window.editEducation = async (id) => {
            try {
                const res = await authFetch(`/api/education/${id}/`);
                if (res.ok) {
                    const edu = await res.json();

                    educationIdInput.value = edu.id;
                    educationOrgInput.value = edu.organization;
                    educationLocationInput.value = edu.location || '';
                    educationStartYearInput.value = edu.start_year;
                    educationEndYearInput.value = edu.end_year || '';

                    educationModalTitle.textContent = 'Edit Education';
                    educationModal.classList.remove('hidden');
                }
            } catch (error) {
                console.error('Error loading education:', error);
                showToast('Failed to load education data', 'error');
            }
        };

        // Delete Education Entry (Global function for onclick)
        window.deleteEducation = async (id) => {
            if (!confirm('Are you sure you want to delete this education entry?')) return;

            try {
                const res = await authFetch(`/api/education/${id}/`, {
                    method: 'DELETE'
                });

                if (res.ok) {
                    loadEducation();
                    showToast('Education deleted successfully!', 'success');
                } else {
                    showToast('Failed to delete education', 'error');
                }
            } catch (error) {
                console.error('Error deleting education:', error);
                showToast('An error occurred', 'error');
            }
        };


        // -------------------------------------------------------------
        // EXPERIENCE MANAGEMENT
        // -------------------------------------------------------------
        const experienceList = document.getElementById('experience-list');
        const experienceModal = document.getElementById('experience-modal');
        const experienceForm = document.getElementById('experience-form');
        const experienceIdInput = document.getElementById('experience-id');
        const experienceTitleInput = document.getElementById('experience-title');
        const experienceEmploymentTypeInput = document.getElementById('experience-employment-type');
        const experienceCompanyInput = document.getElementById('experience-company');
        const experienceLocationInput = document.getElementById('experience-location');
        const experienceStartDateInput = document.getElementById('experience-start-date');
        const experienceEndDateInput = document.getElementById('experience-end-date');
        const experienceDescriptionInput = document.getElementById('experience-description');
        const experienceModalTitle = document.getElementById('experience-modal-title');

        // Open Add Experience Modal
        document.getElementById('add-experience-btn').addEventListener('click', () => {
            experienceForm.reset();
            experienceIdInput.value = '';
            experienceModalTitle.textContent = 'Add Experience';
            experienceModal.classList.remove('hidden');
        });

        // Close Experience Modal
        document.getElementById('experience-cancel').addEventListener('click', () => {
            experienceModal.classList.add('hidden');
        });

        // Helper function to format dates
        function formatDate(dateString) {
            if (!dateString) return 'Present';
            const date = new Date(dateString + '-01'); // Add day to make valid date
            return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        }

        // Load Experience Entries
        async function loadExperience() {
            try {
                const res = await authFetch('/api/experience/');
                if (res.ok) {
                    const experiences = await res.json();

                    if (experiences.length === 0) {
                        experienceList.innerHTML = `
                            <div class="text-center py-8 text-gray-400">
                                <i class="fas fa-briefcase text-4xl mb-3 opacity-50"></i>
                                <p>No experience entries yet. Click "Add Experience" to add one.</p>
                            </div>
                        `;
                        return;
                    }

                    experienceList.innerHTML = experiences.map(exp => `
                        <div class="glass-card p-6 rounded-xl hover:bg-white/5 transition">
                            <div class="flex justify-between items-start">
                                <div class="flex-1">
                                    <h3 class="font-bold text-lg text-white">${exp.title}</h3>
                                    <p class="text-sm text-cyan-400 mb-1">${exp.company}</p>
                                    <p class="text-xs text-gray-400 mb-2">
                                        <span class="bg-cyan-500/20 text-cyan-400 px-2 py-0.5 rounded">${exp.employment_type_display}</span>
                                    </p>
                                    ${exp.location ? `<p class="text-sm text-gray-400 mb-1"><i class="fas fa-map-marker-alt mr-1"></i>${exp.location}</p>` : ''}
                                    <p class="text-sm text-gray-500">
                                        <i class="fas fa-calendar mr-1"></i>
                                        ${formatDate(exp.start_date)} - ${formatDate(exp.end_date)}
                                    </p>
                                    ${exp.description ? `<p class="mt-3 text-sm text-gray-300 leading-relaxed">${exp.description}</p>` : ''}
                                </div>
                                <div class="flex gap-2 ml-4">
                                    <button onclick="editExperience(${exp.id})" class="text-blue-400 hover:text-blue-300 transition">
                                        <i class="fas fa-edit"></i>
                                    </button>
                                    <button onclick="deleteExperience(${exp.id})" class="text-red-400 hover:text-red-300 transition">
                                        <i class="fas fa-trash"></i>
                                    </button>
                                </div>
                            </div>
                        </div>
                    `).join('');
                }
            } catch (error) {
                console.error('Error loading experience:', error);
            }
        }

        // Save Experience Entry (Create or Update)
        experienceForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const submitBtn = e.target.querySelector('button[type="submit"]');
            setButtonLoading(submitBtn, true);

            const payload = {
                title: experienceTitleInput.value.trim(),
                employment_type: experienceEmploymentTypeInput.value,
                company: experienceCompanyInput.value.trim(),
                location: experienceLocationInput.value.trim(),
                start_date: experienceStartDateInput.value + '-01', // Add day for full date
                end_date: experienceEndDateInput.value ? experienceEndDateInput.value + '-01' : null,
                description: experienceDescriptionInput.value.trim()
            };

            const experienceId = experienceIdInput.value;
            const method = experienceId ? 'PUT' : 'POST';
            const url = experienceId ? `/api/experience/${experienceId}/` : '/api/experience/';

            try {
                const res = await authFetch(url, {
                    method: method,
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(payload)
                });

                if (res.ok) {
                    experienceModal.classList.add('hidden');
                    loadExperience();
                    showToast(`Experience ${experienceId ? 'updated' : 'added'} successfully!`, 'success');
                } else {
                    const data = await res.json();
                    showToast(data.detail || 'Failed to save experience', 'error');
                }
            } catch (error) {
                console.error('Error saving experience:', error);
                showToast('An error occurred', 'error');
            } finally {
                setButtonLoading(submitBtn, false);
            }
        });

        // Edit Experience Entry (Global function for onclick)
        window.editExperience = async (id) => {
            try {
                const res = await authFetch(`/api/experience/${id}/`);
                if (res.ok) {
                    const exp = await res.json();

                    experienceIdInput.value = exp.id;
                    experienceTitleInput.value = exp.title;
                    experienceEmploymentTypeInput.value = exp.employment_type;
                    experienceCompanyInput.value = exp.company;
                    experienceLocationInput.value = exp.location || '';
                    // Remove the day part for month input
                    experienceStartDateInput.value = exp.start_date.substring(0, 7);
                    experienceEndDateInput.value = exp.end_date ? exp.end_date.substring(0, 7) : '';
                    experienceDescriptionInput.value = exp.description || '';

                    experienceModalTitle.textContent = 'Edit Experience';
                    experienceModal.classList.remove('hidden');
                }
            } catch (error) {
                console.error('Error loading experience:', error);
                showToast('Failed to load experience data', 'error');
            }
        };

        // Delete Experience Entry (Global function for onclick)
        window.deleteExperience = async (id) => {
            if (!confirm('Are you sure you want to delete this experience entry?')) return;

            try {
                const res = await authFetch(`/api/experience/${id}/`, {
                    method: 'DELETE'
                });

                if (res.ok) {
                    loadExperience();
                    showToast('Experience deleted successfully!', 'success');
                } else {
                    showToast('Failed to delete experience', 'error');
                }
            } catch (error) {
                console.error('Error deleting experience:', error);
                showToast('An error occurred', 'error');
            }
        };


        // -------------------------------------------------------------
        // SKILLS MANAGEMENT
        // -------------------------------------------------------------
        const skillInput = document.getElementById('skill-input');
        const addSkillBtn = document.getElementById('add-skill-btn');
        const skillsList = document.getElementById('skills-list');
        const suggestedSkillBtns = document.querySelectorAll('.suggested-skill-btn');

        // Load Skills
        async function loadSkills() {
            try {
                const res = await authFetch('/api/skills/');
                if (res.ok) {
                    const skills = await res.json();
                    renderSkills(skills);
                }
            } catch (error) {
                console.error('Error loading skills:', error);
            }
        }

        // Render Skills as Tags
        function renderSkills(skills) {
            if (skills.length === 0) {
                skillsList.innerHTML = `
                    <p class="text-gray-400 text-sm">No skills added yet. Enter a skill above or click a suggested skill.</p>
                `;
                return;
            }

            skillsList.innerHTML = skills.map(skill => `
                <div class="skill-tag">
                    ${skill.name}
                    <button onclick="deleteSkill(${skill.id})" title="Remove skill">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            `).join('');
        }

        // Add Skill
        async function addSkill(skillName) {
            if (!skillName || !skillName.trim()) return;

            try {
                const res = await authFetch('/api/skills/', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ name: skillName.trim() })
                });

                if (res.ok) {
                    loadSkills();
                    skillInput.value = '';
                    showToast('Skill added successfully!', 'success');
                } else {
                    const data = await res.json();
                    if (res.status === 400 && data.name) {
                        showToast('This skill already exists', 'error');
                    } else {
                        showToast(data.detail || 'Failed to add skill', 'error');
                    }
                }
            } catch (error) {
                console.error('Error adding skill:', error);
                showToast('An error occurred', 'error');
            }
        }

        // Add Skill from Input Field
        addSkillBtn.addEventListener('click', () => {
            addSkill(skillInput.value);
        });

        // Add Skill on Enter Key
        skillInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                addSkill(skillInput.value);
            }
        });

        // Add Skill from Suggested Skills
        suggestedSkillBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const skillName = btn.getAttribute('data-skill');
                addSkill(skillName);
            });
        });

        // Delete Skill (Global function for onclick)
        window.deleteSkill = async (id) => {
            try {
                const res = await authFetch(`/api/skills/${id}/`, {
                    method: 'DELETE'
                });

                if (res.ok) {
                    loadSkills();
                    showToast('Skill removed successfully!', 'success');
                } else {
                    showToast('Failed to remove skill', 'error');
                }
            } catch (error) {
                console.error('Error deleting skill:', error);
                showToast('An error occurred', 'error');
            }
        };


        // Init
        loadProfile();
        loadPhotos();
        loadEducation();
        loadExperience();
        loadSkills();
    }
}
