// Check authentication on page load
(function checkAuth() {
    const token = localStorage.getItem('supabase_token');
    const session = localStorage.getItem('supabase_session');

    console.log('🔍 Auth check:', {
        hasToken: !!token,
        hasSession: !!session,
        currentPath: window.location.pathname
    });

    if (!token || !session) {
        console.log('⚠️ No auth credentials found - redirecting to login');
        // Clear any partial data
        localStorage.removeItem('supabase_token');
        localStorage.removeItem('supabase_session');
        window.location.replace('/auth');
        return;
    }
    console.log('✅ User is authenticated');
})();

// Initialize upload progress modal on page load
document.addEventListener('DOMContentLoaded', () => {
    console.log('📤 Initializing upload progress system...');
    createUploadProgressModal();
    console.log('✅ Upload progress modal ready');
});

// Logout function
function handleLogout() {
    console.log('🚪 Logging out...');
    localStorage.removeItem('supabase_token');
    localStorage.removeItem('supabase_session');
    window.location.replace('/auth');
}

let uploadedGarmentPaths = []; // Changed to array for multiple garments
let selectedModelId = null;
let selectedBackgroundId = null;
let selectedHijabType = null; // نوع حجاب انتخاب شده
let allModels = [];
let currentCategory = 'woman';
let selectedShotTypeId = 'full-body';
let selectedPoseId = 'standing-front';
let selectedCameraAngleId = 'eye-level';
let selectedStyleId = 'professional';
let selectedLightingId = 'studio';

// Pagination variables
let currentPage = 1;
let currentPage2 = 1;
const modelsPerPage = 12; // Show 12 models per page

// NEW: Mode selection variables
// Check if mode is set from the HTML page (for individual service pages)
let currentMode = window.currentMode || 'complete-outfit'; // 'complete-outfit', 'accessories-only', 'color-collection'
let uploadedAccessoryPath = null; // Path to uploaded accessory product image
let selectedAccessoryType = null; // Type of accessory (handbag, watch, etc.)

// NEW: Color Collection mode variables
let uploadedColorVariants = []; // Array of uploaded color variant paths
let selectedDisplayScenario = null; // 'on-arm', 'hanging-rack', 'folded-stack', 'laid-out'

// ============================================
// UPLOAD PROGRESS SYSTEM
// ============================================
let uploadProgressModal = null;
let uploadProgressBar = null;
let uploadProgressText = null;
let uploadProgressPercentage = null;

