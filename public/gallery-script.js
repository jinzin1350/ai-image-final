
// Initialize Supabase client - will be set after fetching config
let supabaseClient = null;

// Global Variables
let allImages = [];
let currentImage = null;
let currentView = 'grid';
let currentPage = 1;
let itemsPerPage = 30;
let totalPages = 0;
let totalCount = 0;

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

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    const initialized = await initSupabase();
    if (initialized) {
        loadImages();
        setupEventListeners();
        updateStats();
    } else {
        showError('خطا در اتصال به سرور. لطفاً صفحه را رفرش کنید.');
    }
});

// Setup Event Listeners
function setupEventListeners() {
    // Sort filter
    const sortSelect = document.getElementById('sortSelect');
    if (sortSelect) {
        sortSelect.addEventListener('change', () => {
            sortImages(sortSelect.value);
            renderGallery();
        });
    }

    // Search input
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            filterImages(e.target.value);
        });
    }

    // View toggle
    const viewButtons = document.querySelectorAll('.view-btn');
    viewButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            viewButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentView = btn.dataset.view;
            renderGallery();
        });
    });

    // Items per page selector
    const itemsPerPageSelect = document.getElementById('itemsPerPageSelect');
    if (itemsPerPageSelect) {
        itemsPerPageSelect.addEventListener('change', (e) => {
            itemsPerPage = parseInt(e.target.value);
            currentPage = 1; // Reset to first page
            loadImages();
        });
    }

    // Close modal on escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeModal();
            closeDeleteModal();
        }
    });
}

