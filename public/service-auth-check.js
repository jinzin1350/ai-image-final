// Service Page Authentication and Permission Check
// This script runs on each service page to verify access

(async function() {
    // Get service key from URL (e.g., /complete-outfit.html -> complete-outfit)
    const path = window.location.pathname;
    const match = path.match(/\/([^.]+)\.html/);

    if (!match) {
        console.error('❌ Could not extract service key from URL');
        return;
    }

    const serviceKey = match[1];
    console.log('🔐 Checking access for service:', serviceKey);

    // First check if user is authenticated
    const token = localStorage.getItem('supabase_token');
    const session = localStorage.getItem('supabase_session');

    if (!token || !session) {
        console.log('⚠️ No auth credentials - redirecting to login');
        alert('لطفاً ابتدا وارد حساب کاربری خود شوید');
        window.location.replace('/auth');
        return;
    }

    // Now check service permission
    try {
        const response = await fetch(`/api/check-service-access/${serviceKey}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        const data = await response.json();

        console.log('📋 Permission check result:', data);

        if (!data.success || !data.hasAccess) {
            console.log('❌ Access denied for service:', serviceKey);

            // Show message and redirect
            const tierNames = {
                'testlimit': 'تست',
                'bronze': 'برنزی',
                'silver': 'نقره‌ای',
                'gold': 'طلایی'
            };

            const userTierName = tierNames[data.userTier] || data.userTier;

            let message = `شما به این سرویس دسترسی ندارید.\n\nپلن فعلی شما: ${userTierName}`;

            if (data.requiredTiers && data.requiredTiers.length > 0) {
                const requiredTierNames = data.requiredTiers.map(t => tierNames[t] || t).join('، ');
                message += `\n\nبرای دسترسی به این سرویس، به یکی از پلن‌های زیر نیاز دارید:\n${requiredTierNames}`;
            }

            message += '\n\nلطفاً اشتراک خود را ارتقا دهید.';

            alert(message);
            window.location.replace('/index.html');
            return;
        }

        console.log('✅ Access granted for service:', serviceKey);

    } catch (error) {
        console.error('❌ Error checking service access:', error);
        // On error, show message but allow access (fail open for better UX)
        console.log('⚠️ Allowing access due to error (fail open)');
    }
})();