// Create upload progress modal (call once on page load)
function createUploadProgressModal() {
    console.log('🔧 createUploadProgressModal called');
    if (uploadProgressModal) {
        console.log('ℹ️ Modal already exists, skipping creation');
        return; // Already created
    }

    console.log('🏗️ Creating new modal...');
    const modal = document.createElement('div');
    modal.id = 'uploadProgressModal';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.7);
        display: none;
        justify-content: center;
        align-items: center;
        z-index: 10000;
        backdrop-filter: blur(5px);
    `;

    modal.innerHTML = `
        <div style="background: white; border-radius: 20px; padding: 40px; min-width: 400px; max-width: 500px; box-shadow: 0 20px 60px rgba(0,0,0,0.3);">
            <div style="text-align: center; margin-bottom: 30px;">
                <div style="font-size: 3em; margin-bottom: 15px; animation: pulse 1.5s ease-in-out infinite;">
                    📤
                </div>
                <h3 style="margin: 0; font-size: 1.5em; color: #333;">در حال آپلود تصویر</h3>
                <p id="uploadProgressText" style="color: #666; margin: 10px 0 0 0; font-size: 0.95em;">آماده‌سازی...</p>
            </div>

            <div style="margin-bottom: 20px;">
                <div style="background: #f0f0f0; border-radius: 10px; overflow: hidden; height: 20px; position: relative;">
                    <div id="uploadProgressBar" style="background: linear-gradient(90deg, #667eea 0%, #764ba2 100%); height: 100%; width: 0%; transition: width 0.3s ease; border-radius: 10px;"></div>
                    <span id="uploadProgressPercentage" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); font-weight: bold; font-size: 0.85em; color: #333;">0%</span>
                </div>
            </div>

            <div style="text-align: center; color: #999; font-size: 0.85em;">
                <p style="margin: 0;">⏱️ لطفاً صبر کنید، این فرآیند ممکن است چند ثانیه طول بکشد</p>
            </div>
        </div>

        <style>
            @keyframes pulse {
                0%, 100% { transform: scale(1); opacity: 1; }
                50% { transform: scale(1.1); opacity: 0.8; }
            }
        </style>
    `;

    document.body.appendChild(modal);
    uploadProgressModal = modal;
    uploadProgressBar = document.getElementById('uploadProgressBar');
    uploadProgressText = document.getElementById('uploadProgressText');
    uploadProgressPercentage = document.getElementById('uploadProgressPercentage');
    console.log('✅ Modal created and added to DOM');
    console.log('✅ Modal elements:', {
        modal: !!uploadProgressModal,
        bar: !!uploadProgressBar,
        text: !!uploadProgressText,
        percentage: !!uploadProgressPercentage
    });
}

// Show upload progress
function showUploadProgress(message = 'در حال آپلود...') {
    console.log('📤 showUploadProgress called:', message);
    if (!uploadProgressModal) {
        console.log('⚠️ Modal not found, creating now...');
        createUploadProgressModal();
    }
    console.log('✅ Showing modal...');
    uploadProgressModal.style.display = 'flex';
    uploadProgressText.textContent = message;
    uploadProgressBar.style.width = '0%';
    uploadProgressPercentage.textContent = '0%';
    console.log('✅ Modal visible with message:', message);
}

// Update upload progress
function updateUploadProgress(percentage, message = null) {
    if (!uploadProgressModal) return;
    uploadProgressBar.style.width = `${percentage}%`;
    uploadProgressPercentage.textContent = `${Math.round(percentage)}%`;
    if (message) {
        uploadProgressText.textContent = message;
    }
}

// Hide upload progress
function hideUploadProgress() {
    if (uploadProgressModal) {
        uploadProgressModal.style.display = 'none';
    }
}

// Enhanced fetch with progress tracking
async function uploadFileWithProgress(endpoint, formData, onProgress) {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        // Track upload progress
        xhr.upload.addEventListener('progress', (e) => {
            if (e.lengthComputable) {
                const percentComplete = (e.loaded / e.total) * 100;
                if (onProgress) onProgress(percentComplete);
            }
        });

        // Handle completion
        xhr.addEventListener('load', () => {
            if (xhr.status >= 200 && xhr.status < 300) {
                try {
                    const response = JSON.parse(xhr.responseText);
                    resolve(response);
                } catch (error) {
                    reject(new Error('Invalid JSON response'));
                }
            } else {
                reject(new Error(`Upload failed with status ${xhr.status}`));
            }
        });

        // Handle errors
        xhr.addEventListener('error', () => {
            reject(new Error('Network error during upload'));
        });

        xhr.addEventListener('timeout', () => {
            reject(new Error('Upload timeout (30s exceeded)'));
        });

        // Set timeout (30 seconds)
        xhr.timeout = 30000;

        // Open and send
        xhr.open('POST', endpoint);
        xhr.send(formData);
    });
}

// NEW: Flat Lay mode variables
let uploadedFlatLayProducts = []; // Array of uploaded product paths for flat lay
let selectedArrangement = null; // 'grid', 'scattered', 'circular', 'diagonal'

// NEW: Scene Recreation mode variables
let uploadedReferencePhoto = null; // Path to uploaded reference photo
let sceneAnalysis = null; // AI-generated scene analysis/description
let referencePhotoPeopleCount = 1; // Number of people detected in reference photo

// NEW: Style Transfer mode variables
let uploadedStyleImages = []; // Array of style reference images (1-3)
let uploadedContentImage = null; // Content image to apply style to
let contentImageAnalysis = null; // AI analysis of content image (lighting, mood, atmosphere)

// Professional Quality Parameters (Used in prompt)
let selectedColorTempId = 'auto';
let selectedDofId = 'medium';
let selectedFabricId = 'auto';
let selectedShadowId = 'medium';
let selectedAspectRatioId = '1:1';
let selectedBgBlurId = 'medium';
let selectedFitId = 'regular';

// المان‌ها
const garmentInput = document.getElementById('garmentInput');
const uploadArea = document.getElementById('uploadArea');
const uploadPlaceholder = document.getElementById('uploadPlaceholder');
const garmentPreviews = document.getElementById('garmentPreviews');
const categorySelect = document.getElementById('categorySelect');
const modelsGrid = document.getElementById('modelsGrid');
const backgroundsGrid = document.getElementById('backgroundsGrid');
const poseSelect = document.getElementById('poseSelect');
const cameraAngleSelect = document.getElementById('cameraAngleSelect');
const styleSelect = document.getElementById('styleSelect');
const lightingSelect = document.getElementById('lightingSelect');
const generateBtn = document.getElementById('generateBtn');
const resultSection = document.getElementById('resultSection');
const resultImage = document.getElementById('resultImage');
const resultInfo = document.getElementById('resultInfo');
const downloadBtn = document.getElementById('downloadBtn');
const loadingOverlay = document.getElementById('loadingOverlay');

// Professional Quality Elements
const colorTempSelect = document.getElementById('colorTempSelect');
const dofSelect = document.getElementById('dofSelect');
const fabricSelect = document.getElementById('fabricSelect');
const shadowSelect = document.getElementById('shadowSelect');
const aspectRatioSelect = document.getElementById('aspectRatioSelect');
const bgBlurSelect = document.getElementById('bgBlurSelect');
const fitSelect = document.getElementById('fitSelect');

// Hijab section elements
const hijabSection = document.getElementById('hijabSection');

// NEW: Model 2 elements
const numberOfModelsSelect = document.getElementById('numberOfModelsSelect');
const model2Section = document.getElementById('model2Section');
const garmentUploadSection2 = document.getElementById('garmentUploadSection2');
const categorySelect2 = document.getElementById('categorySelect2');
const modelsGrid2 = document.getElementById('modelsGrid2');
const garmentInput2 = document.getElementById('garmentInput2');
const garmentUploadArea2 = document.getElementById('garmentUploadArea2');
const garmentPreviews2 = document.getElementById('garmentPreviews2');
const modelSelectorLabel = document.getElementById('modelSelectorLabel');

let selectedModelId2 = null;
let uploadedGarmentPaths2 = [];

// NEW: Mode selection elements
const modeCards = document.querySelectorAll('.mode-card');
const garmentUploadSection = document.getElementById('garmentUploadSection');
const accessoryUploadSection = document.getElementById('accessoryUploadSection');
const colorCollectionUploadSection = document.getElementById('colorCollectionUploadSection');
const flatLayUploadSection = document.getElementById('flatLayUploadSection');
const styleTransferSection = document.getElementById('styleTransferSection');
const modelSection = document.getElementById('modelSection');
const backgroundSection = document.getElementById('backgroundSection');

// Debug: Check if sections exist
console.log('🔍 Sections found:', {
    modelSection: !!modelSection,
    backgroundSection: !!backgroundSection,
    displayScenarioSection: !!document.getElementById('displayScenarioSection'),
    flatLayArrangementSection: !!document.getElementById('flatLayArrangementSection')
});

// NEW: Accessory upload elements
const accessoryInput = document.getElementById('accessoryInput');
const accessoryUploadArea = document.getElementById('accessoryUploadArea');
const accessoryUploadPlaceholder = document.getElementById('accessoryUploadPlaceholder');
const accessoryPreview = document.getElementById('accessoryPreview');
const accessoryTypeSelect = document.getElementById('accessoryType');

// NEW: Color Collection upload elements
const colorCollectionInput = document.getElementById('colorCollectionInput');
const colorCollectionUploadArea = document.getElementById('colorCollectionUploadArea');
const colorCollectionPlaceholder = document.getElementById('colorCollectionPlaceholder');
const colorCollectionPreviews = document.getElementById('colorCollectionPreviews');
const displayScenarioSection = document.getElementById('displayScenarioSection');

// NEW: Flat Lay upload elements
const flatLayInput = document.getElementById('flatLayInput');
const flatLayUploadArea = document.getElementById('flatLayUploadArea');
const flatLayPlaceholder = document.getElementById('flatLayPlaceholder');
const flatLayPreviews = document.getElementById('flatLayPreviews');
const flatLayArrangementSection = document.getElementById('flatLayArrangementSection');

// NEW: Scene Recreation elements
const sceneRecreationSection = document.getElementById('sceneRecreationSection');
const referencePhotoInput = document.getElementById('referencePhotoInput');
const referencePhotoUploadArea = document.getElementById('referencePhotoUploadArea');
const referencePhotoPlaceholder = document.getElementById('referencePhotoPlaceholder');
const referencePhotoPreview = document.getElementById('referencePhotoPreview');
const referencePhotoImg = document.getElementById('referencePhotoImg');
const sceneAnalysisSection = document.getElementById('sceneAnalysisSection');
const sceneAnalysisText = document.getElementById('sceneAnalysisText');
const reanalyzeBtn = document.getElementById('reanalyzeBtn');

// بارگذاری مدل‌ها
async function loadModels(mode = 'complete-outfit') {
    try {
        // Get auth token from localStorage if user is logged in
        const token = localStorage.getItem('supabase_token');
        const headers = {};
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        // Add mode parameter to fetch appropriate models
        const response = await fetch(`/api/models?mode=${mode}`, { headers });
        allModels = await response.json();

        // نمایش مدل‌های دسته‌بندی فعلی
        displayModelsByCategory(currentCategory);
    } catch (error) {
        console.error('خطا در بارگذاری مدل‌ها:', error);
    }
}

// نمایش مدل‌های یک دسته‌بندی خاص با Pagination
function displayModelsByCategory(category, page = 1) {
    const modelsGrid = document.getElementById('modelsGrid');
    if (!modelsGrid) return;

    currentPage = page;
    currentCategory = category;

    console.log('🔍 Filtering models by category:', category, 'Page:', page);
    console.log('📋 All models count:', allModels.length);

    const filteredModels = allModels.filter(model => model.category === category);

    console.log('✅ Filtered models count:', filteredModels.length);

    if (filteredModels.length === 0) {
        modelsGrid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: #666; padding: 40px;">هیچ مدلی در این دسته‌بندی یافت نشد</p>';
        return;
    }

    // Calculate pagination
    const totalPages = Math.ceil(filteredModels.length / modelsPerPage);
    const startIndex = (page - 1) * modelsPerPage;
    const endIndex = startIndex + modelsPerPage;
    const paginatedModels = filteredModels.slice(startIndex, endIndex);

    // Render models
    modelsGrid.innerHTML = paginatedModels.map(model => `
        <div class="model-card" data-id="${model.id}">
            <div class="model-image-container">
                <img src="${model.image}" alt="${model.name}" class="model-image">
            </div>
            <div class="card-title">${model.name}</div>
        </div>
    `).join('');

    // Add pagination controls if needed
    if (totalPages > 1) {
        const paginationHTML = `
            <div class="pagination-controls" style="grid-column: 1/-1; display: flex; justify-content: center; align-items: center; gap: 10px; margin-top: 20px; padding: 20px;">
                <button class="pagination-btn" onclick="displayModelsByCategory('${category}', ${page - 1})" ${page === 1 ? 'disabled' : ''}
                    style="padding: 10px 20px; border: 2px solid #667eea; background: ${page === 1 ? '#f0f0f0' : 'white'}; color: ${page === 1 ? '#999' : '#667eea'}; border-radius: 8px; cursor: ${page === 1 ? 'not-allowed' : 'pointer'}; font-weight: bold;">
                    ← قبلی
                </button>
                <span style="font-weight: bold; color: #333;">صفحه ${page} از ${totalPages} (${filteredModels.length} مدل)</span>
                <button class="pagination-btn" onclick="displayModelsByCategory('${category}', ${page + 1})" ${page === totalPages ? 'disabled' : ''}
                    style="padding: 10px 20px; border: 2px solid #667eea; background: ${page === totalPages ? '#f0f0f0' : 'white'}; color: ${page === totalPages ? '#999' : '#667eea'}; border-radius: 8px; cursor: ${page === totalPages ? 'not-allowed' : 'pointer'}; font-weight: bold;">
                    بعدی →
                </button>
            </div>
        `;
        modelsGrid.innerHTML += paginationHTML;
    }

    // افزودن رویداد کلیک به مدل‌ها
    document.querySelectorAll('.model-card').forEach(card => {
        card.addEventListener('click', () => selectModel(card.dataset.id));
    });

    // Scroll to top of models section
    modelsGrid.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// نمایش مدل‌های یک دسته‌بندی خاص برای مدل دوم با Pagination
function displayModelsByCategory2(category, page = 1) {
    if (!modelsGrid2) return;

    currentPage2 = page;

    const filteredModels = allModels.filter(model => model.category === category);

    if (filteredModels.length === 0) {
        modelsGrid2.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: #666; padding: 40px;">هیچ مدلی در این دسته‌بندی یافت نشد</p>';
        return;
    }

    // Calculate pagination
    const totalPages = Math.ceil(filteredModels.length / modelsPerPage);
    const startIndex = (page - 1) * modelsPerPage;
    const endIndex = startIndex + modelsPerPage;
    const paginatedModels = filteredModels.slice(startIndex, endIndex);

    // Render models
    modelsGrid2.innerHTML = paginatedModels.map(model => `
        <div class="model-card" data-id="${model.id}">
            <div class="model-image-container">
                <img src="${model.image}" alt="${model.name}" class="model-image">
            </div>
            <div class="card-title">${model.name}</div>
        </div>
    `).join('');

    // Add pagination controls if needed
    if (totalPages > 1) {
        const paginationHTML = `
            <div class="pagination-controls" style="grid-column: 1/-1; display: flex; justify-content: center; align-items: center; gap: 10px; margin-top: 20px; padding: 20px;">
                <button class="pagination-btn" onclick="displayModelsByCategory2('${category}', ${page - 1})" ${page === 1 ? 'disabled' : ''}
                    style="padding: 10px 20px; border: 2px solid #667eea; background: ${page === 1 ? '#f0f0f0' : 'white'}; color: ${page === 1 ? '#999' : '#667eea'}; border-radius: 8px; cursor: ${page === 1 ? 'not-allowed' : 'pointer'}; font-weight: bold;">
                    ← قبلی
                </button>
                <span style="font-weight: bold; color: #333;">صفحه ${page} از ${totalPages} (${filteredModels.length} مدل)</span>
                <button class="pagination-btn" onclick="displayModelsByCategory2('${category}', ${page + 1})" ${page === totalPages ? 'disabled' : ''}
                    style="padding: 10px 20px; border: 2px solid #667eea; background: ${page === totalPages ? '#f0f0f0' : 'white'}; color: ${page === totalPages ? '#999' : '#667eea'}; border-radius: 8px; cursor: ${page === totalPages ? 'not-allowed' : 'pointer'}; font-weight: bold;">
                    بعدی →
                </button>
            </div>
        `;
        modelsGrid2.innerHTML += paginationHTML;
    }

    // افزودن رویداد کلیک به مدل‌ها
    document.querySelectorAll('#modelsGrid2 .model-card').forEach(card => {
        card.addEventListener('click', () => selectModel2(card.dataset.id));
    });

    // Scroll to model 2 section
    modelsGrid2.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// انتخاب مدل دوم
function selectModel2(modelId) {
    selectedModelId2 = modelId;

    // حذف کلاس active از تمام کارت‌ها
    document.querySelectorAll('#modelsGrid2 .model-card').forEach(card => {
        card.classList.remove('active');
    });

    // افزودن کلاس active به کارت انتخاب شده
    const selectedCard = document.querySelector(`#modelsGrid2 .model-card[data-id="${modelId}"]`);
    if (selectedCard) {
        selectedCard.classList.add('active');
    }

    checkGenerateButton();
}

// تغییر دسته‌بندی
const categorySelectEl = document.getElementById('categorySelect');
if (categorySelectEl) {
    categorySelectEl.addEventListener('change', (e) => {
        currentCategory = e.target.value;
        selectedModelId = null; // پاک کردن انتخاب قبلی
        displayModelsByCategory(currentCategory);
        checkGenerateButton();
    });
}

// تغییر دسته‌بندی مدل دوم
const categorySelect2El = document.getElementById('categorySelect2');
if (categorySelect2El) {
    categorySelect2El.addEventListener('change', (e) => {
        const currentCategory2 = e.target.value;
        selectedModelId2 = null; // پاک کردن انتخاب قبلی
        displayModelsByCategory2(currentCategory2);
        checkGenerateButton();
    });
}

// تغییر تعداد مدل‌ها
const numberOfModelsSelectEl = document.getElementById('numberOfModelsSelect');
if (numberOfModelsSelectEl) {
    numberOfModelsSelectEl.addEventListener('change', (e) => {
        const numModels = parseInt(e.target.value);

    if (numModels === 2) {
        // نمایش بخش‌های مدل دوم
        model2Section.style.display = 'block';
        garmentUploadSection2.style.display = 'block';
        modelSelectorLabel.textContent = 'انتخاب مدل اول:';

        // بارگذاری مدل‌ها برای مدل دوم
        displayModelsByCategory2('woman');
    } else {
        // مخفی کردن بخش‌های مدل دوم
        model2Section.style.display = 'none';
        garmentUploadSection2.style.display = 'none';
        modelSelectorLabel.textContent = 'انتخاب مدل اول:';
        selectedModelId2 = null;
        uploadedGarmentPaths2 = [];
    }

    checkGenerateButton();
    });
}