// Load Images from Supabase (User-specific or All for admin)
async function loadImages() {
    const loadingState = document.getElementById('loadingState');
    const emptyState = document.getElementById('emptyState');
    const galleryGrid = document.getElementById('galleryGrid');

    try {
        loadingState.style.display = 'block';
        emptyState.style.display = 'none';
        galleryGrid.style.display = 'none';

        // Get auth token
        const token = localStorage.getItem('supabase_token');
        if (!token) {
            showError('لطفاً ابتدا وارد حساب کاربری خود شوید');
            setTimeout(() => {
                window.location.href = '/auth';
            }, 2000);
            return;
        }

        // Fetch user-specific images from backend API with pagination
        const response = await fetch(`/api/user/gallery?page=${currentPage}&limit=${itemsPerPage}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const result = await response.json();

        if (!result.success) {
            throw new Error(result.error || 'خطا در بارگذاری گالری');
        }

        allImages = result.images || [];
        totalCount = result.totalCount || 0;
        totalPages = result.totalPages || 0;

        // Show admin badge if user is admin
        if (result.isAdmin) {
            console.log('👑 Admin mode - showing all user images');
            const header = document.querySelector('header h1');
            if (header && !header.querySelector('.admin-badge')) {
                const badge = document.createElement('span');
                badge.className = 'admin-badge';
                badge.textContent = '👑 Admin';
                badge.style.cssText = 'background: linear-gradient(135deg, #ffd700, #ffed4e); color: #000; padding: 4px 12px; border-radius: 20px; font-size: 12px; margin-right: 10px; font-weight: bold;';
                header.appendChild(badge);
            }
        }

        loadingState.style.display = 'none';

        if (allImages.length === 0 && currentPage === 1) {
            emptyState.style.display = 'block';
            document.getElementById('paginationContainer').style.display = 'none';
        } else {
            galleryGrid.style.display = 'grid';
            renderGallery();
            updateStats();
            renderPagination();
        }
    } catch (error) {
        console.error('Error loading images:', error);
        loadingState.innerHTML = `
            <div class="error-state">
                <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="#ff4757" stroke-width="2">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="12" y1="8" x2="12" y2="12"/>
                    <line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                <h3>خطا در بارگذاری تصاویر</h3>
                <p>${error.message}</p>
                <button onclick="loadImages()" class="btn-create">تلاش مجدد</button>
            </div>
        `;
    }
}

// Show Error
function showError(message) {
    const loadingState = document.getElementById('loadingState');
    loadingState.innerHTML = `
        <div class="error-state">
            <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="#ff4757" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <h3>خطا</h3>
            <p>${message}</p>
            <button onclick="location.reload()" class="btn-create">تلاش مجدد</button>
        </div>
    `;
}

// Render Gallery
function renderGallery() {
    const galleryGrid = document.getElementById('galleryGrid');

    if (currentView === 'grid') {
        galleryGrid.className = 'gallery-grid';
    } else {
        galleryGrid.className = 'gallery-list';
    }

    galleryGrid.innerHTML = allImages.map((image, index) => `
        <div class="gallery-item" onclick="openModal(${index})" style="animation: fadeInUp 0.5s ease ${index * 0.05}s backwards;">
            <img src="${image.generated_image_url}" alt="تصویر ${index + 1}" class="gallery-item-image" loading="lazy">
            <div class="gallery-item-overlay">
                <div class="overlay-top">
                    <div class="view-details-btn">
                        <div class="view-icon">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                                <circle cx="12" cy="12" r="3"/>
                            </svg>
                        </div>
                        <div class="view-text">مشاهده جزئیات</div>
                        <div class="view-hint">💡 کلیک کنید</div>
                    </div>
                </div>
                <div class="item-info">
                    <div class="item-date">${formatDate(image.created_at)}</div>
                    <div class="item-params">${image.model_id || 'مدل'} • ${image.background_id || 'پس‌زمینه'}</div>
                </div>
            </div>
        </div>
    `).join('');
}

// Sort Images
function sortImages(sortType) {
    if (sortType === 'newest') {
        allImages.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    } else if (sortType === 'oldest') {
        allImages.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    }
}

// Filter Images
function filterImages(searchTerm) {
    const galleryGrid = document.getElementById('galleryGrid');
    const items = galleryGrid.querySelectorAll('.gallery-item');

    items.forEach((item, index) => {
        const image = allImages[index];
        const searchText = `${image.model_id} ${image.background_id} ${formatDate(image.created_at)}`.toLowerCase();

        if (searchText.includes(searchTerm.toLowerCase())) {
            item.style.display = 'block';
        } else {
            item.style.display = 'none';
        }
    });
}

// This updateStats function is now at the bottom of the file to avoid duplication

// Open Modal
function openModal(index) {
    currentImage = allImages[index];
    const modal = document.getElementById('imageModal');
    const modalImage = document.getElementById('modalImage');
    const modalDate = document.getElementById('modalDate');
    const modalInfo = document.getElementById('modalInfo');

    modalImage.src = currentImage.generated_image_url;
    modalDate.textContent = formatDate(currentImage.created_at);

    modalInfo.innerHTML = `
        <div class="info-item">
            <span class="info-label">مدل:</span>
            <span class="info-value">${currentImage.model_id || 'نامشخص'}</span>
        </div>
        <div class="info-item">
            <span class="info-label">پس‌زمینه:</span>
            <span class="info-value">${currentImage.background_id || 'نامشخص'}</span>
        </div>
        <div class="info-item">
            <span class="info-label">تاریخ ساخت:</span>
            <span class="info-value">${formatFullDate(currentImage.created_at)}</span>
        </div>
    `;

    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    
    // نمایش نوتیفیکیشن راهنما
    setTimeout(() => {
        showNotification('💡 با کلیک روی دکمه "تولید کپشن اینستاگرام" می‌توانید کپشن حرفه‌ای بسازید', 'info');
    }, 800);
}

// Close Modal
function closeModal() {
    const modal = document.getElementById('imageModal');
    const captionSection = document.getElementById('captionSection');

    modal.style.display = 'none';
    captionSection.style.display = 'none';
    document.body.style.overflow = 'auto';

    // Reset caption section
    document.getElementById('productForm').style.display = 'block';
    document.getElementById('captionLoading').style.display = 'none';
    document.getElementById('captionResult').style.display = 'none';
}

// Generate Instagram Caption
function generateInstagramCaption() {
    const captionSection = document.getElementById('captionSection');
    const productForm = document.getElementById('productForm');

    captionSection.style.display = 'block';
    productForm.style.display = 'block';

    // Smooth scroll to form
    setTimeout(() => {
        captionSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 100);
}

// Close Product Form
function closeProductForm() {
    const captionSection = document.getElementById('captionSection');
    captionSection.style.display = 'none';

    // Reset form
    document.getElementById('productName').value = '';
    document.getElementById('productPrice').value = '';
    document.getElementById('productDiscount').value = '';
    document.getElementById('productCategory').value = '';
    document.getElementById('productDescription').value = '';
    document.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = false);
}

// Submit Product Info
async function submitProductInfo() {
    const productName = document.getElementById('productName').value;
    const productPrice = document.getElementById('productPrice').value;
    const productDiscount = document.getElementById('productDiscount').value;
    const productCategory = document.getElementById('productCategory').value;
    const productDescription = document.getElementById('productDescription').value;

    const selectedColors = Array.from(document.querySelectorAll('input[name="color"]:checked'))
        .map(cb => cb.value);
    const selectedSizes = Array.from(document.querySelectorAll('input[name="size"]:checked'))
        .map(cb => cb.value);

    // Validation
    if (!productName) {
        alert('لطفاً نام محصول را وارد کنید');
        return;
    }

    if (selectedColors.length === 0) {
        alert('لطفاً حداقل یک رنگ را انتخاب کنید');
        return;
    }

    if (selectedSizes.length === 0) {
        alert('لطفاً حداقل یک سایز را انتخاب کنید');
        return;
    }

    // Show loading
    document.getElementById('productForm').style.display = 'none';
    document.getElementById('captionLoading').style.display = 'block';

    console.log('📝 درخواست تولید کپشن با اطلاعات محصول:', {
        productName,
        selectedColors,
        selectedSizes,
        productPrice,
        productDiscount
    });

    try {
        // Calculate final price if discount exists
        let finalPrice = productPrice;
        if (productDiscount && productDiscount > 0) {
            finalPrice = productPrice * (1 - productDiscount / 100);
        }

        // Call backend API to generate caption with AI
        const response = await fetch('/api/generate-caption', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                imageUrl: currentImage.generated_image_url,
                imageId: currentImage.id,
                productInfo: {
                    name: productName,
                    colors: selectedColors,
                    sizes: selectedSizes,
                    price: productPrice,
                    discount: productDiscount || 0,
                    finalPrice: finalPrice,
                    category: productCategory,
                    description: productDescription
                }
            })
        });

        const data = await response.json();

        if (data.success) {
            // Show result
            document.getElementById('captionLoading').style.display = 'none';
            document.getElementById('captionResult').style.display = 'block';
            document.getElementById('captionText').textContent = data.caption;
            console.log('✅ کپشن تولید شد');
        } else {
            throw new Error(data.error || 'خطا در تولید کپشن');
        }
    } catch (error) {
        console.error('Error generating caption:', error);
        alert('خطا در تولید کپشن. لطفاً دوباره تلاش کنید.');
        document.getElementById('captionLoading').style.display = 'none';
        document.getElementById('productForm').style.display = 'block';
    }
}

// Copy Caption
function copyCaption() {
    const captionText = document.getElementById('captionText').textContent;

    navigator.clipboard.writeText(captionText).then(() => {
        showNotification('کپشن کپی شد', 'success');
    }).catch(err => {
        console.error('Error copying caption:', err);
        showNotification('خطا در کپی کردن', 'error');
    });
}

// Share to Instagram
function shareToInstagram() {
    if (navigator.share) {
        navigator.share({
            title: 'کپشن اینستاگرام',
            text: document.getElementById('captionText').textContent
        }).catch(err => {
            console.error('Error sharing:', err);
        });
    } else {
        copyCaption();
        showNotification('کپشن کپی شد. می‌توانید در اینستاگرام پیست کنید', 'success');
    }
}

// Edit Caption
function editCaption() {
    const captionText = document.getElementById('captionText');
    captionText.contentEditable = true;
    captionText.focus();
    captionText.style.border = '2px dashed var(--primary)';

    showNotification('می‌توانید کپشن را ویرایش کنید', 'info');
}

// Generate Product Description for Website
function generateProductDescription() {
    const descriptionSection = document.getElementById('descriptionSection');
    const descriptionProductForm = document.getElementById('descriptionProductForm');

    descriptionSection.style.display = 'block';
    descriptionProductForm.style.display = 'block';

    // Smooth scroll to form
    setTimeout(() => {
        descriptionSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 100);
}

// Close Product Description Form
function closeDescriptionForm() {
    const descriptionSection = document.getElementById('descriptionSection');
    descriptionSection.style.display = 'none';

    // Reset form
    document.getElementById('descProductName').value = '';
    document.getElementById('descProductPrice').value = '';
    document.getElementById('descProductDiscount').value = '';
    document.getElementById('descProductCategory').value = '';
    document.getElementById('descFabricType').value = '';
    document.getElementById('descProductDescription').value = '';
    document.querySelectorAll('input[name="desc-color"]').forEach(cb => cb.checked = false);
    document.querySelectorAll('input[name="desc-size"]').forEach(cb => cb.checked = false);
}

// Submit Product Description Request
async function submitProductDescription() {
    const productName = document.getElementById('descProductName').value;
    const productPrice = document.getElementById('descProductPrice').value;
    const productDiscount = document.getElementById('descProductDiscount').value;
    const productCategory = document.getElementById('descProductCategory').value;
    const fabricType = document.getElementById('descFabricType').value;
    const productDescription = document.getElementById('descProductDescription').value;

    const selectedColors = Array.from(document.querySelectorAll('input[name="desc-color"]:checked'))
        .map(cb => cb.value);
    const selectedSizes = Array.from(document.querySelectorAll('input[name="desc-size"]:checked'))
        .map(cb => cb.value);

    // Validation
    if (!productName) {
        alert('لطفاً نام محصول را وارد کنید');
        return;
    }

    if (selectedColors.length === 0) {
        alert('لطفاً حداقل یک رنگ را انتخاب کنید');
        return;
    }

    if (selectedSizes.length === 0) {
        alert('لطفاً حداقل یک سایز را انتخاب کنید');
        return;
    }

    // Show loading
    document.getElementById('descriptionProductForm').style.display = 'none';
    document.getElementById('descriptionLoading').style.display = 'block';

    console.log('📝 درخواست تولید توضیحات محصول:', {
        productName,
        selectedColors,
        selectedSizes,
        productPrice,
        productDiscount,
        fabricType
    });

    try {
        // Calculate final price if discount exists
        let finalPrice = productPrice;
        if (productDiscount && productDiscount > 0) {
            finalPrice = productPrice * (1 - productDiscount / 100);
        }

        // Call backend API to generate product description
        const response = await fetch('/api/generate-product-description', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                imageUrl: currentImage.generated_image_url,
                imageId: currentImage.id,
                productInfo: {
                    name: productName,
                    colors: selectedColors,
                    sizes: selectedSizes,
                    price: productPrice,
                    discount: productDiscount || 0,
                    finalPrice: finalPrice,
                    category: productCategory,
                    fabricType: fabricType,
                    description: productDescription
                }
            })
        });

        const data = await response.json();

        if (data.success) {
            // Show result
            document.getElementById('descriptionLoading').style.display = 'none';
            document.getElementById('descriptionResult').style.display = 'block';
            document.getElementById('descriptionText').textContent = data.description;
            console.log('✅ توضیحات محصول تولید شد');
        } else {
            throw new Error(data.error || 'خطا در تولید توضیحات');
        }
    } catch (error) {
        console.error('Error generating description:', error);
        alert('خطا در تولید توضیحات. لطفاً دوباره تلاش کنید.');
        document.getElementById('descriptionLoading').style.display = 'none';
        document.getElementById('descriptionProductForm').style.display = 'block';
    }
}

// Copy Product Description
function copyDescription() {
    const descriptionText = document.getElementById('descriptionText').textContent;

    navigator.clipboard.writeText(descriptionText).then(() => {
        showNotification('توضیحات کپی شد', 'success');
    }).catch(err => {
        console.error('Error copying description:', err);
        showNotification('خطا در کپی کردن', 'error');
    });
}

// Download Product Description as File
function downloadDescription() {
    const descriptionText = document.getElementById('descriptionText').textContent;
    const blob = new Blob([descriptionText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `product-description-${Date.now()}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    showNotification('فایل دانلود شد', 'success');
}

// Edit Description
function editDescription() {
    const descriptionText = document.getElementById('descriptionText');
    descriptionText.contentEditable = true;
    descriptionText.focus();
    descriptionText.style.border = '2px dashed var(--primary)';

    showNotification('می‌توانید توضیحات را ویرایش کنید', 'info');
}

// Download Image
function downloadImage() {
    if (!currentImage) return;

    const link = document.createElement('a');
    link.href = currentImage.generated_image_url;
    link.download = `AI-Fashion-${Date.now()}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showNotification('دانلود شروع شد', 'success');
}

// Share Image
function shareImage() {
    if (!currentImage) return;

    if (navigator.share) {
        fetch(currentImage.generated_image_url)
            .then(res => res.blob())
            .then(blob => {
                const file = new File([blob], 'image.jpg', { type: 'image/jpeg' });
                return navigator.share({
                    files: [file],
                    title: 'تصویر تولید شده با هوش مصنوعی',
                    text: 'ساخته شده با استودیو AI'
                });
            })
            .catch(err => console.error('Error sharing:', err));
    } else {
        showNotification('مرورگر شما از اشتراک‌گذاری پشتیبانی نمی‌کند', 'error');
    }
}

// Delete Image
function deleteImage() {
    const deleteModal = document.getElementById('deleteModal');
    deleteModal.style.display = 'flex';
}

// Close Delete Modal
function closeDeleteModal() {
    const deleteModal = document.getElementById('deleteModal');
    deleteModal.style.display = 'none';
}

// Confirm Delete
async function confirmDelete() {
    if (!currentImage) return;

    try {
        // Get auth token
        const token = localStorage.getItem('supabase_token');
        if (!token) {
            showNotification('لطفاً ابتدا وارد حساب کاربری خود شوید', 'error');
            return;
        }

        // Use backend API to delete (ensures user can only delete their own images)
        const response = await fetch(`/api/generations/${currentImage.id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const result = await response.json();

        if (!result.success) {
            throw new Error(result.error || 'خطا در حذف تصویر');
        }

        showNotification('تصویر با موفقیت حذف شد', 'success');
        closeDeleteModal();
        closeModal();

        // Reload images
        await loadImages();
    } catch (error) {
        console.error('Error deleting image:', error);
        showNotification('خطا در حذف تصویر', 'error');
    }
}

// Regenerate Image
function regenerateImage() {
    if (!currentImage) return;

    // Store current settings in localStorage
    localStorage.setItem('regenerateSettings', JSON.stringify({
        model_id: currentImage.model_id,
        background_id: currentImage.background_id,
        garment_path: currentImage.garment_path
    }));

    // Redirect to main page
    window.location.href = '/index.html?regenerate=true';
}

// Show Notification
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            ${type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️'}
            <span>${message}</span>
        </div>
    `;

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.classList.add('show');
    }, 10);

    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 3000);
}

// Format Date
function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (hours < 1) return 'چند لحظه پیش';
    if (hours < 24) return `${hours} ساعت پیش`;
    if (days < 7) return `${days} روز پیش`;

    return date.toLocaleDateString('fa-IR');
}

// Format Full Date
function formatFullDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('fa-IR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Add notification styles
const style = document.createElement('style');
style.textContent = `
    .notification {
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%) translateY(-100px);
        background: white;
        padding: 16px 24px;
        border-radius: 12px;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
        z-index: 9999;
        opacity: 0;
        transition: all 0.3s ease;
    }

    .notification.show {
        opacity: 1;
        transform: translateX(-50%) translateY(0);
    }

    .notification-content {
        display: flex;
        align-items: center;
        gap: 10px;
        font-size: 15px;
        font-weight: 600;
    }

    .notification-success {
        border-right: 4px solid #2ecc71;
    }

    .notification-error {
        border-right: 4px solid #ff4757;
    }

    .notification-info {
        border-right: 4px solid #667eea;
    }

    @keyframes fadeInUp {
        from {
            opacity: 0;
            transform: translateY(20px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }

    .error-state {
        text-align: center;
        padding: 40px 20px;
    }

    .error-state h3 {
        color: #ff4757;
        margin: 20px 0 10px;
        font-size: 24px;
    }

    .error-state p {
        color: #718096;
        margin-bottom: 24px;
    }

    /* Pagination Styles */
    .pagination-btn {
        padding: 10px 16px;
        border: 2px solid #e2e8f0;
        background: white;
        color: #4a5568;
        border-radius: 8px;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s ease;
        font-family: 'Vazirmatn', sans-serif;
    }

    .pagination-btn:hover:not(.disabled) {
        border-color: #667eea;
        background: #f7fafc;
        color: #667eea;
        transform: translateY(-2px);
    }

    .pagination-btn.active {
        background: linear-gradient(135deg, #667eea, #764ba2);
        color: white;
        border-color: transparent;
        box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
    }

    .pagination-btn.disabled {
        opacity: 0.5;
        cursor: not-allowed;
        background: #f7fafc;
    }

    .pagination-dots {
        padding: 10px 8px;
        color: #a0aec0;
        font-weight: bold;
    }
`;
document.head.appendChild(style);

// Render Pagination Controls
function renderPagination() {
    const paginationContainer = document.getElementById('paginationContainer');

    if (!paginationContainer) {
        console.warn('Pagination container not found');
        return;
    }

    if (totalPages <= 1) {
        paginationContainer.style.display = 'none';
        return;
    }

    paginationContainer.style.display = 'flex';

    // Calculate page range to show
    const maxPagesToShow = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxPagesToShow / 2));
    let endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);

    // Adjust if we're at the end
    if (endPage - startPage + 1 < maxPagesToShow) {
        startPage = Math.max(1, endPage - maxPagesToShow + 1);
    }

    let paginationHTML = '';

    // Previous button
    paginationHTML += `
        <button class="pagination-btn ${currentPage === 1 ? 'disabled' : ''}"
                onclick="goToPage(${currentPage - 1})"
                ${currentPage === 1 ? 'disabled' : ''}>
            « قبلی
        </button>
    `;

    // First page
    if (startPage > 1) {
        paginationHTML += `
            <button class="pagination-btn" onclick="goToPage(1)">1</button>
        `;
        if (startPage > 2) {
            paginationHTML += `<span class="pagination-dots">...</span>`;
        }
    }

    // Page numbers
    for (let i = startPage; i <= endPage; i++) {
        paginationHTML += `
            <button class="pagination-btn ${i === currentPage ? 'active' : ''}"
                    onclick="goToPage(${i})">
                ${i.toLocaleString('fa-IR')}
            </button>
        `;
    }

    // Last page
    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            paginationHTML += `<span class="pagination-dots">...</span>`;
        }
        paginationHTML += `
            <button class="pagination-btn" onclick="goToPage(${totalPages})">
                ${totalPages.toLocaleString('fa-IR')}
            </button>
        `;
    }

    // Next button
    paginationHTML += `
        <button class="pagination-btn ${currentPage === totalPages ? 'disabled' : ''}"
                onclick="goToPage(${currentPage + 1})"
                ${currentPage === totalPages ? 'disabled' : ''}>
            بعدی »
        </button>
    `;

    paginationContainer.innerHTML = paginationHTML;
}

// Go to specific page
function goToPage(page) {
    if (page < 1 || page > totalPages || page === currentPage) return;

    currentPage = page;
    loadImages();

    // Scroll to top of gallery
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Update Stats to use totalCount
function updateStats() {
    const displayCount = totalCount > 0 ? totalCount : allImages.length;

    // Update total count
    document.getElementById('totalImagesCount').textContent = displayCount.toLocaleString('fa-IR');

    // Calculate today and this month counts from current page images (approximation)
    const today = new Date();
    const todayCount = allImages.filter(img => {
        const imgDate = new Date(img.created_at);
        return imgDate.toDateString() === today.toDateString();
    }).length;

    const thisMonth = today.getMonth();
    const thisYear = today.getFullYear();
    const thisMonthCount = allImages.filter(img => {
        const imgDate = new Date(img.created_at);
        return imgDate.getMonth() === thisMonth && imgDate.getFullYear() === thisYear;
    }).length;

    // Update stats (note: monthly/daily are approximate from current page)
    const monthElement = document.getElementById('thisMonthCount');
    const todayElement = document.getElementById('todayCount');

    if (monthElement) monthElement.textContent = thisMonthCount.toLocaleString('fa-IR');
    if (todayElement) todayElement.textContent = todayCount.toLocaleString('fa-IR');

    // Show pagination info
    const startIndex = (currentPage - 1) * itemsPerPage + 1;
    const endIndex = Math.min(currentPage * itemsPerPage, totalCount);

    if (totalCount > itemsPerPage) {
        const paginationInfo = document.getElementById('paginationInfo');
        if (paginationInfo) {
            paginationInfo.textContent = `نمایش ${startIndex.toLocaleString('fa-IR')} - ${endIndex.toLocaleString('fa-IR')} از ${totalCount.toLocaleString('fa-IR')}`;
            paginationInfo.style.display = 'block';
        }
    }
}

console.log('🎨 صفحه گالری آماده است!');
console.log('✨ تمام قابلیت‌های تعاملی فعال شدند!');
