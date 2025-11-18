// Mobile Navigation Menu Handler
(function() {
    'use strict';

    // Create mobile menu elements
    function createMobileMenu() {
        // Check if already created
        if (document.getElementById('mobileMenuBtn')) return;

        // Create hamburger button
        const menuBtn = document.createElement('button');
        menuBtn.id = 'mobileMenuBtn';
        menuBtn.className = 'mobile-menu-btn';
        menuBtn.innerHTML = '<span></span><span></span><span></span>';
        menuBtn.setAttribute('aria-label', 'Toggle menu');

        // Create overlay
        const overlay = document.createElement('div');
        overlay.id = 'mobileNavOverlay';
        overlay.className = 'mobile-nav-overlay';

        // Create menu
        const menu = document.createElement('nav');
        menu.id = 'mobileNavMenu';
        menu.className = 'mobile-nav-menu';
        menu.innerHTML = `
            <a href="/index.html" class="nav-link" style="background: #6b7280;">
                <span>🏠</span>
                <span>بازگشت به خدمات</span>
            </a>
            <a href="/profile.html" class="nav-link" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
                <span>👤</span>
                <span>پروفایل من</span>
            </a>
            <a href="/gallery.html" class="nav-link" style="background: #3b82f6;">
                <span>🖼️</span>
                <span>گالری تصاویر من</span>
            </a>
            <button onclick="handleLogout()" class="nav-link" style="background: #ef4444;">
                <span>🚪</span>
                <span>خروج</span>
            </button>
        `;

        // Add to DOM
        document.body.insertBefore(menuBtn, document.body.firstChild);
        document.body.insertBefore(overlay, document.body.firstChild);
        document.body.insertBefore(menu, document.body.firstChild);

        // Add event listeners
        menuBtn.addEventListener('click', toggleMenu);
        overlay.addEventListener('click', closeMenu);

        // Close menu when clicking on links
        menu.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', closeMenu);
        });
    }

    function toggleMenu() {
        const btn = document.getElementById('mobileMenuBtn');
        const overlay = document.getElementById('mobileNavOverlay');
        const menu = document.getElementById('mobileNavMenu');

        const isActive = btn.classList.contains('active');

        if (isActive) {
            closeMenu();
        } else {
            btn.classList.add('active');
            overlay.classList.add('active');
            menu.classList.add('active');
            document.body.style.overflow = 'hidden';
        }
    }

    function closeMenu() {
        const btn = document.getElementById('mobileMenuBtn');
        const overlay = document.getElementById('mobileNavOverlay');
        const menu = document.getElementById('mobileNavMenu');

        btn.classList.remove('active');
        overlay.classList.remove('active');
        menu.classList.remove('active');
        document.body.style.overflow = '';
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', createMobileMenu);
    } else {
        createMobileMenu();
    }

    // Make toggleMenu available globally if needed
    window.toggleMobileMenu = toggleMenu;
})();