// بارگذاری پس‌زمینه‌ها
async function loadBackgrounds(mode = 'complete-outfit') {
    const backgroundsGrid = document.getElementById('backgroundsGrid');
    if (!backgroundsGrid) return;

    try {
        // Get auth token from localStorage if user is logged in
        const token = localStorage.getItem('supabase_token');
        const headers = {};
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        // Add mode parameter to fetch appropriate backgrounds
        const response = await fetch(`/api/backgrounds?mode=${mode}`, { headers });
        const backgrounds = await response.json();

        backgroundsGrid.innerHTML = backgrounds.map(bg => `
            <div class="background-card" data-id="${bg.id}">
                ${bg.image ? `
                    <img src="${bg.image}" alt="${bg.name}" class="background-image" loading="lazy">
                ` : `
                    <div class="background-placeholder"></div>
                `}
                <div class="background-overlay">
                    <div class="card-title">${bg.name}</div>
                </div>
            </div>
        `).join('');

        // افزودن رویداد کلیک به پس‌زمینه‌ها
        document.querySelectorAll('.background-card').forEach(card => {
            card.addEventListener('click', () => selectBackground(card.dataset.id));
        });
    } catch (error) {
        console.error('خطا در بارگذاری پس‌زمینه‌ها:', error);
    }
}

// بارگذاری حالت‌های بدن
async function loadPoses() {
    const poseSelect = document.getElementById('poseSelect');
    if (!poseSelect) return;

    try {
        const response = await fetch('/api/poses');
        const poses = await response.json();

        poseSelect.innerHTML = poses.map(pose => `
            <option value="${pose.id}">${pose.name}</option>
        `).join('');

        selectedPoseId = poses[0]?.id || 'standing-front';
    } catch (error) {
        console.error('خطا در بارگذاری حالت‌های بدن:', error);
    }
}

// بارگذاری زاویه‌های دوربین
async function loadCameraAngles() {
    const cameraAngleSelect = document.getElementById('cameraAngleSelect');
    if (!cameraAngleSelect) return;

    try {
        const response = await fetch('/api/camera-angles');
        const angles = await response.json();

        cameraAngleSelect.innerHTML = angles.map(angle => `
            <option value="${angle.id}">${angle.name}</option>
        `).join('');

        selectedCameraAngleId = angles[0]?.id || 'eye-level';
    } catch (error) {
        console.error('خطا در بارگذاری زاویه‌های دوربین:', error);
    }
}

// بارگذاری استایل‌ها
async function loadStyles() {
    const styleSelect = document.getElementById('styleSelect');
    if (!styleSelect) return;

    try {
        const response = await fetch('/api/styles');
        const styles = await response.json();

        styleSelect.innerHTML = styles.map(style => `
            <option value="${style.id}">${style.name}</option>
        `).join('');

        selectedStyleId = styles[0]?.id || 'professional';
    } catch (error) {
        console.error('خطا در بارگذاری استایل‌ها:', error);
    }
}

// بارگذاری نورپردازی‌ها
async function loadLightings() {
    const lightingSelect = document.getElementById('lightingSelect');
    if (!lightingSelect) return;

    try {
        const response = await fetch('/api/lightings');
        const lightings = await response.json();

        lightingSelect.innerHTML = lightings.map(lighting => `
            <option value="${lighting.id}">${lighting.name}</option>
        `).join('');

        selectedLightingId = lightings[0]?.id || 'studio';
    } catch (error) {
        console.error('خطا در بارگذاری نورپردازی‌ها:', error);
    }
}

// بارگذاری نوع فریم (Shot Types)
async function loadShotTypes() {
    const shotTypeSelect = document.getElementById('shotTypeSelect');
    if (!shotTypeSelect) return;

    try {
        const response = await fetch('/api/shot-types');
        const shotTypes = await response.json();

        shotTypeSelect.innerHTML = shotTypes.map(shotType => `
            <option value="${shotType.id}">${shotType.name}</option>
        `).join('');

        selectedShotTypeId = shotTypes[0]?.id || 'full-body';
    } catch (error) {
        console.error('خطا در بارگذاری نوع فریم:', error);
    }
}

// Event listeners برای پارامترهای پیشرفته
const shotTypeSelectEl = document.getElementById('shotTypeSelect');
if (shotTypeSelectEl) {
    shotTypeSelectEl.addEventListener('change', (e) => {
        selectedShotTypeId = e.target.value;
    });
}

const poseSelectEl = document.getElementById('poseSelect');
if (poseSelectEl) {
    poseSelectEl.addEventListener('change', (e) => {
        selectedPoseId = e.target.value;
    });
}

const cameraAngleSelectEl = document.getElementById('cameraAngleSelect');
if (cameraAngleSelectEl) {
    cameraAngleSelectEl.addEventListener('change', (e) => {
        selectedCameraAngleId = e.target.value;
    });
}

const styleSelectEl = document.getElementById('styleSelect');
if (styleSelectEl) {
    styleSelectEl.addEventListener('change', (e) => {
        selectedStyleId = e.target.value;
    });
}

const lightingSelectEl = document.getElementById('lightingSelect');
if (lightingSelectEl) {
    lightingSelectEl.addEventListener('change', (e) => {
        selectedLightingId = e.target.value;
    });
}

// PHASE 1: Event listeners for critical quality parameters
const colorTempSelectEl = document.getElementById('colorTempSelect');
if (colorTempSelectEl) {
    colorTempSelectEl.addEventListener('change', (e) => {
        selectedColorTempId = e.target.value;
    });
}

const dofSelectEl = document.getElementById('dofSelect');
if (dofSelectEl) {
    dofSelectEl.addEventListener('change', (e) => {
        selectedDofId = e.target.value;
    });
}

const fabricSelectEl = document.getElementById('fabricSelect');
if (fabricSelectEl) {
    fabricSelectEl.addEventListener('change', (e) => {
        selectedFabricId = e.target.value;
    });
}

const shadowSelectEl = document.getElementById('shadowSelect');
if (shadowSelectEl) {
    shadowSelectEl.addEventListener('change', (e) => {
        selectedShadowId = e.target.value;
    });
}

// PHASE 2: Event listeners for professional touch
const aspectRatioSelectEl = document.getElementById('aspectRatioSelect');
if (aspectRatioSelectEl) {
    aspectRatioSelectEl.addEventListener('change', (e) => {
        selectedAspectRatioId = e.target.value;
    });
}

const bgBlurSelectEl = document.getElementById('bgBlurSelect');
if (bgBlurSelectEl) {
    bgBlurSelectEl.addEventListener('change', (e) => {
        selectedBgBlurId = e.target.value;
    });
}

const fitSelectEl = document.getElementById('fitSelect');
if (fitSelectEl) {
    fitSelectEl.addEventListener('change', (e) => {
        selectedFitId = e.target.value;
    });
}

// Load functions for new quality parameters
async function loadColorTemperatures() {
    const colorTempSelect = document.getElementById('colorTempSelect');
    if (!colorTempSelect) return;

    try {
        const response = await fetch('/api/color-temperatures');
        const items = await response.json();
        colorTempSelect.innerHTML = items.map(item => `
            <option value="${item.id}">${item.name}</option>
        `).join('');
        selectedColorTempId = items[3]?.id || 'auto';
    } catch (error) {
        console.error('خطا در بارگذاری دمای رنگ:', error);
    }
}

async function loadDepthOfFields() {
    const dofSelect = document.getElementById('dofSelect');
    if (!dofSelect) return;

    try {
        const response = await fetch('/api/depth-of-fields');
        const items = await response.json();
        dofSelect.innerHTML = items.map(item => `
            <option value="${item.id}">${item.name}</option>
        `).join('');
        selectedDofId = items[1]?.id || 'medium';
    } catch (error) {
        console.error('خطا در بارگذاری عمق میدان:', error);
    }
}

async function loadFabricTypes() {
    const fabricSelect = document.getElementById('fabricSelect');
    if (!fabricSelect) return;

    try {
        const response = await fetch('/api/fabric-types');
        const items = await response.json();
        fabricSelect.innerHTML = items.map(item => `
            <option value="${item.id}">${item.name}</option>
        `).join('');
        selectedFabricId = items[7]?.id || 'auto';
    } catch (error) {
        console.error('خطا در بارگذاری نوع پارچه:', error);
    }
}

async function loadShadowQualities() {
    const shadowSelect = document.getElementById('shadowSelect');
    if (!shadowSelect) return;

    try {
        const response = await fetch('/api/shadow-qualities');
        const items = await response.json();
        shadowSelect.innerHTML = items.map(item => `
            <option value="${item.id}">${item.name}</option>
        `).join('');
        selectedShadowId = items[1]?.id || 'medium';
    } catch (error) {
        console.error('خطا در بارگذاری کیفیت سایه:', error);
    }
}

async function loadAspectRatios() {
    const aspectRatioSelect = document.getElementById('aspectRatioSelect');
    if (!aspectRatioSelect) return;

    try {
        const response = await fetch('/api/aspect-ratios');
        const items = await response.json();
        aspectRatioSelect.innerHTML = items.map(item => `
            <option value="${item.id}">${item.name}</option>
        `).join('');
        selectedAspectRatioId = items[0]?.id || '1:1';
    } catch (error) {
        console.error('خطا در بارگذاری نسبت تصویر:', error);
    }
}

async function loadBackgroundBlurs() {
    const bgBlurSelect = document.getElementById('bgBlurSelect');
    if (!bgBlurSelect) return;

    try {
        const response = await fetch('/api/background-blurs');
        const items = await response.json();
        bgBlurSelect.innerHTML = items.map(item => `
            <option value="${item.id}">${item.name}</option>
        `).join('');
        selectedBgBlurId = items[2]?.id || 'medium';
    } catch (error) {
        console.error('خطا در بارگذاری تاری پس‌زمینه:', error);
    }
}

async function loadGarmentFits() {
    const fitSelect = document.getElementById('fitSelect');
    if (!fitSelect) return;

    try {
        const response = await fetch('/api/garment-fits');
        const items = await response.json();
        fitSelect.innerHTML = items.map(item => `
            <option value="${item.id}">${item.name}</option>
        `).join('');
        selectedFitId = items[1]?.id || 'regular';
    } catch (error) {
        console.error('خطا در بارگذاری برازش لباس:', error);
    }
}

// ========================================
// NEW: Accessory Upload Handlers
// ========================================

// Accessory upload area click
if (accessoryUploadArea && accessoryInput) {
    accessoryUploadArea.addEventListener('click', () => accessoryInput.click());
}

// Accessory file input change
if (accessoryInput) {
    accessoryInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (file) {
            await uploadAccessoryFile(file);
        }
    });
}

// Upload accessory product image
async function uploadAccessoryFile(file) {
    const formData = new FormData();
    formData.append('garment', file); // Use same endpoint as garment

    // Show progress modal
    showUploadProgress(`در حال آپلود ${file.name}...`);

    try {
        const data = await uploadFileWithProgress('/api/upload', formData, (percentage) => {
            updateUploadProgress(percentage, `در حال آپلود: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`);
        });

        if (data.success) {
            // Show completion
            updateUploadProgress(100, 'آپلود با موفقیت انجام شد! ✅');

            // Wait a moment to show success
            await new Promise(resolve => setTimeout(resolve, 500));

            uploadedAccessoryPath = data.filePath;

            // Show preview
            accessoryPreview.innerHTML = `
                <div class="garment-preview-item">
                    <img src="${data.filePath}" alt="اکسسوری">
                    <div class="garment-preview-label">محصول اکسسوری</div>
                </div>
            `;
            accessoryUploadPlaceholder.style.display = 'none';
            accessoryPreview.style.display = 'grid';

            checkGenerateButton();
        } else {
            hideUploadProgress();
            console.error('Upload failed:', data);
            const errorMsg = data.details || data.error || 'خطا در آپلود فایل';
            alert(`Error: ${errorMsg}`);
        }
    } catch (error) {
        hideUploadProgress();
        console.error('خطا در آپلود فایل:', error);
        alert('خطا در آپلود فایل. لطفاً یک فایل تصویری معتبر انتخاب کنید.');
    } finally {
        hideUploadProgress();
    }
}

