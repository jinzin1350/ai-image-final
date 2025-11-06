-- ============================================
-- Quick Check: Specific User's Permissions
-- ============================================

-- Change the email here to check different users
\set user_email 'engi.alireza@gmail.com'

-- Show user info and all their permissions in one view
SELECT
    ul.email,
    ul.tier,
    ul.credits_limit,
    ul.credits_used,
    '---' as separator,
    tsp.service_key,
    tsp.has_access as can_access,
    CASE
        WHEN tsp.has_access = true THEN '✅ YES'
        ELSE '❌ NO'
    END as access_status
FROM user_limits ul
LEFT JOIN tier_service_permissions tsp ON ul.tier = tsp.tier
WHERE ul.email = :'user_email'
ORDER BY
    CASE tsp.service_key
        WHEN 'complete-outfit' THEN 1
        WHEN 'accessories-only' THEN 2
        WHEN 'color-collection' THEN 3
        WHEN 'flat-lay' THEN 4
        WHEN 'scene-recreation' THEN 5
        WHEN 'style-transfer' THEN 6
    END;

-- Alternative simple version without variables:
-- Just replace the email in the WHERE clause

SELECT
    ul.email as "User Email",
    ul.tier as "Tier",
    ul.credits_used || '/' || ul.credits_limit as "Credits Used/Limit",
    STRING_AGG(
        CASE WHEN tsp.has_access = true
        THEN tsp.service_key
        ELSE NULL END,
        ', '
    ) as "Allowed Services",
    STRING_AGG(
        CASE WHEN tsp.has_access = false
        THEN tsp.service_key
        ELSE NULL END,
        ', '
    ) as "Blocked Services"
FROM user_limits ul
LEFT JOIN tier_service_permissions tsp ON ul.tier = tsp.tier
WHERE ul.email = 'engi.alireza@gmail.com'
GROUP BY ul.email, ul.tier, ul.credits_limit, ul.credits_used;
