/**
 * Service Permission Checker & Upgrade Modal
 * This script checks if user has access to a service and shows upgrade modal if not
 */

// Service metadata
const SERVICE_INFO = {
    'complete-outfit': {
        icon: '👗',
        name: 'عکاسی استایل کامل',
        nameEn: 'Complete Outfit Photography'
    },
    'accessories-only': {
        icon: '👜',
        name: 'عکاسی اکسسوری محصول',
        nameEn: 'Accessories Photography'
    },
    'color-collection': {
        icon: '🎨',
        name: 'نمایش کالکشن رنگی',
        nameEn: 'Color Collection Display'
    },
    'flat-lay': {
        icon: '📸',
        name: 'عکاسی Flat Lay حرفه‌ای',
        nameEn: 'Professional Flat Lay'
    },
    'scene-recreation': {
        icon: '🎬',
        name: 'الهام از عکس مرجع',
        nameEn: 'Scene Recreation'
    },
    'style-transfer': {
        icon: '🎨',
        name: 'انتقال استایل',
        nameEn: 'Style Transfer'
    },
    'mirror-creation': {
        icon: '🪞',
        name: 'کپی استایل عکس رقیب',
        nameEn: 'Mirror Creation (Competitor Photo Copy)'
    }
};

let TIER_INFO = {
    'testlimit': {
        icon: '🧪',
        name: 'آزمایشی',
        nameEn: 'Test Limit',
        credits: 0, // Will be loaded from database
        price: 0,
        color: '#3b82f6'
    },
    'bronze': {
        icon: '🥉',
        name: 'برنز',
        nameEn: 'Bronze',
        credits: 0, // Will be loaded from database
        price: 0, // Will be loaded from database
        color: '#f59e0b'
    },
    'silver': {
        icon: '🥈',
        name: 'نقره‌ای',
        nameEn: 'Silver',
        credits: 0, // Will be loaded from database
        price: 0, // Will be loaded from database
        color: '#6b7280'
    },
    'gold': {
        icon: '🥇',
        name: 'طلایی',
        nameEn: 'Gold',
        credits: 0, // Will be loaded from database
        price: 0, // Will be loaded from database
        color: '#eab308'
    }
};

// Load pricing from database
async function loadPricingData() {
    try {
        const response = await fetch('/api/pricing');
        const data = await response.json();

        if (data.success && data.pricing) {
            // Update TIER_INFO with database values
            data.pricing.forEach(item => {
                if (TIER_INFO[item.tier]) {
                    TIER_INFO[item.tier].price = item.price;
                    TIER_INFO[item.tier].credits = item.credits;
                    TIER_INFO[item.tier].discount_percentage = item.discount_percentage || 0;
                    TIER_INFO[item.tier].discount_active = item.discount_active || false;
                }
            });
        }
    } catch (error) {
        console.error('Error loading pricing data:', error);
        // Keep default values if fetch fails
    }
}

// Load pricing on page load
loadPricingData();

/**
 * Check if user has access to current service
 * @param {string} serviceKey - The service identifier (e.g., 'complete-outfit')
 * @returns {Promise<Object>} - Access information
 */