// Accessory type selection
if (accessoryTypeSelect) {
    accessoryTypeSelect.addEventListener('change', (e) => {
        selectedAccessoryType = e.target.value;
        checkGenerateButton();
    });
}


// انتخاب مدل
function selectModel(modelId) {
    selectedModelId = modelId;
    document.querySelectorAll('.model-card').forEach(card => {
        card.classList.toggle('selected', card.dataset.id === modelId);
    });

    // نمایش بخش انتخاب حجاب فقط برای دسته‌های مناسب
    const shouldShowHijab = ['woman', 'girl', 'teen'].includes(currentCategory);
    if (shouldShowHijab) {
        hijabSection.style.display = 'block';
        // ریست کردن انتخاب قبلی حجاب
        selectedHijabType = null;
        document.querySelectorAll('.hijab-option-card').forEach(card => {
            card.classList.remove('selected');
        });
    } else {
        hijabSection.style.display = 'none';
        selectedHijabType = null;
    }

    checkGenerateButton();
}

// ========================================
// NEW: Color Collection Upload Functions
// ========================================

// Setup color collection upload
if (colorCollectionUploadArea && colorCollectionInput) {
    colorCollectionUploadArea.addEventListener('click', () => {
        colorCollectionInput.click();
    });
}

if (colorCollectionInput) {
    colorCollectionInput.addEventListener('change', async (e) => {
        const files = Array.from(e.target.files);
        if (files.length > 0) {
            await uploadColorVariantFiles(files);
        }
    });
}

// Upload multiple color variant images
async function uploadColorVariantFiles(files) {
    // Limit to 10 files
    if (files.length > 10) {
        alert('حداکثر ۱۰ رنگ می‌توانید آپلود کنید');
        files = files.slice(0, 10);
    }

    uploadedColorVariants = [];
    showUploadProgress(`در حال آپلود ${files.length} فایل...`);

    try {
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const formData = new FormData();
            formData.append('garment', file);

            updateUploadProgress((i / files.length) * 100, `آپلود فایل ${i + 1} از ${files.length}: ${file.name}`);

            try {
                const data = await uploadFileWithProgress('/api/upload', formData, (percentage) => {
                    const overallProgress = ((i + (percentage / 100)) / files.length) * 100;
                    updateUploadProgress(overallProgress, `فایل ${i + 1}/${files.length}: ${file.name} (${Math.round(percentage)}%)`);
                });

                if (data.success) {
                    uploadedColorVariants.push(data.filePath);
                }
            } catch (error) {
                console.error('خطا در آپلود تصویر:', error);
            }
        }

        updateUploadProgress(100, 'تمام فایل‌ها با موفقیت آپلود شدند! ✅');
        await new Promise(resolve => setTimeout(resolve, 500));

        // Show previews
        colorCollectionPreviews.style.display = 'grid';
        colorCollectionPlaceholder.style.display = 'none';

        colorCollectionPreviews.innerHTML = uploadedColorVariants.map((path, index) => `
            <div class="garment-preview-item">
                <img src="${path}" alt="رنگ ${index + 1}">
                <button class="remove-garment-btn" onclick="removeColorVariant(${index})">&times;</button>
                <div class="garment-preview-label">رنگ ${index + 1}</div>
            </div>
        `).join('');

        checkGenerateButton();
    } finally {
        hideUploadProgress();
    }
}

// Remove a color variant
function removeColorVariant(index) {
    uploadedColorVariants.splice(index, 1);

    if (uploadedColorVariants.length === 0) {
        colorCollectionPreviews.style.display = 'none';
        colorCollectionPlaceholder.style.display = 'flex';
    } else {
        colorCollectionPreviews.innerHTML = uploadedColorVariants.map((path, idx) => `
            <div class="garment-preview-item">
                <img src="${path}" alt="رنگ ${idx + 1}">
                <button class="remove-garment-btn" onclick="removeColorVariant(${idx})">&times;</button>
                <div class="garment-preview-label">رنگ ${idx + 1}</div>
            </div>
        `).join('');
    }

    checkGenerateButton();
}

// Select display scenario
function selectDisplayScenario(scenario) {
    selectedDisplayScenario = scenario;
    document.querySelectorAll('.scenario-card').forEach(card => {
        card.classList.toggle('selected', card.dataset.scenario === scenario);
    });
    checkGenerateButton();
}

// ========================================
// NEW: Flat Lay Upload Functions
// ========================================

// Setup flat lay upload
if (flatLayUploadArea && flatLayInput) {
    flatLayUploadArea.addEventListener('click', () => {
        flatLayInput.click();
    });
}

if (flatLayInput) {
    flatLayInput.addEventListener('change', async (e) => {
        const files = Array.from(e.target.files);
        if (files.length > 0) {
            await uploadFlatLayFiles(files);
        }
    });
}

// Upload multiple flat lay product images
async function uploadFlatLayFiles(files) {
    // Limit to 6 files
    if (files.length > 6) {
        alert('حداکثر ۶ محصول می‌توانید آپلود کنید');
        files = files.slice(0, 6);
    }

    uploadedFlatLayProducts = [];
    showUploadProgress(`در حال آپلود ${files.length} فایل...`);

    try {
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const formData = new FormData();
            formData.append('garment', file);

            try {
                const data = await uploadFileWithProgress('/api/upload', formData, (percentage) => {
                    const overallProgress = ((i + (percentage / 100)) / files.length) * 100;
                    updateUploadProgress(overallProgress, `فایل ${i + 1}/${files.length}: ${file.name} (${Math.round(percentage)}%)`);
                });

                if (data.success) {
                    uploadedFlatLayProducts.push(data.filePath);
                }
            } catch (error) {
                console.error('خطا در آپلود تصویر:', error);
            }
        }

        updateUploadProgress(100, 'تمام فایل‌ها با موفقیت آپلود شدند! ✅');
        await new Promise(resolve => setTimeout(resolve, 500));

        // Show previews
        flatLayPreviews.style.display = 'grid';
        flatLayPlaceholder.style.display = 'none';

        flatLayPreviews.innerHTML = uploadedFlatLayProducts.map((path, index) => `
            <div class="garment-preview-item">
                <img src="${path}" alt="محصول ${index + 1}">
                <button class="remove-garment-btn" onclick="removeFlatLayProduct(${index})">&times;</button>
                <div class="garment-preview-label">محصول ${index + 1}</div>
            </div>
        `).join('');

        checkGenerateButton();
    } finally {
        hideUploadProgress();
    }
}

// Remove a flat lay product
function removeFlatLayProduct(index) {
    uploadedFlatLayProducts.splice(index, 1);

    if (uploadedFlatLayProducts.length === 0) {
        flatLayPreviews.style.display = 'none';
        flatLayPlaceholder.style.display = 'flex';
    } else {
        flatLayPreviews.innerHTML = uploadedFlatLayProducts.map((path, idx) => `
            <div class="garment-preview-item">
                <img src="${path}" alt="محصول ${idx + 1}">
                <button class="remove-garment-btn" onclick="removeFlatLayProduct(${idx})">&times;</button>
                <div class="garment-preview-label">محصول ${idx + 1}</div>
            </div>
        `).join('');
    }

    checkGenerateButton();
}

// Select flat lay arrangement
function selectArrangement(arrangement) {
    selectedArrangement = arrangement;
    document.querySelectorAll('[data-arrangement]').forEach(card => {
        card.classList.toggle('selected', card.dataset.arrangement === arrangement);
    });
    checkGenerateButton();
}

// ========================================
// Scene Recreation Functions
// ========================================

// Upload reference photo
async function uploadReferencePhoto(file) {
    const formData = new FormData();
    formData.append('referencePhoto', file);

    try {
        const response = await fetch('/api/upload-reference', {
            method: 'POST',
            body: formData
        });

        const data = await response.json();

        if (data.success) {
            uploadedReferencePhoto = data.filePath;

            // Show preview
            referencePhotoImg.src = data.filePath;
            referencePhotoPlaceholder.style.display = 'none';
            referencePhotoPreview.style.display = 'block';

            // Analyze the photo
            await analyzeReferencePhoto(data.filePath);

            checkGenerateButton();
        } else {
            alert('خطا در آپلود عکس: ' + data.error);
        }
    } catch (error) {
        console.error('Error uploading reference photo:', error);
        alert('خطا در آپلود عکس مرجع');
    }
}

// Analyze reference photo with Gemini
async function analyzeReferencePhoto(photoPath) {
    try {
        const sceneAnalysisSection = document.getElementById('sceneAnalysisSection');
        if (sceneAnalysisSection) {
            sceneAnalysisSection.style.display = 'block';
        }

        const response = await fetch('/api/analyze-scene', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ photoPath })
        });

        const data = await response.json();

        if (data.success) {
            sceneAnalysis = data.analysis;
            referencePhotoPeopleCount = data.numberOfPeople || 1;

            // Just log the analysis, don't show it to user
            console.log('📋 Scene Analysis:', data.analysis);
            console.log(`✅ Person count detected: ${referencePhotoPeopleCount}`);

            // Show Model 2 section if 2+ people detected
            if (referencePhotoPeopleCount >= 2) {
                model2Section.style.display = 'block';
                garmentUploadSection2.style.display = 'block';
                modelSelectorLabel.textContent = 'انتخاب مدل اول:';

                // Load models for model 2
                displayModelsByCategory2('woman');

                console.log('👥 Showing Model 2 section because reference has multiple people');
            } else {
                model2Section.style.display = 'none';
                garmentUploadSection2.style.display = 'none';
                modelSelectorLabel.textContent = 'انتخاب مدل اول:';
                selectedModelId2 = null;
                uploadedGarmentPaths2 = [];
            }
        } else {
            sceneAnalysisText.innerHTML = '<p style="color: red;">❌ خطا در تحلیل عکس</p>';
            alert('خطا در تحلیل عکس: ' + data.error);
        }
    } catch (error) {
        console.error('Error analyzing scene:', error);
        sceneAnalysisText.innerHTML = '<p style="color: red;">❌ خطا در تحلیل عکس</p>';
    }
}

// Remove reference photo
function removeReferencePhoto() {
    uploadedReferencePhoto = null;
    sceneAnalysis = null;
    referencePhotoPlaceholder.style.display = 'flex';
    referencePhotoPreview.style.display = 'none';
    sceneAnalysisSection.style.display = 'none';
    referencePhotoInput.value = '';
    checkGenerateButton();
}

