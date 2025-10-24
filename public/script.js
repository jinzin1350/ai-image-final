// Initialize Supabase client - will be set after fetching config
let supabaseClient = null;
let currentUser = null;

// Fetch Supabase config from server
async function initSupabase() {
  try {
    const response = await fetch('/api/supabase-config');
    const config = await response.json();

    if (!config.configured) {
      console.error('❌ Supabase is not configured on server');
      return false;
    }

    const { createClient } = supabase;
    supabaseClient = createClient(config.url, config.anonKey);
    console.log('✅ Supabase client initialized');
    return true;
  } catch (error) {
    console.error('❌ Failed to initialize Supabase:', error);
    return false;
  }
}

let uploadedGarmentPaths = []; // Changed to array for multiple garments
let selectedModelId = null;
let selectedBackgroundId = null;
let allModels = [];
let currentCategory = 'woman';
let selectedPoseId = 'standing-front';
let selectedCameraAngleId = 'eye-level';
let selectedStyleId = 'professional';
let selectedLightingId = 'studio';

// PHASE 1: Critical Quality Parameters
let selectedColorTempId = 'auto';
let selectedDofId = 'medium';
let selectedFabricId = 'auto';
let selectedShadowId = 'medium';

// PHASE 2: Professional Touch
let selectedAspectRatioId = '1:1';
let selectedLightingRatioId = 'medium';
let selectedBgBlurId = 'medium';
let selectedFitId = 'regular';

// PHASE 3: Advanced Features
let selectedPostProcId = 'natural';
let selectedEnvReflectId = 'subtle';
let selectedWeatherId = 'clear';
let selectedMotionId = 'static';

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
const lightingRatioSelect = document.getElementById('lightingRatioSelect');
const bgBlurSelect = document.getElementById('bgBlurSelect');
const fitSelect = document.getElementById('fitSelect');
const postProcSelect = document.getElementById('postProcSelect');
const envReflectSelect = document.getElementById('envReflectSelect');
const weatherSelect = document.getElementById('weatherSelect');
const motionSelect = document.getElementById('motionSelect');

