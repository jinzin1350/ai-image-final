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
let selectedPoseId = 'standing-front';
let selectedCameraAngleId = 'eye-level';
let selectedStyleId = 'professional';
let selectedLightingId = 'studio';

// NEW: Mode selection variables
let currentMode = 'complete-outfit'; // 'complete-outfit', 'accessories-only', 'color-collection'
let uploadedAccessoryPath = null; // Path to uploaded accessory product image
let selectedAccessoryType = null; // Type of accessory (handbag, watch, etc.)

// NEW: Color Collection mode variables
let uploadedColorVariants = []; // Array of uploaded color variant paths
let selectedDisplayScenario = null; // 'on-arm', 'hanging-rack', 'folded-stack', 'laid-out'

// NEW: Flat Lay mode variables
let uploadedFlatLayProducts = []; // Array of uploaded product paths for flat lay
let selectedArrangement = null; // 'grid', 'scattered', 'circular', 'diagonal'

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

// NEW: Mode selection elements
const modeCards = document.querySelectorAll('.mode-card');
const garmentUploadSection = document.getElementById('garmentUploadSection');
const accessoryUploadSection = document.getElementById('accessoryUploadSection');
const colorCollectionUploadSection = document.getElementById('colorCollectionUploadSection');
const flatLayUploadSection = document.getElementById('flatLayUploadSection');

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

// بارگذاری مدل‌ها
async function loadModels() {
    try {
        // Get auth token from localStorage if user is logged in
        const token = localStorage.getItem('supabase_token');
        const headers = {};
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch('/api/models', { headers });
        allModels = await response.json();

        // نمایش مدل‌های دسته‌بندی فعلی
        displayModelsByCategory(currentCategory);
    } catch (error) {
        console.error('خطا در بارگذاری مدل‌ها:', error);
    }
}

// نمایش مدل‌های یک دسته‌بندی خاص
function displayModelsByCategory(category) {
    const filteredModels = allModels.filter(model => model.category === category);

    modelsGrid.innerHTML = filteredModels.map(model => `
        <div class="model-card" data-id="${model.id}">
            <div class="model-image-container">
                <img src="${model.image}" alt="${model.name}" class="model-image">
            </div>
            <div class="card-title">${model.name}</div>
        </div>
    `).join('');

    // افزودن رویداد کلیک به مدل‌ها
    document.querySelectorAll('.model-card').forEach(card => {
        card.addEventListener('click', () => selectModel(card.dataset.id));
    });
}

// تغییر دسته‌بندی
categorySelect.addEventListener('change', (e) => {
    currentCategory = e.target.value;
    selectedModelId = null; // پاک کردن انتخاب قبلی
    displayModelsByCategory(currentCategory);
    checkGenerateButton();
});