// ========================================
// Style Transfer Functions
// ========================================

// Upload multiple style images (1-3)
async function uploadStyleImages(files) {
    // Limit to 3 files
    if (files.length > 3) {
        alert('حداکثر ۳ عکس استایل می‌توانید آپلود کنید');
        files = Array.from(files).slice(0, 3);
    }

    uploadedStyleImages = [];

    for (const file of files) {
        const formData = new FormData();
        formData.append('styleImage', file);

        try {
            const response = await fetch('/api/upload-style', {
                method: 'POST',
                body: formData
            });

            const data = await response.json();

            if (data.success) {
                uploadedStyleImages.push(data.filePath);
            }
        } catch (error) {
            console.error('خطا در آپلود عکس استایل:', error);
        }
    }

    // Show previews
    const styleImagesPreviews = document.getElementById('styleImagesPreviews');
    const styleImagesPlaceholder = document.getElementById('styleImagesPlaceholder');

    styleImagesPreviews.style.display = 'grid';
    styleImagesPlaceholder.style.display = 'none';

    styleImagesPreviews.innerHTML = uploadedStyleImages.map((path, index) => `
        <div class="garment-preview-item">
            <img src="${path}" alt="عکس استایل ${index + 1}">
            <button class="remove-garment-btn" onclick="removeStyleImage(${index})">&times;</button>
            <div class="garment-preview-label">استایل ${index + 1}</div>
        </div>
    `).join('');

    checkGenerateButton();
}

// Remove a style image
function removeStyleImage(index) {
    uploadedStyleImages.splice(index, 1);
    const styleImagesPreviews = document.getElementById('styleImagesPreviews');
    const styleImagesPlaceholder = document.getElementById('styleImagesPlaceholder');

    if (uploadedStyleImages.length === 0) {
        styleImagesPreviews.style.display = 'none';
        styleImagesPlaceholder.style.display = 'flex';
    } else {
        styleImagesPreviews.innerHTML = uploadedStyleImages.map((path, idx) => `
            <div class="garment-preview-item">
                <img src="${path}" alt="عکس استایل ${idx + 1}">
                <button class="remove-garment-btn" onclick="removeStyleImage(${idx})">&times;</button>
                <div class="garment-preview-label">استایل ${idx + 1}</div>
            </div>
        `).join('');
    }

    checkGenerateButton();
}

// Upload content image
async function uploadContentImage(file) {
    const formData = new FormData();
    formData.append('contentImage', file);

    try {
        const response = await fetch('/api/upload-content', {
            method: 'POST',
            body: formData
        });

        const data = await response.json();

        if (data.success) {
            uploadedContentImage = data.filePath;

            // Show preview
            const contentImagePreview = document.getElementById('contentImagePreview');
            const contentImageImg = document.getElementById('contentImageImg');
            const contentImagePlaceholder = document.getElementById('contentImagePlaceholder');

            contentImageImg.src = data.filePath;
            contentImagePreview.style.display = 'block';
            contentImagePlaceholder.style.display = 'none';

            // Show analysis loading indicator
            const analysisStatus = document.getElementById('contentImageAnalysisStatus');
            if (analysisStatus) {
                analysisStatus.style.display = 'block';
            }

            // Analyze content image for lighting/mood/atmosphere
            console.log('🔍 در حال تحلیل عکس محتوا...');
            await analyzeContentImage(data.filePath);

            // Hide analysis loading indicator
            if (analysisStatus) {
                analysisStatus.style.display = 'none';
            }

            checkGenerateButton();
        }
    } catch (error) {
        console.error('خطا در آپلود عکس محتوا:', error);
    }
}

// Analyze content image (similar to reference photo analysis)
async function analyzeContentImage(photoPath) {
    try {
        const response = await fetch('/api/analyze-scene', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ photoPath })
        });

        const data = await response.json();

        if (data.success) {
            contentImageAnalysis = data.analysis;
            console.log('✅ تحلیل عکس محتوا کامل شد');
            console.log('📊 Analysis:', data.analysis);

            // Show success message and keep it visible
            const analysisStatus = document.getElementById('contentImageAnalysisStatus');
            if (analysisStatus) {
                analysisStatus.innerHTML = `
                    <div style="display: flex; align-items: center; gap: 10px; flex-direction: column;">
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <span style="font-size: 24px;">✅</span>
                            <span style="color: #155724; font-weight: 600; font-size: 16px;">تحلیل کامل شد!</span>
                        </div>
                        <span style="color: #155724; font-weight: 500; font-size: 14px;">✨ حالا می‌توانید عکس را تولید کنید</span>
                    </div>
                `;
                analysisStatus.style.background = '#d4edda';
                analysisStatus.style.borderColor = '#28a745';
                analysisStatus.style.display = 'block';

                // Keep it visible - don't hide automatically
            }
        } else {
            console.error('خطا در تحلیل:', data.error);
        }
    } catch (error) {
        console.error('خطا در تحلیل عکس محتوا:', error);
    }
}

// Remove content image
function removeContentImage() {
    uploadedContentImage = null;
    contentImageAnalysis = null; // Clear analysis
    const contentImagePreview = document.getElementById('contentImagePreview');
    const contentImagePlaceholder = document.getElementById('contentImagePlaceholder');
    const contentImageInput = document.getElementById('contentImageInput');

    contentImagePreview.style.display = 'none';
    contentImagePlaceholder.style.display = 'flex';
    contentImageInput.value = '';
    checkGenerateButton();
}

// ========================================
// NEW: Mode Switching Functions
// ========================================

function switchMode(mode) {
    currentMode = mode;

    // Update active mode card
    modeCards.forEach(card => {
        card.classList.toggle('active', card.dataset.mode === mode);
    });

    // Show/hide sections based on mode
    if (mode === 'complete-outfit') {
        // Complete outfit mode: show garment upload, model selection, hijab
        garmentUploadSection.style.display = 'block';
        accessoryUploadSection.style.display = 'none';
        colorCollectionUploadSection.style.display = 'none';
        displayScenarioSection.style.display = 'none';
        flatLayUploadSection.style.display = 'none';
        flatLayArrangementSection.style.display = 'none';
        sceneRecreationSection.style.display = 'none';
        if (modelSection) modelSection.style.display = 'block';
        if (backgroundSection) backgroundSection.style.display = 'block';
        // Show category selector for complete outfit
        const categorySelector = document.querySelector('.category-selector');
        if (categorySelector) categorySelector.style.display = 'block';

        // Restore original upload section text
        document.querySelector('#garmentUploadSection h2').textContent = '۱. آپلود تصویر لباس';

        // Show/hide model 2 sections based on numberOfModelsSelect
        const numModels = parseInt(numberOfModelsSelect.value);
        if (numModels === 2) {
            model2Section.style.display = 'block';
            garmentUploadSection2.style.display = 'block';
        } else {
            model2Section.style.display = 'none';
            garmentUploadSection2.style.display = 'none';
        }

    } else if (mode === 'accessories-only') {
        // Accessories mode: upload accessory product photo, select hand/arm model
        if (garmentUploadSection) garmentUploadSection.style.display = 'none';
        if (accessoryUploadSection) accessoryUploadSection.style.display = 'block';
        if (colorCollectionUploadSection) colorCollectionUploadSection.style.display = 'none';
        if (displayScenarioSection) displayScenarioSection.style.display = 'none';
        if (flatLayUploadSection) flatLayUploadSection.style.display = 'none';
        if (flatLayArrangementSection) flatLayArrangementSection.style.display = 'none';
        if (sceneRecreationSection) sceneRecreationSection.style.display = 'none';
        if (model2Section) model2Section.style.display = 'none'; // Hide model 2 in accessories mode
        if (garmentUploadSection2) garmentUploadSection2.style.display = 'none'; // Hide garment 2 upload
        if (modelSection) modelSection.style.display = 'block';
        if (backgroundSection) backgroundSection.style.display = 'block';
        if (hijabSection) hijabSection.style.display = 'none'; // Hide hijab section in accessories mode
        // Hide category selector - only show hand models
        const categorySelector = document.querySelector('.category-selector');
        if (categorySelector) categorySelector.style.display = 'none';

    } else if (mode === 'color-collection') {
        // Color Collection mode: upload multiple color variants and select display scenario
        garmentUploadSection.style.display = 'none';
        model2Section.style.display = 'none';
        garmentUploadSection2.style.display = 'none';
        accessoryUploadSection.style.display = 'none';
        colorCollectionUploadSection.style.display = 'block';
        displayScenarioSection.style.display = 'block';
        flatLayUploadSection.style.display = 'none';
        flatLayArrangementSection.style.display = 'none';
        sceneRecreationSection.style.display = 'none';
        if (modelSection) modelSection.style.display = 'none'; // No model needed
        if (backgroundSection) backgroundSection.style.display = 'block';
        hijabSection.style.display = 'none'; // Hide hijab section

    } else if (mode === 'flat-lay') {
        // Flat Lay mode: upload products and select arrangement
        garmentUploadSection.style.display = 'none';
        accessoryUploadSection.style.display = 'none';
        colorCollectionUploadSection.style.display = 'none';
        displayScenarioSection.style.display = 'none';
        flatLayUploadSection.style.display = 'block';
        flatLayArrangementSection.style.display = 'block';
        sceneRecreationSection.style.display = 'none';
        model2Section.style.display = 'none';
        garmentUploadSection2.style.display = 'none';
        if (modelSection) modelSection.style.display = 'none'; // No model needed
        if (backgroundSection) backgroundSection.style.display = 'block';
        hijabSection.style.display = 'none'; // Hide hijab section

    } else if (mode === 'scene-recreation') {
        // Scene Recreation mode: upload reference photo, analyze, then select model+garment
        garmentUploadSection.style.display = 'block'; // Still need to upload garment
        accessoryUploadSection.style.display = 'none';
        colorCollectionUploadSection.style.display = 'none';
        displayScenarioSection.style.display = 'none';
        flatLayUploadSection.style.display = 'none';
        flatLayArrangementSection.style.display = 'none';
        sceneRecreationSection.style.display = 'block';
        styleTransferSection.style.display = 'none';
        model2Section.style.display = 'none';
        garmentUploadSection2.style.display = 'none';
        if (modelSection) modelSection.style.display = 'block'; // Need model
        if (backgroundSection) backgroundSection.style.display = 'none'; // Background from reference photo
        hijabSection.style.display = 'block'; // May need hijab
        const categorySelector = document.querySelector('.category-selector');
        if (categorySelector) categorySelector.style.display = 'block';
    } else if (mode === 'style-transfer') {
        // Style Transfer mode: upload style images + content image, apply lighting/mood only
        garmentUploadSection.style.display = 'none';
        accessoryUploadSection.style.display = 'none';
        colorCollectionUploadSection.style.display = 'none';
        displayScenarioSection.style.display = 'none';
        flatLayUploadSection.style.display = 'none';
        flatLayArrangementSection.style.display = 'none';
        sceneRecreationSection.style.display = 'none';
        styleTransferSection.style.display = 'block';
        model2Section.style.display = 'none';
        garmentUploadSection2.style.display = 'none';
        if (modelSection) modelSection.style.display = 'none'; // No model selection needed
        if (backgroundSection) backgroundSection.style.display = 'none'; // No background needed
        hijabSection.style.display = 'none'; // No hijab needed
    }

    // Reset selections when switching modes
    uploadedAccessoryPath = null;
    selectedAccessoryType = null;
    uploadedColorVariants = [];
    selectedDisplayScenario = null;
    uploadedFlatLayProducts = [];
    selectedArrangement = null;
    uploadedReferencePhoto = null;
    sceneAnalysis = null;
    if (mode !== 'complete-outfit' && mode !== 'scene-recreation') {
        selectedHijabType = null;
    }

    // Reload backgrounds with mode-specific list
    loadBackgrounds(mode);

    // Reload models and set appropriate category
    if (mode === 'accessories-only') {
        // Set category to 'accessory' BEFORE loading models
        currentCategory = 'accessory';
        loadModels(mode); // This will call displayModelsByCategory(currentCategory) which is now 'accessory'
        // Reset model selection
        selectedModelId = null;
        document.querySelectorAll('.model-card').forEach(card => {
            card.classList.remove('selected');
        });
    } else if (mode === 'complete-outfit') {
        loadModels(mode);
        // Reset model selection
        selectedModelId = null;
        document.querySelectorAll('.model-card').forEach(card => {
            card.classList.remove('selected');
        });
        // Reset to default category
        currentCategory = 'woman';
    }

    // Reset background selection
    selectedBackgroundId = null;
    document.querySelectorAll('.background-card').forEach(card => {
        card.classList.remove('selected');
    });

    checkGenerateButton();
}

