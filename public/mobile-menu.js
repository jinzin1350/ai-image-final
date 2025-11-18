// Professional Hamburger Menu - Auto-init
(function() {
    'use strict';

    function initMobileMenu() {
        // Create hamburger button
        const hamburger = document.createElement('button');
        hamburger.className = 'hamburger-menu';
        hamburger.setAttribute('aria-label', 'منو');
        hamburger.setAttribute('aria-expanded', 'false');
        hamburger.innerHTML = `
            <div class="hamburger-icon">
                <span></span>
                <span></span>
                <span></span>
                <span></span>
            </div>
        `;

        // Create overlay
        const overlay = document.createElement('div');
        overlay.className = 'mobile-nav-overlay';

        // Create navigation menu
        const nav = document.createElement('nav');
        nav.className = 'mobile-nav';
        nav.setAttribute('aria-label', 'منوی اصلی');
        nav.innerHTML = `
            <div class="mobile-nav-header">
                <h2>منو</h2>
            </div>
            <div class="mobile-nav-links">
                <a href="/index.html" class="mobile-nav-link home">
                    <span class="icon">🏠</span>
                    <span>بازگشت به خدمات</span>
                </a>
                <a href="/profile.html" class="mobile-nav-link profile">
                    <span class="icon">👤</span>
                    <span>پروفایل من</span>
                </a>
                <a href="/gallery.html" class="mobile-nav-link gallery">
                    <span class="icon">🖼️</span>
                    <span>گالری تصاویر من</span>
                </a>
                <button onclick="handleLogout()" class="mobile-nav-link logout">
                    <span class="icon">🚪</span>
                    <span>خروج</span>
                </button>
            </div>
        `;

        // Add to DOM
        document.body.appendChild(hamburger);
        document.body.appendChild(overlay);
        document.body.appendChild(nav);

        // Toggle menu function
        function toggleMenu() {
            const isOpen = hamburger.classList.contains('open');

            if (isOpen) {
                closeMenu();
            } else {
                openMenu();
            }
        }

        function openMenu() {
            hamburger.classList.add('open');
            overlay.classList.add('active');
            nav.classList.add('active');
            hamburger.setAttribute('aria-expanded', 'true');
            document.body.style.overflow = 'hidden';
        }

        function closeMenu() {
            hamburger.classList.remove('open');
            overlay.classList.remove('active');
            nav.classList.remove('active');
            hamburger.setAttribute('aria-expanded', 'false');
            document.body.style.overflow = '';
        }

        // Event listeners
        hamburger.addEventListener('click', toggleMenu);
        overlay.addEventListener('click', closeMenu);

        // Close menu when clicking on links
        const links = nav.querySelectorAll('a');
        links.forEach(link => {
            link.addEventListener('click', closeMenu);
        });

        // Close menu on escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && hamburger.classList.contains('open')) {
                closeMenu();
            }
        });

        // Prevent scroll when menu is open
        let touchStartY = 0;
        nav.addEventListener('touchstart', (e) => {
            touchStartY = e.touches[0].clientY;
        });

        nav.addEventListener('touchmove', (e) => {
            const touchY = e.touches[0].clientY;
            const touchDiff = touchY - touchStartY;
            const isAtTop = nav.scrollTop === 0;
            const isAtBottom = nav.scrollTop + nav.offsetHeight >= nav.scrollHeight;

            if ((isAtTop && touchDiff > 0) || (isAtBottom && touchDiff < 0)) {
                e.preventDefault();
            }
        }, { passive: false });
    }

    // Initialize on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initMobileMenu);
    } else {
        initMobileMenu();
    }

    // Add scroll effect to header
    function handleHeaderScroll() {
        const header = document.querySelector('header');
        if (!header) return;

        if (window.scrollY > 10) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
    }

    window.addEventListener('scroll', handleHeaderScroll);
    handleHeaderScroll(); // Check on load
})();
