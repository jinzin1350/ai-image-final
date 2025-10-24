let generations = [];
let currentImageId = null;

// المان‌ها
const loading = document.getElementById('loading');
const emptyState = document.getElementById('emptyState');
const galleryGrid = document.getElementById('galleryGrid');
const sortSelect = document.getElementById('sortSelect');
const totalCount = document.getElementById('totalCount');
const imageModal = document.getElementById('imageModal');
const modalImage = document.getElementById('modalImage');
const modalInfo = document.getElementById('modalInfo');

// بارگذاری تصاویر
async function loadGallery() {
    try {
        loading.style.display = 'block';
        emptyState.style.display = 'none';
        galleryGrid.innerHTML = '';

        // ابتدا از localStorage بارگذاری می‌کنیم
        const localImages = JSON.parse(localStorage.getItem('generatedImages') || '[]');

        // سپس از API تلاش می‌کنیم
        try {
            const response = await fetch('/api/generations');
            const data = await response.json();

            if (data.success && data.generations && data.generations.length > 0) {
                // ترکیب تصاویر localStorage و API
                const apiImages = data.generations.map(gen => ({
                    ...gen,
                    imagePath: gen.generated_image_url,
                    source: 'api'
                }));

                const localImagesWithSource = localImages.map(img => ({
                    ...img,
                    source: 'local'
                }));

                // حذف تکراری‌ها بر اساس imagePath
                const allImages = [...localImagesWithSource, ...apiImages];
                const uniqueImages = allImages.filter((img, index, self) =>
                    index === self.findIndex((t) => t.imagePath === img.imagePath)
                );

                generations = uniqueImages;
            } else {
                // فقط از localStorage استفاده می‌کنیم
                generations = localImages.map(img => ({ ...img, source: 'local' }));
            }
        } catch (apiError) {
            console.log('API در دسترس نیست، از localStorage استفاده می‌شود');
            generations = localImages.map(img => ({ ...img, source: 'local' }));
        }

        if (generations.length > 0) {
            sortGenerations();
            displayGallery();
        } else {
            loading.style.display = 'none';
            emptyState.style.display = 'block';
        }
    } catch (error) {
        console.error('خطا در بارگذاری گالری:', error);
        loading.style.display = 'none';
        emptyState.style.display = 'block';
    }
}

// مرتب‌سازی تصاویر
function sortGenerations() {
    const sortType = sortSelect.value;

    if (sortType === 'newest') {
        generations.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    } else {
        generations.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    }
}

// نمایش گالری
function displayGallery() {
    loading.style.display = 'none';
    totalCount.textContent = `${generations.length} تصویر`;

    galleryGrid.innerHTML = generations.map(gen => {
        const date = new Date(gen.created_at);
        const dateStr = date.toLocaleDateString('fa-IR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        // استفاده از imagePath یا generated_image_url
        const imageUrl = gen.imagePath || gen.generated_image_url;

        return `
            <div class="gallery-item" onclick="openModal(${gen.id})">
                <img src="${imageUrl}" alt="تصویر تولید شده" loading="lazy">
                <div class="gallery-item-info">
                    <div class="gallery-item-date">${dateStr}</div>
                </div>
            </div>
        `;
    }).join('');
}

// باز کردن Modal
function openModal(imageId) {
    const generation = generations.find(g => g.id === imageId);
    if (!generation) return;

    currentImageId = imageId;
    // استفاده از imagePath یا generated_image_url
    const imageUrl = generation.imagePath || generation.generated_image_url;
    modalImage.src = imageUrl;

    const date = new Date(generation.created_at);
    const dateStr = date.toLocaleDateString('fa-IR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });

    // استفاده از modelId یا model_id
    const modelId = generation.modelId || generation.model_id || 'نامشخص';
    const backgroundId = generation.backgroundId || generation.background_id || 'نامشخص';

    modalInfo.innerHTML = `
        <h3>جزئیات تصویر</h3>
        <p><strong>تاریخ تولید:</strong> ${dateStr}</p>
        <p><strong>شناسه مدل:</strong> ${modelId}</p>
        <p><strong>پس‌زمینه:</strong> ${backgroundId}</p>
        ${generation.description ? `<p><strong>توضیحات:</strong> ${generation.description}</p>` : ''}
    `;

    imageModal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

// بستن Modal
function closeModal() {
    imageModal.style.display = 'none';
    document.body.style.overflow = 'auto';
    currentImageId = null;
}

// دانلود تصویر
function downloadImage() {
    if (!currentImageId) return;

    const generation = generations.find(g => g.id === currentImageId);
    if (!generation) return;

    // استفاده از imagePath یا generated_image_url
    const imageUrl = generation.imagePath || generation.generated_image_url;

    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = `fashion-ai-${currentImageId}.jpg`;
    link.click();
}

// حذف تصویر
async function deleteImage() {
    if (!currentImageId) return;

    if (!confirm('آیا مطمئن هستید که می‌خواهید این تصویر را حذف کنید؟')) {
        return;
    }

    try {
        const generation = generations.find(g => g.id === currentImageId);

        // حذف از localStorage
        const savedImages = JSON.parse(localStorage.getItem('generatedImages') || '[]');
        const updatedImages = savedImages.filter(img => img.id !== currentImageId);
        localStorage.setItem('generatedImages', JSON.stringify(updatedImages));

        // اگر از API بود، سعی کن از API هم حذف کن
        if (generation && generation.source === 'api') {
            try {
                await fetch(`/api/generations/${currentImageId}`, {
                    method: 'DELETE'
                });
            } catch (apiError) {
                console.log('خطا در حذف از API، ولی از localStorage حذف شد');
            }
        }

        // حذف از لیست محلی
        generations = generations.filter(g => g.id !== currentImageId);

        closeModal();

        // به‌روزرسانی گالری
        if (generations.length === 0) {
            emptyState.style.display = 'block';
            galleryGrid.innerHTML = '';
            totalCount.textContent = '0 تصویر';
        } else {
            displayGallery();
        }

        alert('تصویر با موفقیت حذف شد');
    } catch (error) {
        console.error('خطا در حذف تصویر:', error);
        alert('خطا در حذف تصویر');
    }
}

// Event listener برای مرتب‌سازی
sortSelect.addEventListener('change', () => {
    sortGenerations();
    displayGallery();
});

// بستن Modal با کلید Escape
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && imageModal.style.display === 'flex') {
        closeModal();
    }
});

// بارگذاری اولیه
loadGallery();