// انتخاب نوع حجاب
function selectHijabType(hijabType) {
    selectedHijabType = hijabType;
    document.querySelectorAll('.hijab-option-card').forEach(card => {
        card.classList.toggle('selected', card.dataset.hijabType === hijabType);
    });
    checkGenerateButton();
}

// انتخاب پس‌زمینه
function selectBackground(backgroundId) {
    selectedBackgroundId = backgroundId;
    document.querySelectorAll('.background-card').forEach(card => {
        card.classList.toggle('selected', card.dataset.id === backgroundId);
    });
    checkGenerateButton();
}

// بررسی فعال بودن دکمه تولید
function checkGenerateButton() {
    let isValid = false;

    if (currentMode === 'complete-outfit') {
        // Complete outfit: need garment, model, background, and hijab (if applicable)
        const shouldShowHijab = ['woman', 'girl', 'teen'].includes(currentCategory);
        const hijabCondition = !shouldShowHijab || selectedHijabType !== null;

        const numModels = parseInt(numberOfModelsSelect.value);

        if (numModels === 2) {
            // For 2 models: need both models and both garments
            isValid = uploadedGarmentPaths.length > 0 &&
                      uploadedGarmentPaths2.length > 0 &&
                      selectedModelId &&
                      selectedModelId2 &&
                      selectedBackgroundId &&
                      hijabCondition;
        } else {
            // For 1 model: original logic
            isValid = uploadedGarmentPaths.length > 0 &&
                      selectedModelId &&
                      selectedBackgroundId &&
                      hijabCondition;
        }

    } else if (currentMode === 'accessories-only') {
        // Accessories mode: need accessory product photo, accessory type, model, and background
        isValid = uploadedAccessoryPath !== null &&
                  selectedAccessoryType !== null &&
                  selectedModelId &&
                  selectedBackgroundId;

    } else if (currentMode === 'color-collection') {
        // Color Collection mode: need at least 1 color variant, display scenario, and background
        isValid = uploadedColorVariants.length >= 1 &&
                  selectedDisplayScenario !== null &&
                  selectedBackgroundId;

    } else if (currentMode === 'flat-lay') {
        // Flat Lay mode: need at least 1 product, arrangement, and background
        isValid = uploadedFlatLayProducts.length >= 1 &&
                  selectedArrangement !== null &&
                  selectedBackgroundId;

    } else if (currentMode === 'scene-recreation') {
        // Scene Recreation mode: need reference photo, scene analysis, garment, model, and hijab
        const shouldShowHijab = ['woman', 'girl', 'teen'].includes(currentCategory);
        const hijabCondition = !shouldShowHijab || selectedHijabType !== null;

        // If 2+ people detected, require model 2 as well
        if (referencePhotoPeopleCount >= 2) {
            isValid = uploadedReferencePhoto !== null &&
                      sceneAnalysis !== null &&
                      uploadedGarmentPaths.length > 0 &&
                      uploadedGarmentPaths2.length > 0 &&
                      selectedModelId &&
                      selectedModelId2 &&
                      hijabCondition;
        } else {
            isValid = uploadedReferencePhoto !== null &&
                      sceneAnalysis !== null &&
                      uploadedGarmentPaths.length > 0 &&
                      selectedModelId &&
                      hijabCondition;
        }

    } else if (currentMode === 'style-transfer') {
        // Style Transfer mode: need at least 1 style image and 1 content image
        isValid = uploadedStyleImages.length >= 1 &&
                  uploadedContentImage !== null;
    }

    generateBtn.disabled = !isValid;
}

// رویدادهای آپلود فایل
if (uploadArea && garmentInput) {
    uploadArea.addEventListener('click', () => garmentInput.click());
}

if (uploadArea) {
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.style.borderColor = '#764ba2';
    });

    uploadArea.addEventListener('dragleave', () => {
        uploadArea.style.borderColor = '#667eea';
    });

    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.style.borderColor = '#667eea';
        const files = Array.from(e.dataTransfer.files).filter(file => file.type.startsWith('image/'));
        if (files.length > 0) {
            uploadFiles(files);
        }
    });
}

if (garmentInput) {
    garmentInput.addEventListener('change', (e) => {
        const files = Array.from(e.target.files);
        if (files.length > 0) {
            uploadFiles(files);
        }
    });
}

// آپلود چند فایل
async function uploadFiles(files) {
    console.log('🚀 uploadFiles called with', files.length, 'files');
    showUploadProgress(`در حال آپلود ${files.length} فایل...`);

    try {
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const formData = new FormData();
            formData.append('garment', file);

            try {
                const data = await uploadFileWithProgress('/api/upload', formData, (percentage) => {
                    const overallProgress = ((i + (percentage / 100)) / files.length) * 100;
                    updateUploadProgress(overallProgress, `فایل ${i + 1}/${files.length}: ${file.name} (${Math.round(percentage)}%)`);
                });

                if (data.success) {
                    // Add to uploadedGarmentPaths array
                    uploadedGarmentPaths.push(data.filePath);

                    // Add preview thumbnail
                    addGarmentPreview(data.filePath, uploadedGarmentPaths.length - 1);

                    // Hide placeholder and show preview grid
                    uploadPlaceholder.style.display = 'none';
                    garmentPreviews.style.display = 'grid';

                    checkGenerateButton();
                } else {
                    // Show detailed error message
                    console.error('Upload failed:', data);
                    const errorMsg = data.details || data.error || 'خطا در آپلود فایل';
                    const hintMsg = data.hint ? `\n\nHint: ${data.hint}` : '';
                    alert(`Error: ${errorMsg}${hintMsg}`);
                }
            } catch (error) {
                console.error('خطا در آپلود فایل:', error);
                alert('خطا در آپلود فایل. لطفاً یک فایل تصویری معتبر (JPG, PNG, WEBP, AVIF) انتخاب کنید.');
            }
        }

        updateUploadProgress(100, 'تمام فایل‌ها با موفقیت آپلود شدند! ✅');
        await new Promise(resolve => setTimeout(resolve, 500));
    } finally {
        hideUploadProgress();
    }
}

// افزودن پیش‌نمایش لباس
function addGarmentPreview(filePath, index) {
    const previewItem = document.createElement('div');
    previewItem.className = 'garment-preview-item';
    previewItem.dataset.index = index;

    previewItem.innerHTML = `
        <img src="${filePath}" alt="لباس ${index + 1}">
        <button class="garment-preview-remove" onclick="removeGarment(${index})" title="حذف">×</button>
        <div class="garment-preview-label">لباس ${index + 1}</div>
    `;

    garmentPreviews.appendChild(previewItem);
}

// ================== GARMENT 2 HANDLERS ==================

// کلیک روی ناحیه آپلود مدل 2
if (garmentUploadArea2 && garmentInput2) {
    garmentUploadArea2.addEventListener('click', () => {
        garmentInput2.click();
    });
}

// تغییر فایل آپلود مدل 2
if (garmentInput2) {
    garmentInput2.addEventListener('change', (e) => {
        const files = Array.from(e.target.files);
        if (files.length > 0) {
            uploadFiles2(files);
        }
    });
}

// آپلود چند فایل برای مدل 2
async function uploadFiles2(files) {
    for (const file of files) {
        const formData = new FormData();
        formData.append('garment', file);

        try {
            const response = await fetch('/api/upload', {
                method: 'POST',
                body: formData
            });

            const data = await response.json();

            if (data.success) {
                // Add to uploadedGarmentPaths2 array
                uploadedGarmentPaths2.push(data.filePath);

                // Add preview thumbnail
                addGarmentPreview2(data.filePath, uploadedGarmentPaths2.length - 1);

                // Hide placeholder and show preview grid
                const uploadPlaceholder2 = garmentUploadArea2.querySelector('.upload-placeholder');
                uploadPlaceholder2.style.display = 'none';
                garmentPreviews2.style.display = 'grid';

                checkGenerateButton();
            } else {
                console.error('Upload failed:', data);
                const errorMsg = data.details || data.error || 'خطا در آپلود فایل';
                const hintMsg = data.hint ? `\n\nHint: ${data.hint}` : '';
                alert(`Error: ${errorMsg}${hintMsg}`);
            }
        } catch (error) {
            console.error('خطا در آپلود فایل:', error);
            alert('خطا در آپلود فایل. لطفاً یک فایل تصویری معتبر (JPG, PNG, WEBP, AVIF) انتخاب کنید.');
        }
    }
}

// افزودن پیش‌نمایش لباس مدل 2
function addGarmentPreview2(filePath, index) {
    const previewItem = document.createElement('div');
    previewItem.className = 'garment-preview-item';
    previewItem.dataset.index = index;

    previewItem.innerHTML = `
        <img src="${filePath}" alt="لباس ${index + 1}">
        <button class="garment-preview-remove" onclick="removeGarment2(${index})" title="حذف">×</button>
        <div class="garment-preview-label">لباس مدل ۲ - ${index + 1}</div>
    `;

    garmentPreviews2.appendChild(previewItem);
}

// حذف لباس مدل 2
function removeGarment2(index) {
    // حذف از آرایه
    uploadedGarmentPaths2.splice(index, 1);

    // پاک کردن پیش‌نمایش‌ها و ایجاد مجدد
    garmentPreviews2.innerHTML = '';

    if (uploadedGarmentPaths2.length === 0) {
        const uploadPlaceholder2 = garmentUploadArea2.querySelector('.upload-placeholder');
        uploadPlaceholder2.style.display = 'flex';
        garmentPreviews2.style.display = 'none';
    } else {
        uploadedGarmentPaths2.forEach((path, idx) => {
            addGarmentPreview2(path, idx);
        });
    }

    checkGenerateButton();
}

