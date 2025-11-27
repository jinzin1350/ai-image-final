// Admin Common JavaScript
// Authentication & API helpers

// Check authentication
function checkAuth() {
    const adminEmail = sessionStorage.getItem('adminEmail');
    const adminPassword = sessionStorage.getItem('adminPassword');

    if (!adminEmail || !adminPassword) {
        window.location.href = '/admin';
        return false;
    }
    return true;
}

// Fetch with authentication headers
async function fetchWithAuth(url, options = {}) {
    const adminEmail = sessionStorage.getItem('adminEmail');
    const adminPassword = sessionStorage.getItem('adminPassword');

    if (!adminEmail || !adminPassword) {
        window.location.href = '/admin';
        throw new Error('Not authenticated');
    }

    const headers = {
        'admin-email': adminEmail,
        'admin-password': adminPassword,
        ...options.headers
    };

    // Only set Content-Type if not explicitly overridden and not FormData
    if (!options.headers || !options.headers.hasOwnProperty('Content-Type')) {
        // Check if body is FormData - if so, don't set Content-Type
        if (!(options.body instanceof FormData)) {
            headers['Content-Type'] = 'application/json';
        }
    }

    const response = await fetch(url, {
        ...options,
        headers
    });

    if (response.status === 401) {
        sessionStorage.clear();
        window.location.href = '/admin';
        throw new Error('Authentication failed');
    }

    return response;
}

// Logout handler
function handleLogout() {
    if (confirm('Are you sure you want to logout?')) {
        sessionStorage.clear();
        window.location.href = '/admin';
    }
}

// Toggle sidebar (mobile)
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    sidebar.classList.toggle('open');

    // Handle overlay
    let overlay = document.querySelector('.sidebar-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.className = 'sidebar-overlay';
        overlay.addEventListener('click', closeSidebar);
        document.body.appendChild(overlay);
    }

    overlay.classList.toggle('active');
}

// Close sidebar
function closeSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.querySelector('.sidebar-overlay');

    if (sidebar) {
        sidebar.classList.remove('open');
    }
    if (overlay) {
        overlay.classList.remove('active');
    }
}

// Show notification
function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            ${type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️'}
            <span>${message}</span>
        </div>
    `;

    // Add to body
    document.body.appendChild(notification);

    // Show with animation
    setTimeout(() => {
        notification.classList.add('show');
    }, 10);

    // Remove after 4 seconds
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 4000);
}

// Add notification styles
const style = document.createElement('style');
style.textContent = `
    .notification {
        position: fixed;
        top: 20px;
        right: 20px;
        background: white;
        padding: 16px 24px;
        border-radius: 12px;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
        z-index: 9999;
        opacity: 0;
        transform: translateX(400px);
        transition: all 0.3s ease;
        min-width: 300px;
    }

    .notification.show {
        opacity: 1;
        transform: translateX(0);
    }

    .notification-content {
        display: flex;
        align-items: center;
        gap: 12px;
        font-size: 14px;
        font-weight: 600;
    }

    .notification-success {
        border-left: 4px solid #10b981;
    }

    .notification-error {
        border-left: 4px solid #ef4444;
    }

    .notification-info {
        border-left: 4px solid #3b82f6;
    }
`;
document.head.appendChild(style);

// Initialize authentication check on page load
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
});

// Close sidebar on outside click (mobile)
document.addEventListener('click', (e) => {
    const sidebar = document.getElementById('sidebar');
    const mobileBtn = document.querySelector('.mobile-menu-btn');

    if (sidebar && sidebar.classList.contains('open')) {
        // Don't close if clicking inside sidebar or on toggle buttons
        if (!sidebar.contains(e.target) &&
            !mobileBtn?.contains(e.target)) {
            closeSidebar();
        }
    }
});

// Close sidebar when clicking nav links (mobile)
document.addEventListener('DOMContentLoaded', () => {
    const navLinks = document.querySelectorAll('.nav-item');
    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            if (window.innerWidth <= 1024) {
                closeSidebar();
            }
        });
    });
});
