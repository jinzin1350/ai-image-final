// Language Switcher System
// Handles language switching with localStorage persistence

(function() {
    // Get current language from localStorage or default to Persian
    let currentLang = localStorage.getItem('siteLang') || 'fa';

    // Set language
    window.setLanguage = function(lang) {
        currentLang = lang;
        localStorage.setItem('siteLang', lang);
        document.documentElement.setAttribute('lang', lang);
        document.body.setAttribute('data-lang', lang);

        // Update all translatable elements
        updateTranslations();

        // Update toggle button state
        updateToggleButton();

        // Update direction for RTL/LTR
        document.documentElement.dir = lang === 'fa' ? 'rtl' : 'ltr';
    };

    // Get current language
    window.getCurrentLanguage = function() {
        return currentLang;
    };

    // Update all elements with translation attributes
    function updateTranslations() {
        const elements = document.querySelectorAll('[data-lang-fa][data-lang-en]');
        elements.forEach(el => {
            const text = el.getAttribute(`data-lang-${currentLang}`);
            if (text) {
                // Check if it's an input placeholder
                if (el.hasAttribute('data-translate-placeholder')) {
                    el.placeholder = text;
                } else if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
                    el.placeholder = text;
                } else {
                    el.textContent = text;
                }
            }
        });

        // Handle elements with data-translate-title
        const titleElements = document.querySelectorAll('[data-title-fa][data-title-en]');
        titleElements.forEach(el => {
            const title = el.getAttribute(`data-title-${currentLang}`);
            if (title) {
                el.title = title;
            }
        });
    }

    // Update toggle button appearance
    function updateToggleButton() {
        const toggle = document.getElementById('langToggle');
        if (toggle) {
            if (currentLang === 'en') {
                toggle.classList.add('active');
            } else {
                toggle.classList.remove('active');
            }
        }

        // Update flag emoji
        const flagElement = document.querySelector('.lang-flag');
        if (flagElement) {
            flagElement.textContent = currentLang === 'fa' ? '🇮🇷' : '🇬🇧';
        }
    }

    // Toggle language
    window.toggleLanguage = function() {
        const newLang = currentLang === 'fa' ? 'en' : 'fa';
        setLanguage(newLang);
    };

    // Initialize on page load
    window.addEventListener('DOMContentLoaded', function() {
        setLanguage(currentLang);
    });
})();