// ================== END GARMENT 2 HANDLERS ==================

// حذف لباس
function removeGarment(index) {
    // Remove from array
    uploadedGarmentPaths.splice(index, 1);

    // Rebuild preview grid
    garmentPreviews.innerHTML = '';
    uploadedGarmentPaths.forEach((path, idx) => {
        addGarmentPreview(path, idx);
    });

    // If no garments left, show placeholder
    if (uploadedGarmentPaths.length === 0) {
        garmentPreviews.style.display = 'none';
        uploadPlaceholder.style.display = 'block';
    }

    checkGenerateButton();
}

// تولید تصویر
if (generateBtn) {
    generateBtn.addEventListener('click', async () => {
        loadingOverlay.style.display = 'flex';
        resultSection.style.display = 'none';

    try {
        // Build request body based on current mode
        let requestBody = {
            mode: currentMode, // NEW: Send current mode to API
            shotTypeId: selectedShotTypeId,
            poseId: selectedPoseId,
            cameraAngleId: selectedCameraAngleId,
            styleId: selectedStyleId,
            lightingId: selectedLightingId,
            // Professional Quality Parameters
            colorTemperatureId: selectedColorTempId,
            depthOfFieldId: selectedDofId,
            fabricTypeId: selectedFabricId,
            shadowQualityId: selectedShadowId,
            aspectRatioId: selectedAspectRatioId,
            backgroundBlurId: selectedBgBlurId,
            garmentFitId: selectedFitId
        };

        if (currentMode === 'complete-outfit') {
            // Complete outfit mode
            requestBody.garmentPaths = uploadedGarmentPaths;
            requestBody.modelId = selectedModelId;
            requestBody.backgroundId = selectedBackgroundId;
            requestBody.customLocation = document.getElementById('customLocation')?.value || '';
            requestBody.hijabType = selectedHijabType;

            // Check if 2 models mode
            const numModels = parseInt(numberOfModelsSelect.value);
            if (numModels === 2) {
                requestBody.modelId2 = selectedModelId2;
                requestBody.garmentPaths2 = uploadedGarmentPaths2;
            }

        } else if (currentMode === 'accessories-only') {
            // Accessories mode - accessory product photography
            requestBody.accessoryPath = uploadedAccessoryPath;
            requestBody.accessoryType = selectedAccessoryType;
            requestBody.modelId = selectedModelId;
            requestBody.backgroundId = selectedBackgroundId;
            requestBody.customLocation = document.getElementById('customLocation')?.value || '';

        } else if (currentMode === 'color-collection') {
            // Color Collection mode - multiple color variants display
            requestBody.colorVariants = uploadedColorVariants;
            requestBody.displayScenario = selectedDisplayScenario;
            requestBody.backgroundId = selectedBackgroundId;
            requestBody.customLocation = document.getElementById('customLocation')?.value || '';

        } else if (currentMode === 'flat-lay') {
            // Flat Lay mode - overhead product photography
            requestBody.flatLayProducts = uploadedFlatLayProducts;
            requestBody.arrangement = selectedArrangement;
            requestBody.backgroundId = selectedBackgroundId;
            requestBody.customLocation = document.getElementById('customLocation')?.value || '';

        } else if (currentMode === 'scene-recreation') {
            // Scene Recreation mode - recreate scene from reference photo
            requestBody.referencePhotoPath = uploadedReferencePhoto;
            requestBody.sceneAnalysis = sceneAnalysis;
            requestBody.garmentPaths = uploadedGarmentPaths;
            requestBody.modelId = selectedModelId;
            requestBody.hijabType = selectedHijabType;
            requestBody.referencePhotoPeopleCount = referencePhotoPeopleCount; // Send detected person count

            // If 2+ people detected, send model 2 and garments 2
            if (referencePhotoPeopleCount >= 2) {
                requestBody.modelId2 = selectedModelId2;
                requestBody.garmentPaths2 = uploadedGarmentPaths2;
            }

        } else if (currentMode === 'style-transfer') {
            // Style Transfer mode - apply lighting/mood from style images to content image
            requestBody.styleImagePaths = uploadedStyleImages;
            requestBody.contentImagePath = uploadedContentImage;
            requestBody.contentImageAnalysis = contentImageAnalysis; // AI analysis of content image lighting/mood
        }

        console.log('🚀 Sending request:', requestBody);

        const token = localStorage.getItem('supabase_token');
        const response = await fetch('/api/generate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(requestBody)
        });

        const data = await response.json();
        console.log('📥 Response:', data);

        if (data.success) {
            // ذخیره در localStorage برای گالری
            saveToLocalStorage(data);

            // نمایش تصویر تولید شده
            resultImage.src = data.imagePath;
            resultInfo.innerHTML = `
                <p><strong>مدل:</strong> ${data.model}</p>
                <p><strong>پس‌زمینه:</strong> ${data.background}</p>
                <p><strong>✅ وضعیت:</strong> ${data.message}</p>
                ${data.description ? `<p style="margin-top: 10px; color: #666; font-size: 0.9rem;">${data.description}</p>` : ''}
            `;
            resultSection.style.display = 'block';
            resultSection.scrollIntoView({ behavior: 'smooth' });
        } else {
            // Show error message
            alert(`خطا: ${data.error}\n${data.details || ''}`);
        }
    } catch (error) {
        console.error('خطا در تولید تصویر:', error);
        alert('خطا در تولید تصویر. لطفاً دوباره تلاش کنید.');
    } finally {
        loadingOverlay.style.display = 'none';
    }
    });
}

// دانلود تصویر
if (downloadBtn) {
    downloadBtn.addEventListener('click', () => {
        const link = document.createElement('a');
        link.href = resultImage.src;
        link.download = 'fashion-ai-result.jpg';
        link.click();
    });
}

// ذخیره تصویر در localStorage
function saveToLocalStorage(imageData) {
    try {
        // دریافت تصاویر قبلی
        const savedImages = JSON.parse(localStorage.getItem('generatedImages') || '[]');

        // اضافه کردن تصویر جدید
        const newImage = {
            id: Date.now(),
            imagePath: imageData.imagePath,
            model: imageData.model,
            background: imageData.background,
            description: imageData.description || '',
            modelId: selectedModelId,
            backgroundId: selectedBackgroundId,
            shotTypeId: selectedShotTypeId,
            poseId: selectedPoseId,
            cameraAngleId: selectedCameraAngleId,
            styleId: selectedStyleId,
            lightingId: selectedLightingId,
            created_at: new Date().toISOString()
        };

        savedImages.unshift(newImage); // اضافه کردن به اول لیست

        // محدود کردن به 100 تصویر
        if (savedImages.length > 100) {
            savedImages.splice(100);
        }

        // ذخیره در localStorage
        localStorage.setItem('generatedImages', JSON.stringify(savedImages));

        console.log('✅ تصویر در localStorage ذخیره شد');
    } catch (error) {
        console.error('خطا در ذخیره تصویر:', error);
    }
}

// بارگذاری اولیه
console.log('🔧 Initializing page data...');
loadModels();
loadBackgrounds();
loadShotTypes();
loadPoses();
loadCameraAngles();
loadStyles();
loadLightings();

// بارگذاری پارامترهای کیفیت حرفه‌ای
loadColorTemperatures();
loadDepthOfFields();
loadFabricTypes();
loadShadowQualities();
loadAspectRatios();
loadBackgroundBlurs();
loadGarmentFits();
console.log('✅ Page data initialization started');

// ========================================
// NEW: Event Listeners for Mode Switching
// ========================================

// Mode card click handlers
if (modeCards && modeCards.length > 0) {
    modeCards.forEach(card => {
        card.addEventListener('click', () => {
            const mode = card.dataset.mode;
            switchMode(mode);
        });
    });
}

// افزودن event listener برای انتخاب حجاب
const hijabOptionCards = document.querySelectorAll('.hijab-option-card');
if (hijabOptionCards && hijabOptionCards.length > 0) {
    hijabOptionCards.forEach(card => {
        card.addEventListener('click', () => {
            const hijabType = card.dataset.hijabType;
            selectHijabType(hijabType);
        });
    });
}

// Event listener for display scenario selection
const scenarioCards = document.querySelectorAll('.scenario-card');
if (scenarioCards && scenarioCards.length > 0) {
    scenarioCards.forEach(card => {
        card.addEventListener('click', () => {
            const scenario = card.dataset.scenario;
            selectDisplayScenario(scenario);
        });
    });
}

// Event listener for flat lay arrangement selection
const arrangementCards = document.querySelectorAll('[data-arrangement]');
if (arrangementCards && arrangementCards.length > 0) {
    arrangementCards.forEach(card => {
        card.addEventListener('click', () => {
            const arrangement = card.dataset.arrangement;
            selectArrangement(arrangement);
        });
    });
}

// Event listeners for scene recreation
if (referencePhotoUploadArea && referencePhotoInput) {
    referencePhotoUploadArea.addEventListener('click', () => {
        referencePhotoInput.click();
    });
}

if (referencePhotoUploadArea) {
    referencePhotoUploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        referencePhotoUploadArea.style.borderColor = 'var(--primary-color)';
    });

    referencePhotoUploadArea.addEventListener('dragleave', () => {
        referencePhotoUploadArea.style.borderColor = '#ddd';
    });

    referencePhotoUploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        referencePhotoUploadArea.style.borderColor = '#ddd';
        const files = Array.from(e.dataTransfer.files);
        if (files.length > 0 && files[0].type.startsWith('image/')) {
            uploadReferencePhoto(files[0]);
        }
    });
}

if (referencePhotoInput) {
    referencePhotoInput.addEventListener('change', (e) => {
        const files = Array.from(e.target.files);
        if (files.length > 0) {
            uploadReferencePhoto(files[0]);
        }
    });
}

if (reanalyzeBtn) {
    reanalyzeBtn.addEventListener('click', () => {
        if (uploadedReferencePhoto) {
            analyzeReferencePhoto(uploadedReferencePhoto);
        }
    });
}

// Event listeners for style transfer
const styleImagesUploadArea = document.getElementById('styleImagesUploadArea');
const styleImagesInput = document.getElementById('styleImagesInput');
const contentImageUploadArea = document.getElementById('contentImageUploadArea');
const contentImageInput = document.getElementById('contentImageInput');

if (styleImagesUploadArea && styleImagesInput) {
    styleImagesUploadArea.addEventListener('click', () => {
        styleImagesInput.click();
    });
}

if (styleImagesUploadArea) {
    styleImagesUploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        styleImagesUploadArea.style.borderColor = 'var(--primary-color)';
    });

    styleImagesUploadArea.addEventListener('dragleave', () => {
        styleImagesUploadArea.style.borderColor = '#ddd';
    });

    styleImagesUploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        styleImagesUploadArea.style.borderColor = '#ddd';
        const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
        if (files.length > 0) {
            uploadStyleImages(files);
        }
    });
}

