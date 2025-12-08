/**
 * User Usage Widget
 * Displays user tier and credit usage information
 * Can be embedded anywhere in the app
 */

class UserUsageWidget {
    constructor(containerId) {
        this.containerId = containerId;
        this.data = null;
        this.init();
    }

    async init() {
        await this.fetchUsageData();
        this.render();
        // Refresh every 30 seconds
        setInterval(() => this.fetchUsageData(), 30000);
    }

    async fetchUsageData() {
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                console.log('No token found - user not logged in');
                return;
            }

            const response = await fetch('/api/user/usage', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            this.data = await response.json();
            this.render();
        } catch (error) {
            console.error('Error fetching usage data:', error);
        }
    }

    getTierColor(tier) {
        const colors = {
            bronze: { bg: '#fef3c7', text: '#92400e', accent: '#f59e0b' },
            silver: { bg: '#e5e7eb', text: '#374151', accent: '#6b7280' },
            gold: { bg: '#fef3c7', text: '#92400e', accent: '#eab308' }
        };
        return colors[tier] || colors.bronze;
    }

    render() {
        const container = document.getElementById(this.containerId);
        if (!container || !this.data) return;

        const { tier, tierName, credits } = this.data;
        const colors = this.getTierColor(tier);
        const percentage = credits.percentage;
        const isLow = credits.remaining < 10;
        const isCritical = credits.remaining < 5;

        container.innerHTML = `
            <div style="
                background: white;
                border-radius: 16px;
                padding: 20px;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
                border: 2px solid ${isCritical ? '#ef4444' : isLow ? '#f59e0b' : colors.accent};
            ">
                <!-- Tier Badge -->
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px;">
                    <div>
                        <div style="font-size: 12px; color: #6b7280; font-weight: 600; margin-bottom: 4px;">
                            Your Plan
                        </div>
                        <div style="
                            display: inline-flex;
                            align-items: center;
                            gap: 8px;
                            background: ${colors.bg};
                            color: ${colors.text};
                            padding: 6px 16px;
                            border-radius: 20px;
                            font-weight: 700;
                            font-size: 14px;
                        ">
                            ${tier === 'gold' ? '👑' : tier === 'silver' ? '⭐' : '🥉'} ${tierName}
                        </div>
                    </div>
                    ${(isLow || isCritical) ? `
                        <div style="
                            background: ${isCritical ? '#fee2e2' : '#fef3c7'};
                            color: ${isCritical ? '#991b1b' : '#92400e'};
                            padding: 4px 12px;
                            border-radius: 12px;
                            font-size: 11px;
                            font-weight: 600;
                        ">
                            ${isCritical ? '⚠️ Critical' : '⚡ Low Credits'}
                        </div>
                    ` : ''}
                </div>

                <!-- Credits Progress -->
                <div style="margin-bottom: 12px;">
                    <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 8px;">
                        <span style="font-size: 13px; color: #6b7280; font-weight: 600;">
                            Credits
                        </span>
                        <span style="font-size: 18px; font-weight: 700; color: ${isCritical ? '#ef4444' : '#1f2937'};">
                            ${credits.remaining} <span style="font-size: 14px; color: #9ca3af;">/ ${credits.limit}</span>
                        </span>
                    </div>

                    <!-- Progress Bar -->
                    <div style="
                        width: 100%;
                        height: 8px;
                        background: #e5e7eb;
                        border-radius: 4px;
                        overflow: hidden;
                    ">
                        <div style="
                            width: ${percentage}%;
                            height: 100%;
                            background: ${isCritical ? 'linear-gradient(90deg, #ef4444, #dc2626)' :
                                         isLow ? 'linear-gradient(90deg, #f59e0b, #d97706)' :
                                         'linear-gradient(90deg, #667eea, #764ba2)'};
                            transition: width 0.3s ease;
                        "></div>
                    </div>
                </div>

                <!-- Usage Details -->
                <div style="
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 12px;
                    padding: 12px;
                    background: #f9fafb;
                    border-radius: 8px;
                    font-size: 12px;
                ">
                    <div>
                        <div style="color: #6b7280; margin-bottom: 2px;">Used</div>
                        <div style="font-weight: 700; color: #1f2937;">${credits.used} credits</div>
                    </div>
                    <div>
                        <div style="color: #6b7280; margin-bottom: 2px;">Remaining</div>
                        <div style="font-weight: 700; color: ${isCritical ? '#ef4444' : '#10b981'};">${credits.remaining} credits</div>
                    </div>
                </div>

                <!-- Service Costs Info -->
                <div style="
                    margin-top: 16px;
                    padding: 12px;
                    background: linear-gradient(135deg, rgba(102, 126, 234, 0.05), rgba(118, 75, 162, 0.05));
                    border-radius: 8px;
                    font-size: 11px;
                ">
                    <div style="font-weight: 600; color: #374151; margin-bottom: 6px;">💡 Credit Costs:</div>
                    <div style="color: #6b7280; line-height: 1.6;">
                        • Standard services: <strong>1 credit</strong><br>
                        • Premium services (Style Transfer, Brand Theme): <strong>2 credits</strong>
                    </div>
                </div>

                ${credits.remaining === 0 ? `
                    <div style="
                        margin-top: 16px;
                        padding: 12px;
                        background: #fee2e2;
                        border: 2px solid #ef4444;
                        border-radius: 8px;
                        text-align: center;
                    ">
                        <div style="font-weight: 700; color: #991b1b; margin-bottom: 4px;">
                            ⚠️ No Credits Remaining
                        </div>
                        <div style="font-size: 12px; color: #7f1d1d;">
                            Please upgrade your plan to continue
                        </div>
                    </div>
                ` : ''}
            </div>
        `;
    }
}

// Auto-initialize if container exists
document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('user-usage-widget');
    if (container) {
        new UserUsageWidget('user-usage-widget');
    }
});
