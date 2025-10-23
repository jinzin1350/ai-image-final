let uploadedGarmentPath = null;
let selectedModelId = null;
let selectedBackgroundId = null;

// المان‌ها
const garmentInput = document.getElementById('garmentInput');
const uploadArea = document.getElementById('uploadArea');
const uploadPlaceholder = document.getElementById('uploadPlaceholder');
const garmentPreview = document.getElementById('garmentPreview');
const modelsGrid = document.getElementById('modelsGrid');
const backgroundsGrid = document.getElementById('backgroundsGrid');
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
        const models = await response.json();

        modelsGrid.innerHTML = models.map(model => `
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
    } catch (error) {
        console.error('خطا در بارگذاری مدل‌ها:', error);
    }
}

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
                backgroundId: selectedBackgroundId
            })
        });

        const data = await response.json();

        if (data.success) {
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

// بارگذاری اولیه
loadModels();
loadBackgrounds();