// Shared Admin Menu Component
// This ensures all admin pages have the same consistent menu

function renderAdminMenu(activePage) {
    const menuHTML = `
        <nav class="sidebar-nav">
            <div class="nav-section">
                <div class="nav-section-title">Main</div>
                <a href="/admin/dashboard" class="nav-item ${activePage === 'dashboard' ? 'active' : ''}">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="3" y="3" width="7" height="7"/>
                        <rect x="14" y="3" width="7" height="7"/>
                        <rect x="14" y="14" width="7" height="7"/>
                        <rect x="3" y="14" width="7" height="7"/>
                    </svg>
                    <span>Dashboard</span>
                </a>
                <a href="/admin/users" class="nav-item ${activePage === 'users' ? 'active' : ''}">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                        <circle cx="9" cy="7" r="4"/>
                        <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
                    </svg>
                    <span>Users</span>
                </a>
                <a href="/admin/tier-settings" class="nav-item ${activePage === 'tier-settings' ? 'active' : ''}">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M12 2l2 7h7l-5.5 4 2 7L12 16l-5.5 4 2-7L3 9h7z"/>
                    </svg>
                    <span>Tier Settings</span>
                </a>
                <a href="/admin/service-permissions" class="nav-item ${activePage === 'service-permissions' ? 'active' : ''}">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="5" y="11" width="14" height="10" rx="2" ry="2"/>
                        <circle cx="12" cy="16" r="1"/>
                        <path d="M8 11V7a4 4 0 0 1 8 0v4"/>
                    </svg>
                    <span>Service Permissions</span>
                </a>
                <a href="/admin/pricing" class="nav-item ${activePage === 'pricing' ? 'active' : ''}">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="12" y1="1" x2="12" y2="23"/>
                        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                    </svg>
                    <span>Pricing</span>
                </a>
                <a href="/admin/analytics" class="nav-item ${activePage === 'analytics' ? 'active' : ''}">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="12" y1="20" x2="12" y2="10"/>
                        <line x1="18" y1="20" x2="18" y2="4"/>
                        <line x1="6" y1="20" x2="6" y2="16"/>
                    </svg>
                    <span>Analytics</span>
                </a>
            </div>

            <div class="nav-section">
                <div class="nav-section-title">Content</div>
                <a href="/admin/content" class="nav-item ${activePage === 'content' ? 'active' : ''}">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="3" y="3" width="18" height="18" rx="2"/>
                        <circle cx="8.5" cy="8.5" r="1.5"/>
                        <path d="m21 15-5-5L5 21"/>
                    </svg>
                    <span>Content Library</span>
                </a>
                <a href="/admin/user-content" class="nav-item ${activePage === 'user-content' ? 'active' : ''}">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                        <polyline points="9 22 9 12 15 12 15 22"/>
                    </svg>
                    <span>User Content</span>
                </a>
            </div>

            <div class="nav-section">
                <div class="nav-section-title">AI Studios</div>
                <a href="/admin/model-studio" class="nav-item ${activePage === 'model-studio' ? 'active' : ''}">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                        <circle cx="12" cy="7" r="4"/>
                    </svg>
                    <span>Model Studio</span>
                </a>
                <a href="/admin/background-studio" class="nav-item ${activePage === 'background-studio' ? 'active' : ''}">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                        <line x1="3" y1="9" x2="21" y2="9"/>
                        <line x1="9" y1="21" x2="9" y2="9"/>
                    </svg>
                    <span>Background Studio</span>
                </a>
            </div>
        </nav>
    `;

    return menuHTML;
}

// Auto-initialize menu if sidebar-nav container exists
document.addEventListener('DOMContentLoaded', function() {
    const sidebarNavContainer = document.querySelector('.sidebar-nav-container');
    if (sidebarNavContainer) {
        const activePage = sidebarNavContainer.getAttribute('data-active-page') || '';
        sidebarNavContainer.innerHTML = renderAdminMenu(activePage);
    }
});