async function checkServiceAccess(serviceKey) {
    try {
        console.log('🔍 checkServiceAccess called for:', serviceKey);

        const token = localStorage.getItem('supabase_token');
        if (!token) {
            console.log('❌ No token found - redirecting to auth');
            window.location.href = '/auth';
            return { hasAccess: false };
        }

        console.log('✅ Token found, making API request to:', `/api/check-service-access/${serviceKey}`);

        const response = await fetch(`/api/check-service-access/${serviceKey}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        console.log('📡 API Response status:', response.status);

        if (response.status === 401) {
            console.log('❌ Unauthorized - clearing tokens and redirecting');
            localStorage.removeItem('supabase_token');
            localStorage.removeItem('supabase_session');
            window.location.href = '/auth';
            return { hasAccess: false };
        }

        const data = await response.json();
        console.log('📦 API Response data:', data);

        if (data.success) {
            console.log('✅ Access check result:', {
                hasAccess: data.hasAccess,
                userTier: data.userTier,
                serviceKey: data.serviceKey,
                requiredTiers: data.requiredTiers
            });
            return data;
        } else {
            console.error('❌ API returned error:', data.error);
            throw new Error(data.error || 'Failed to check access');
        }
    } catch (error) {
        console.error('❌ Error checking service access:', error);
        return { hasAccess: false, error: error.message };
    }
}

/**
 * Show upgrade modal
 * @param {Object} accessInfo - Information about access permissions
 * @param {string} serviceKey - The service key
 */
function showUpgradeModal(accessInfo, serviceKey) {
    const { userTier, requiredTiers } = accessInfo;
    const service = SERVICE_INFO[serviceKey] || {};
    const currentTierInfo = TIER_INFO[userTier] || TIER_INFO['testlimit'];

    // Find the lowest tier that has access AND is higher than user's current tier
    const tierOrder = ['testlimit', 'bronze', 'silver', 'gold'];
    const currentTierIndex = tierOrder.indexOf(userTier);

    // Filter required tiers to only those higher than current tier
    const higherTiers = requiredTiers.filter(tier => {
        const tierIndex = tierOrder.indexOf(tier);
        return tierIndex > currentTierIndex;
    });

    // Find the lowest tier from the higher tiers
    let suggestedTier = 'gold'; // Default to gold if nothing found
    if (higherTiers.length > 0) {
        // Sort by tier order and get the first (lowest)
        higherTiers.sort((a, b) => tierOrder.indexOf(a) - tierOrder.indexOf(b));
        suggestedTier = higherTiers[0];
    }

    const suggestedTierInfo = TIER_INFO[suggestedTier];

    // Create modal HTML
    const modalHTML = `
        <div id="upgradeModal" class="upgrade-modal" style="
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.7);
            backdrop-filter: blur(4px);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
            animation: fadeIn 0.3s ease;
        ">
            <div class="upgrade-modal-content" style="
                background: white;
                border-radius: 24px;
                padding: 48px 40px;
                max-width: 500px;
                width: 90%;
                box-shadow: 0 25px 80px rgba(0, 0, 0, 0.3);
                animation: slideUp 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                text-align: center;
            ">
                <!-- Lock Icon -->
                <div style="
                    width: 80px;
                    height: 80px;
                    background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin: 0 auto 24px;
                    font-size: 40px;
                ">
                    🔒
                </div>

                <!-- Title -->
                <h2 style="
                    font-size: 28px;
                    font-weight: 800;
                    color: #1f2937;
                    margin-bottom: 16px;
                ">
                    این سرویس برای شما فعال نیست
                </h2>

                <!-- Service Info -->
                <div style="
                    background: #f9fafb;
                    border-radius: 16px;
                    padding: 20px;
                    margin-bottom: 24px;
                ">
                    <div style="font-size: 36px; margin-bottom: 12px;">${service.icon}</div>
                    <div style="font-size: 20px; font-weight: 700; color: #374151;">
                        ${service.name}
                    </div>
                </div>

                <!-- Current Tier -->
                <div style="
                    background: #fef3c7;
                    border-left: 4px solid ${currentTierInfo.color};
                    border-radius: 12px;
                    padding: 16px;
                    margin-bottom: 24px;
                    text-align: right;
                ">
                    <div style="font-size: 14px; color: #92400e; margin-bottom: 4px;">
                        اشتراک فعلی شما:
                    </div>
                    <div style="
                        font-size: 18px;
                        font-weight: 700;
                        color: #78350f;
                        display: flex;
                        align-items: center;
                        gap: 8px;
                        justify-content: flex-end;
                    ">
                        <span>${currentTierInfo.name}</span>
                        <span>${currentTierInfo.icon}</span>
                    </div>
                </div>

                <!-- Upgrade Info -->
                <div style="
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    border-radius: 16px;
                    padding: 24px;
                    margin-bottom: 32px;
                ">
                    <div style="font-size: 14px; opacity: 0.95; margin-bottom: 8px;">
                        برای دسترسی به این سرویس، ارتقا دهید به:
                    </div>
                    <div style="
                        font-size: 24px;
                        font-weight: 800;
                        margin-bottom: 16px;
                        display: flex;
                        align-items: center;
                        gap: 12px;
                        justify-content: center;
                    ">
                        <span>${suggestedTierInfo.icon}</span>
                        <span>${suggestedTierInfo.name}</span>
                    </div>
                    <div style="
                        background: rgba(255, 255, 255, 0.2);
                        border-radius: 12px;
                        padding: 16px;
                        backdrop-filter: blur(10px);
                    ">
                        ${suggestedTierInfo.discount_active && suggestedTierInfo.discount_percentage > 0 ? `
                            <div style="
                                background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
                                color: white;
                                padding: 6px 14px;
                                border-radius: 12px;
                                font-size: 13px;
                                font-weight: 800;
                                margin-bottom: 12px;
                                display: inline-block;
                            ">
                                ${suggestedTierInfo.discount_percentage}% تخفیف 🔥
                            </div>
                            <div style="font-size: 24px; font-weight: 600; color: rgba(255,255,255,0.6); text-decoration: line-through; margin-bottom: 8px;">
                                ${suggestedTierInfo.price.toLocaleString('fa-IR')}
                            </div>
                            <div style="font-size: 36px; font-weight: 800; margin-bottom: 4px;">
                                ${Math.round(suggestedTierInfo.price - (suggestedTierInfo.price * suggestedTierInfo.discount_percentage / 100)).toLocaleString('fa-IR')}
                            </div>
                        ` : `
                            <div style="font-size: 36px; font-weight: 800; margin-bottom: 4px;">
                                ${suggestedTierInfo.price.toLocaleString('fa-IR')}
                            </div>
                        `}
                        <div style="font-size: 14px; opacity: 0.9;">
                            تومان / ماهانه
                        </div>
                        <div style="font-size: 13px; opacity: 0.85; margin-top: 8px;">
                            ${suggestedTierInfo.credits} اعتبار در ماه
                        </div>
                    </div>
                </div>

                <!-- Action Buttons -->
                <div style="display: flex; gap: 12px; flex-direction: column;">
                    <button onclick="window.location.href='/pricing.html'" style="
                        width: 100%;
                        padding: 18px 32px;
                        background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
                        color: white;
                        border: none;
                        border-radius: 12px;
                        font-size: 18px;
                        font-weight: 700;
                        cursor: pointer;
                        font-family: 'Vazirmatn', sans-serif;
                        box-shadow: 0 8px 24px rgba(251, 191, 36, 0.3);
                        transition: all 0.3s ease;
                    " onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 12px 32px rgba(251, 191, 36, 0.4)'" onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 8px 24px rgba(251, 191, 36, 0.3)'">
                        🚀 مشاهده پلن‌ها و ارتقا اشتراک
                    </button>
                    <button onclick="closeUpgradeModal()" style="
                        width: 100%;
                        padding: 16px 32px;
                        background: #f3f4f6;
                        color: #6b7280;
                        border: none;
                        border-radius: 12px;
                        font-size: 16px;
                        font-weight: 600;
                        cursor: pointer;
                        font-family: 'Vazirmatn', sans-serif;
                        transition: all 0.3s ease;
                    " onmouseover="this.style.background='#e5e7eb'" onmouseout="this.style.background='#f3f4f6'">
                        بستن
                    </button>
                </div>
            </div>
        </div>

        <style>
            @keyframes fadeIn {
                from {
                    opacity: 0;
                }
                to {
                    opacity: 1;
                }
            }

            @keyframes slideUp {
                from {
                    transform: translateY(50px);
                    opacity: 0;
                }
                to {
                    transform: translateY(0);
                    opacity: 1;
                }
            }
        </style>
    `;

    // Add modal to page
    const modalDiv = document.createElement('div');
    modalDiv.innerHTML = modalHTML;
    document.body.appendChild(modalDiv.firstElementChild);
}

/**
 * Close upgrade modal
 */
function closeUpgradeModal() {
    const modal = document.getElementById('upgradeModal');
    if (modal) {
        modal.style.animation = 'fadeOut 0.3s ease';
        setTimeout(() => {
            modal.remove();
        }, 300);
    }
}

/**
 * Initialize service access check for current page
 * Call this function on each service page
 * @param {string} serviceKey - The service identifier
 * @returns {Promise<boolean>} - Whether user has access
 */
async function initServiceAccessCheck(serviceKey) {
    try {
        const accessInfo = await checkServiceAccess(serviceKey);

        if (!accessInfo.hasAccess) {
            // Show upgrade modal
            showUpgradeModal(accessInfo, serviceKey);

            // Optionally disable the service UI
            disableServiceUI();

            return false;
        }

        return true;
    } catch (error) {
        console.error('Error initializing service access check:', error);
        return false;
    }
}

/**
 * Disable service UI when user doesn't have access
 */
function disableServiceUI() {
    // Add overlay to prevent interaction
    const overlay = document.createElement('div');
    overlay.id = 'service-disabled-overlay';
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(255, 255, 255, 0.95);
        backdrop-filter: blur(8px);
        z-index: 9999;
        display: none;
    `;
    document.body.appendChild(overlay);

    // Disable all interactive elements
    const interactiveElements = document.querySelectorAll('button, input, select, textarea, a');
    interactiveElements.forEach(el => {
        if (!el.closest('#upgradeModal')) {
            el.style.pointerEvents = 'none';
            el.style.opacity = '0.5';
        }
    });
}

// Add CSS for fadeOut animation
const style = document.createElement('style');
style.textContent = `
    @keyframes fadeOut {
        from {
            opacity: 1;
        }
        to {
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);