// بارگذاری مدل‌ها
async function loadModels() {
    try {
        const response = await fetch('/api/models');
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
        const response = await fetch('/api/backgrounds');
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

lightingRatioSelect.addEventListener('change', (e) => {
    selectedLightingRatioId = e.target.value;
});

bgBlurSelect.addEventListener('change', (e) => {
    selectedBgBlurId = e.target.value;
});

fitSelect.addEventListener('change', (e) => {
    selectedFitId = e.target.value;
});

// PHASE 3: Event listeners for advanced features
postProcSelect.addEventListener('change', (e) => {
    selectedPostProcId = e.target.value;
});

envReflectSelect.addEventListener('change', (e) => {
    selectedEnvReflectId = e.target.value;
});

weatherSelect.addEventListener('change', (e) => {
    selectedWeatherId = e.target.value;
});

motionSelect.addEventListener('change', (e) => {
    selectedMotionId = e.target.value;
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

async function loadLightingRatios() {
    try {
        const response = await fetch('/api/lighting-ratios');
        const items = await response.json();
        lightingRatioSelect.innerHTML = items.map(item => `
            <option value="${item.id}">${item.name}</option>
        `).join('');
        selectedLightingRatioId = items[1]?.id || 'medium';
    } catch (error) {
        console.error('خطا در بارگذاری نسبت نوری:', error);
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

async function loadPostProcessingPresets() {
    try {
        const response = await fetch('/api/post-processing-presets');
        const items = await response.json();
        postProcSelect.innerHTML = items.map(item => `
            <option value="${item.id}">${item.name}</option>
        `).join('');
        selectedPostProcId = items[0]?.id || 'natural';
    } catch (error) {
        console.error('خطا در بارگذاری پردازش رنگ:', error);
    }
}

async function loadEnvironmentalReflections() {
    try {
        const response = await fetch('/api/environmental-reflections');
        const items = await response.json();
        envReflectSelect.innerHTML = items.map(item => `
            <option value="${item.id}">${item.name}</option>
        `).join('');
        selectedEnvReflectId = items[1]?.id || 'subtle';
    } catch (error) {
        console.error('خطا در بارگذاری بازتاب محیط:', error);
    }
}

async function loadWeatherEffects() {
    try {
        const response = await fetch('/api/weather-effects');
        const items = await response.json();
        weatherSelect.innerHTML = items.map(item => `
            <option value="${item.id}">${item.name}</option>
        `).join('');
        selectedWeatherId = items[0]?.id || 'clear';
    } catch (error) {
        console.error('خطا در بارگذاری آب و هوا:', error);
    }
}

async function loadMotionElements() {
    try {
        const response = await fetch('/api/motion-elements');
        const items = await response.json();
        motionSelect.innerHTML = items.map(item => `
            <option value="${item.id}">${item.name}</option>
        `).join('');
        selectedMotionId = items[0]?.id || 'static';
    } catch (error) {
        console.error('خطا در بارگذاری حرکت:', error);
    }
}

// انتخاب مدل
function selectModel(modelId) {
    selectedModelId = modelId;
    document.querySelectorAll('.model-card').forEach(card => {
        card.classList.toggle('selected', card.dataset.id === modelId);
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
    generateBtn.disabled = !(uploadedGarmentPaths.length > 0 && selectedModelId && selectedBackgroundId);
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
        const response = await fetch('/api/generate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                garmentPaths: uploadedGarmentPaths,
                modelId: selectedModelId,
                backgroundId: selectedBackgroundId,
                poseId: selectedPoseId,
                cameraAngleId: selectedCameraAngleId,
                styleId: selectedStyleId,
                lightingId: selectedLightingId,
                // PHASE 1: Critical Quality
                colorTemperatureId: selectedColorTempId,
                depthOfFieldId: selectedDofId,
                fabricTypeId: selectedFabricId,
                shadowQualityId: selectedShadowId,
                // PHASE 2: Professional Touch
                aspectRatioId: selectedAspectRatioId,
                lightingRatioId: selectedLightingRatioId,
                backgroundBlurId: selectedBgBlurId,
                garmentFitId: selectedFitId,
                // PHASE 3: Advanced Features
                postProcessingId: selectedPostProcId,
                environmentalReflectionId: selectedEnvReflectId,
                weatherEffectId: selectedWeatherId,
                motionElementId: selectedMotionId
            })
        });

        const data = await response.json();

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

// Check authentication
async function checkAuth() {
    try {
        const initialized = await initSupabase();
        if (!initialized) {
            window.location.href = '/auth.html';
            return;
        }

        const { data, error } = await supabaseClient.auth.getSession();

        if (error) throw error;

        if (data.session) {
            currentUser = data.session.user;
            displayUserInfo();
        } else {
            // Redirect to auth page
            window.location.href = '/auth.html';
        }
    } catch (error) {
        console.error('خطا در بررسی احراز هویت:', error);
        window.location.href = '/auth.html';
    }
}

// Display user info
function displayUserInfo() {
    const userSection = document.getElementById('userSection');
    const userEmail = document.getElementById('userEmail');

    if (currentUser && userSection && userEmail) {
        userEmail.textContent = currentUser.email;
        userSection.style.display = 'flex';
    }
}

// Handle logout
async function handleLogout() {
    try {
        const { error } = await supabaseClient.auth.signOut();
        if (error) throw error;

        localStorage.removeItem('supabase_session');
        window.location.href = '/auth.html';
    } catch (error) {
        console.error('خطا در خروج:', error);
        alert('خطا در خروج. لطفاً دوباره تلاش کنید.');
    }
}

// بارگذاری اولیه
checkAuth().then(() => {
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
    loadLightingRatios();
    loadBackgroundBlurs();
    loadGarmentFits();
    loadPostProcessingPresets();
    loadEnvironmentalReflections();
    loadWeatherEffects();
    loadMotionElements();
});