if (styleImagesInput) {
    styleImagesInput.addEventListener('change', (e) => {
        const files = Array.from(e.target.files);
        if (files.length > 0) {
            uploadStyleImages(files);
        }
    });
}

if (contentImageUploadArea && contentImageInput) {
    contentImageUploadArea.addEventListener('click', () => {
        contentImageInput.click();
    });
}

if (contentImageUploadArea) {
    contentImageUploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        contentImageUploadArea.style.borderColor = 'var(--primary-color)';
    });

    contentImageUploadArea.addEventListener('dragleave', () => {
        contentImageUploadArea.style.borderColor = '#ddd';
    });

    contentImageUploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        contentImageUploadArea.style.borderColor = '#ddd';
        const files = Array.from(e.dataTransfer.files);
        if (files.length > 0 && files[0].type.startsWith('image/')) {
            uploadContentImage(files[0]);
        }
    });
}

if (contentImageInput) {
    contentImageInput.addEventListener('change', (e) => {
        const files = Array.from(e.target.files);
        if (files.length > 0) {
            uploadContentImage(files[0]);
        }
    });
}

// ============================================
// GALLERY SELECTION FOR STYLE TRANSFER
// ============================================

let galleryMode = null; // 'style-images' or 'content-image'
let selectedGalleryImages = []; // Array of selected image URLs

// Open gallery for style images (allow multiple selection up to 3)
async function openGalleryForStyleImages() {
    galleryMode = 'style-images';
    selectedGalleryImages = [];
    document.getElementById('gallerySelectionInfo').textContent = 'حداکثر 3 عکس انتخاب کنید (برای عکس‌های استایل)';
    await loadGalleryImages();
    document.getElementById('galleryModal').style.display = 'block';
}

// Open gallery for content image (single selection)
async function openGalleryForContentImage() {
    galleryMode = 'content-image';
    selectedGalleryImages = [];
    document.getElementById('gallerySelectionInfo').textContent = 'یک عکس برای محتوای مرجع انتخاب کنید';
    await loadGalleryImages();
    document.getElementById('galleryModal').style.display = 'block';
}

// Load images from gallery
async function loadGalleryImages() {
    const galleryGrid = document.getElementById('galleryGrid');
    galleryGrid.innerHTML = '<p style="grid-column: 1/-1; text-align: center;">در حال بارگذاری گالری...</p>';

    try {
        const token = localStorage.getItem('supabase_token');
        const response = await fetch('/api/user-images', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();

        if (data.success && data.images && data.images.length > 0) {
            galleryGrid.innerHTML = '';
            data.images.forEach(image => {
                const imageCard = document.createElement('div');
                imageCard.style.cssText = 'position: relative; cursor: pointer; border-radius: 8px; overflow: hidden; border: 3px solid transparent; transition: all 0.2s;';
                imageCard.innerHTML = `
                    <img src="${image.image_url}" style="width: 100%; height: 150px; object-fit: cover;">
                    <div style="position: absolute; top: 5px; right: 5px; background: rgba(0,0,0,0.7); color: white; padding: 3px 8px; border-radius: 4px; font-size: 12px; display: none;" class="selection-badge">✓</div>
                `;

                imageCard.addEventListener('click', () => toggleImageSelection(image.image_url, imageCard));
                galleryGrid.appendChild(imageCard);
            });
        } else {
            galleryGrid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: #666;">هیچ عکسی در گالری وجود ندارد. ابتدا یک عکس تولید کنید.</p>';
        }
    } catch (error) {
        console.error('خطا در بارگذاری گالری:', error);
        galleryGrid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: #ef4444;">خطا در بارگذاری گالری</p>';
    }
}

// Toggle image selection
function toggleImageSelection(imageUrl, imageCard) {
    const badge = imageCard.querySelector('.selection-badge');
    const isSelected = selectedGalleryImages.includes(imageUrl);

    if (isSelected) {
        // Deselect
        selectedGalleryImages = selectedGalleryImages.filter(url => url !== imageUrl);
        imageCard.style.border = '3px solid transparent';
        badge.style.display = 'none';
    } else {
        // Check limits based on gallery mode
        let maxAllowed = 10;

        if (galleryMode === 'style-images') {
            maxAllowed = 3;
        } else if (galleryMode === 'content-image' || galleryMode === 'reference-photo') {
            maxAllowed = 1;
        } else if (galleryMode === 'garment') {
            // Determine max based on current service mode
            if (currentMode === 'complete-outfit' || currentMode === 'scene-recreation') {
                maxAllowed = 5;
            } else if (currentMode === 'accessories-only') {
                maxAllowed = 1;
            } else if (currentMode === 'color-collection') {
                maxAllowed = 10;
            } else if (currentMode === 'flat-lay') {
                maxAllowed = 6;
            }
        }

        // Check if limit reached
        if (selectedGalleryImages.length >= maxAllowed) {
            if (maxAllowed === 1) {
                // Deselect previous selection (only 1 allowed)
                const allCards = document.querySelectorAll('#galleryGrid > div');
                allCards.forEach(card => {
                    card.style.border = '3px solid transparent';
                    card.querySelector('.selection-badge').style.display = 'none';
                });
                selectedGalleryImages = [];
            } else {
                alert(`Maximum ${maxAllowed} images allowed`);
                return;
            }
        }

        selectedGalleryImages.push(imageUrl);
        imageCard.style.border = '3px solid #10b981';
        badge.style.display = 'block';
    }
}

// Close gallery modal
function closeGalleryModal() {
    document.getElementById('galleryModal').style.display = 'none';
    galleryMode = null;
    selectedGalleryImages = [];
}

// Confirm gallery selection
async function confirmGallerySelection() {
    if (selectedGalleryImages.length === 0) {
        alert('لطفاً حداقل یک عکس انتخاب کنید');
        return;
    }

    if (galleryMode === 'style-images') {
        // Add selected images to style images
        uploadedStyleImages = [...uploadedStyleImages, ...selectedGalleryImages];

        // Limit to 3 images
        if (uploadedStyleImages.length > 3) {
            uploadedStyleImages = uploadedStyleImages.slice(0, 3);
        }

        // Show previews
        showStyleImagesPreviews();

    } else if (galleryMode === 'content-image') {
        // Set content image
        uploadedContentImage = selectedGalleryImages[0];

        // Show preview
        const contentImagePreview = document.getElementById('contentImagePreview');
        const contentImageImg = document.getElementById('contentImageImg');
        const contentImagePlaceholder = document.getElementById('contentImagePlaceholder');

        contentImageImg.src = uploadedContentImage;
        contentImagePreview.style.display = 'block';
        contentImagePlaceholder.style.display = 'none';

        // Show analysis loading indicator
        const analysisStatus = document.getElementById('contentImageAnalysisStatus');
        if (analysisStatus) {
            analysisStatus.style.display = 'block';
        }

        // Analyze content image for lighting/mood/atmosphere
        console.log('🔍 در حال تحلیل عکس محتوا...');
        await analyzeContentImage(uploadedContentImage);

        // Hide analysis loading indicator
        if (analysisStatus) {
            analysisStatus.style.display = 'none';
        }
    } else if (galleryMode === 'garment') {
        // Handle garment selection for different services
        const files = [];

        // Convert image URLs to file objects (simulate upload from gallery)
        for (const imageUrl of selectedGalleryImages) {
            // Create a fake file object that points to the gallery image
            uploadedGarments.push(imageUrl);
        }

        // Show previews based on current mode
        showGarmentPreviews();

    } else if (galleryMode === 'reference-photo') {
        // Handle reference photo for scene-recreation
        uploadedReferencePhoto = selectedGalleryImages[0];

        // Show preview
        const referencePhotoPreview = document.getElementById('referencePhotoPreview');
        const referencePhotoImg = document.getElementById('referencePhotoImg');
        const referencePhotoPlaceholder = document.getElementById('referencePhotoPlaceholder');

        if (referencePhotoImg && referencePhotoPreview && referencePhotoPlaceholder) {
            referencePhotoImg.src = uploadedReferencePhoto;
            referencePhotoPreview.style.display = 'block';
            referencePhotoPlaceholder.style.display = 'none';

            // Trigger scene analysis
            const sceneAnalysisSection = document.getElementById('sceneAnalysisSection');
            if (sceneAnalysisSection) {
                sceneAnalysisSection.style.display = 'block';
            }

            // Analyze the reference photo
            await analyzeReferencePhoto(uploadedReferencePhoto);
        }
    }

    checkGenerateButton();
    closeGalleryModal();
}

// Show style images previews
function showStyleImagesPreviews() {
    const previewsContainer = document.getElementById('styleImagesPreviews');
    const placeholder = document.getElementById('styleImagesPlaceholder');

    if (uploadedStyleImages.length > 0) {
        previewsContainer.innerHTML = '';
        uploadedStyleImages.forEach((imagePath, index) => {
            const previewDiv = document.createElement('div');
            previewDiv.className = 'garment-preview';
            previewDiv.innerHTML = `
                <img src="${imagePath}" alt="Style ${index + 1}">
                <button class="remove-btn" onclick="removeStyleImage(${index})">حذف</button>
            `;
            previewsContainer.appendChild(previewDiv);
        });
        previewsContainer.style.display = 'grid';
        placeholder.style.display = 'none';
    } else {
        previewsContainer.style.display = 'none';
        placeholder.style.display = 'flex';
    }
}

// ============================================
// GALLERY SELECTION FOR OTHER SERVICES
// ============================================

// Open gallery for garment selection (for complete-outfit, accessories, color-collection, flat-lay)
async function openGalleryForGarment() {
    galleryMode = 'garment';
    selectedGalleryImages = [];

    // Set appropriate message based on current mode
    let maxImages = 10;
    let message = 'Select images from your gallery';

    if (currentMode === 'complete-outfit') {
        maxImages = 5;
        message = 'Select up to 5 garment images';
    } else if (currentMode === 'accessories-only') {
        maxImages = 1;
        message = 'Select one accessory image';
    } else if (currentMode === 'color-collection') {
        maxImages = 10;
        message = 'Select up to 10 color variant images';
    } else if (currentMode === 'flat-lay') {
        maxImages = 6;
        message = 'Select up to 6 product images';
    } else if (currentMode === 'scene-recreation') {
        maxImages = 5;
        message = 'Select up to 5 garment images';
    }

    document.getElementById('gallerySelectionInfo').textContent = message;
    await loadGalleryImages();
    document.getElementById('galleryModal').style.display = 'block';
}

// Open gallery for reference photo (for scene-recreation)
async function openGalleryForReferencePhoto() {
    galleryMode = 'reference-photo';
    selectedGalleryImages = [];
    document.getElementById('gallerySelectionInfo').textContent = 'Select one reference photo';
    await loadGalleryImages();
    document.getElementById('galleryModal').style.display = 'block';
}

// ========================================
// Initialize page based on currentMode
// ========================================
// If we're on a service-specific page, switch to that mode
if (window.currentMode && currentMode !== 'complete-outfit') {
    console.log('🎯 Initializing page with mode:', currentMode);
    // Call switchMode to show/hide appropriate sections
    switchMode(currentMode);
}