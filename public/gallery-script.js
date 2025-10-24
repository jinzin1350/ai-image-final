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

        const response = await fetch('/api/generations');
        const data = await response.json();

        if (data.success && data.generations && data.generations.length > 0) {
            generations = data.generations;
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

        return `
            <div class="gallery-item" onclick="openModal(${gen.id})">
                <img src="${gen.generated_image_url}" alt="تصویر تولید شده" loading="lazy">
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
    modalImage.src = generation.generated_image_url;

    const date = new Date(generation.created_at);
    const dateStr = date.toLocaleDateString('fa-IR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });

    modalInfo.innerHTML = `
        <h3>جزئیات تصویر</h3>
        <p><strong>تاریخ تولید:</strong> ${dateStr}</p>
        <p><strong>شناسه مدل:</strong> ${generation.model_id || 'نامشخص'}</p>
        <p><strong>پس‌زمینه:</strong> ${generation.background_id || 'نامشخص'}</p>
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

    const link = document.createElement('a');
    link.href = generation.generated_image_url;
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
        const response = await fetch(`/api/generations/${currentImageId}`, {
            method: 'DELETE'
        });

        const data = await response.json();

        if (data.success) {
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
        } else {
            alert('خطا در حذف تصویر');
        }
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