// بارگذاری پس‌زمینه‌ها
async function loadBackgrounds() {
    try {
        // Get auth token from localStorage if user is logged in
        const token = localStorage.getItem('supabase_token');
        const headers = {};
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch('/api/backgrounds', { headers });
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

// Event listeners برای پارامترهای پیشرفته
poseSelect.addEventListener('change', (e) => {
    selectedPoseId = e.target.value;
});

cameraAngleSelect.addEventListener('change', (e) => {
    selectedCameraAngleId = e.target.value;
});

styleSelect.addEventListener('change', (e) => {
    selectedStyleId = e.target.value;
});

lightingSelect.addEventListener('change', (e) => {
    selectedLightingId = e.target.value;
});

// PHASE 1: Event listeners for critical quality parameters
colorTempSelect.addEventListener('change', (e) => {
    selectedColorTempId = e.target.value;
});

dofSelect.addEventListener('change', (e) => {
    selectedDofId = e.target.value;
});

fabricSelect.addEventListener('change', (e) => {
    selectedFabricId = e.target.value;
});

shadowSelect.addEventListener('change', (e) => {
    selectedShadowId = e.target.value;
});

// PHASE 2: Event listeners for professional touch
aspectRatioSelect.addEventListener('change', (e) => {
    selectedAspectRatioId = e.target.value;
});

bgBlurSelect.addEventListener('change', (e) => {
    selectedBgBlurId = e.target.value;
});

fitSelect.addEventListener('change', (e) => {
    selectedFitId = e.target.value;
});

// Load functions for new quality parameters
async function loadColorTemperatures() {
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
if (accessoryUploadArea) {
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

    try {
        const response = await fetch('/api/upload', {
            method: 'POST',
            body: formData
        });

        const data = await response.json();

        if (data.success) {
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
            console.error('Upload failed:', data);
            const errorMsg = data.details || data.error || 'خطا در آپلود فایل';
            alert(`Error: ${errorMsg}`);
        }
    } catch (error) {
        console.error('خطا در آپلود فایل:', error);
        alert('خطا در آپلود فایل. لطفاً یک فایل تصویری معتبر انتخاب کنید.');
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
                uploadedColorVariants.push(data.filePath);
            }
        } catch (error) {
            console.error('خطا در آپلود تصویر:', error);
        }
    }

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
                uploadedFlatLayProducts.push(data.filePath);
            }
        } catch (error) {
            console.error('خطا در آپلود تصویر:', error);
        }
    }

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

        // Restore original upload section text
        document.querySelector('#garmentUploadSection h2').textContent = '۱. آپلود تصویر لباس';

    } else if (mode === 'accessories-only') {
        // Accessories mode: upload accessory product photo, select model and background
        garmentUploadSection.style.display = 'none';
        accessoryUploadSection.style.display = 'block';
        colorCollectionUploadSection.style.display = 'none';
        displayScenarioSection.style.display = 'none';
        hijabSection.style.display = 'none'; // Hide hijab section in accessories mode

    } else if (mode === 'color-collection') {
        // Color Collection mode: upload multiple color variants and select display scenario
        garmentUploadSection.style.display = 'none';
        accessoryUploadSection.style.display = 'none';
        colorCollectionUploadSection.style.display = 'block';
        displayScenarioSection.style.display = 'block';
        flatLayUploadSection.style.display = 'none';
        flatLayArrangementSection.style.display = 'none';
        hijabSection.style.display = 'none'; // Hide hijab section

    } else if (mode === 'flat-lay') {
        // Flat Lay mode: upload products and select arrangement
        garmentUploadSection.style.display = 'none';
        accessoryUploadSection.style.display = 'none';
        colorCollectionUploadSection.style.display = 'none';
        displayScenarioSection.style.display = 'none';
        flatLayUploadSection.style.display = 'block';
        flatLayArrangementSection.style.display = 'block';
        hijabSection.style.display = 'none'; // Hide hijab section
    }

    // Reset selections when switching modes
    uploadedAccessoryPath = null;
    selectedAccessoryType = null;
    uploadedColorVariants = [];
    selectedDisplayScenario = null;
    uploadedFlatLayProducts = [];
    selectedArrangement = null;
    if (mode !== 'complete-outfit') {
        selectedHijabType = null;
    }

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

        isValid = uploadedGarmentPaths.length > 0 &&
                  selectedModelId &&
                  selectedBackgroundId &&
                  hijabCondition;

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
    }

    generateBtn.disabled = !isValid;
}

// رویدادهای آپلود فایل
uploadArea.addEventListener('click', () => garmentInput.click());

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

garmentInput.addEventListener('change', (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) {
        uploadFiles(files);
    }
});

// آپلود چند فایل
async function uploadFiles(files) {
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
generateBtn.addEventListener('click', async () => {
    loadingOverlay.style.display = 'flex';
    resultSection.style.display = 'none';

    try {
        // Build request body based on current mode
        let requestBody = {
            mode: currentMode, // NEW: Send current mode to API
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
        }

        console.log('🚀 Sending request:', requestBody);

        const response = await fetch('/api/generate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
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

// دانلود تصویر
downloadBtn.addEventListener('click', () => {
    const link = document.createElement('a');
    link.href = resultImage.src;
    link.download = 'fashion-ai-result.jpg';
    link.click();
});

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
loadModels();
loadBackgrounds();
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

// ========================================
// NEW: Event Listeners for Mode Switching
// ========================================

// Mode card click handlers
modeCards.forEach(card => {
    card.addEventListener('click', () => {
        const mode = card.dataset.mode;
        switchMode(mode);
    });
});

// افزودن event listener برای انتخاب حجاب
document.querySelectorAll('.hijab-option-card').forEach(card => {
    card.addEventListener('click', () => {
        const hijabType = card.dataset.hijabType;
        selectHijabType(hijabType);
    });
});

// Event listener for display scenario selection
document.querySelectorAll('.scenario-card').forEach(card => {
    card.addEventListener('click', () => {
        const scenario = card.dataset.scenario;
        selectDisplayScenario(scenario);
    });
});

// Event listener for flat lay arrangement selection
document.querySelectorAll('[data-arrangement]').forEach(card => {
    card.addEventListener('click', () => {
        const arrangement = card.dataset.arrangement;
        selectArrangement(arrangement);
    });
});