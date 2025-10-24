let uploadedGarmentPath = null;
let selectedModelId = null;
let selectedBackgroundId = null;
let allModels = [];
let currentCategory = 'woman';
let selectedPoseId = 'standing-front';
let selectedCameraAngleId = 'eye-level';
let selectedStyleId = 'professional';
let selectedLightingId = 'studio';

// المان‌ها
const garmentInput = document.getElementById('garmentInput');
const uploadArea = document.getElementById('uploadArea');
const uploadPlaceholder = document.getElementById('uploadPlaceholder');
const garmentPreview = document.getElementById('garmentPreview');
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

        const backgroundIcons = {
            'studio': '🏢',
            'beach': '🏖️',
            'street': '🏙️',
            'park': '🌳',
            'cafe': '☕',
            'rooftop': '🌆'
        };

        backgroundsGrid.innerHTML = backgrounds.map(bg => `
            <div class="background-card" data-id="${bg.id}">
                <div class="background-icon">${backgroundIcons[bg.id]}</div>
                <div class="card-title">${bg.name}</div>
                <div class="card-description">${bg.description}</div>
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
    generateBtn.disabled = !(uploadedGarmentPath && selectedModelId && selectedBackgroundId);
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
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
        uploadFile(file);
    }
});

garmentInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        uploadFile(file);
    }
});

// آپلود فایل
async function uploadFile(file) {
    const formData = new FormData();
    formData.append('garment', file);

    try {
        const response = await fetch('/api/upload', {
            method: 'POST',
            body: formData
        });

        const data = await response.json();

        if (data.success) {
            uploadedGarmentPath = data.filePath; // Store full URL instead of just filename
            garmentPreview.src = data.filePath;
            garmentPreview.style.display = 'block';
            uploadPlaceholder.style.display = 'none';
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
                garmentPath: uploadedGarmentPath,
                modelId: selectedModelId,
                backgroundId: selectedBackgroundId,
                poseId: selectedPoseId,
                cameraAngleId: selectedCameraAngleId,
                styleId: selectedStyleId,
                lightingId: selectedLightingId
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

// بارگذاری اولیه
loadModels();
loadBackgrounds();
loadPoses();
loadCameraAngles();
loadStyles();
loadLightings();