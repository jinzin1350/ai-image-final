// Mobile Menu Toggle Function
function toggleMobileMenu() {
    const toggle = document.getElementById('mobileMenuToggle');
    const overlay = document.getElementById('mobileNavOverlay');
    const menu = document.getElementById('mobileNavMenu');

    toggle.classList.toggle('active');
    overlay.classList.toggle('active');
    menu.classList.toggle('active');

    // Prevent body scroll when menu is open
    if (menu.classList.contains('active')) {
        document.body.style.overflow = 'hidden';
    } else {
        document.body.style.overflow = '';
    }
}

// Close menu when clicking on a link (except logout button)
document.addEventListener('DOMContentLoaded', () => {
    const menuLinks = document.querySelectorAll('.mobile-nav-menu a');
    menuLinks.forEach(link => {
        link.addEventListener('click', () => {
            toggleMobileMenu();
        });
    });
});
