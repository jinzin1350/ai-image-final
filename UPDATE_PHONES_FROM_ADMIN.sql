-- =============================================
-- UPDATE: Add phone numbers to user_limits
-- =============================================
-- Updated: December 3, 2025
-- Copy phone numbers from admin page and update manually
-- =============================================

-- Based on the users shown in your admin panel (34 users):

UPDATE user_limits SET phone_number = '09126624576' WHERE email = 'saravafaee1359@gmail.com';
UPDATE user_limits SET phone_number = '09123254540' WHERE email = 'amie.seyedarab93@gmail.con';
UPDATE user_limits SET phone_number = '09355913098' WHERE email = 'zzahragh4@gmail.com';
UPDATE user_limits SET phone_number = '09136339015' WHERE email = 'rahim.borhani9015@gmail.com';
UPDATE user_limits SET phone_number = '09012279099' WHERE email = 'tommy@gmail.com';
UPDATE user_limits SET phone_number = '09020355108' WHERE email = 'tszl.lau@gmail.com';
UPDATE user_limits SET phone_number = '09383553639' WHERE email = 'almesbah@gmail.com';
UPDATE user_limits SET phone_number = '09186101794' WHERE email = 'kishisland@gmail.com';
UPDATE user_limits SET phone_number = '09056677304' WHERE email = 'night@gmail.com';
UPDATE user_limits SET phone_number = '09395356997' WHERE email = 'mehdifathi13837@gmail.com';
UPDATE user_limits SET phone_number = '09375390546' WHERE email = 'rasa@gmail.com';
UPDATE user_limits SET phone_number = '09305406004' WHERE email = 'shahram.yousefi8007@gmail.com';
UPDATE user_limits SET phone_number = '09308946500' WHERE email = 'alirezababayi1402@gmail.com';
UPDATE user_limits SET phone_number = '09194843826' WHERE email = 'melkeyhani20@gmail.com';
UPDATE user_limits SET phone_number = '09124830371' WHERE email = 'behnazakhavan98@gmail.com';
UPDATE user_limits SET phone_number = '09024130999' WHERE email = 'samanmohammadmoghtasedi@gmail.com';
UPDATE user_limits SET phone_number = '09190414521' WHERE email = 'soheil03033303@gmail.com';
UPDATE user_limits SET phone_number = '09123223885' WHERE email = 'a8@gmail.com';
UPDATE user_limits SET phone_number = '09125763776' WHERE email = 'alamode@gmail.com';
UPDATE user_limits SET phone_number = '09128414009' WHERE email = 'moher@gmail.com';
UPDATE user_limits SET phone_number = '09129630523' WHERE email = 'farzanehmardi7@gmail.com';
UPDATE user_limits SET phone_number = '09120122701' WHERE email = 'sahar.dry@gmail.com';
UPDATE user_limits SET phone_number = '09157696765' WHERE email = 'shahrzad.hllj@gmail.com';
UPDATE user_limits SET phone_number = '09392885636' WHERE email = 'mahbobe55.r@gmail.com';
UPDATE user_limits SET phone_number = '09904560032' WHERE email = 'fbag2000@gmail.com';
UPDATE user_limits SET phone_number = '09388993548' WHERE email = 'hamedebro3846@gmail.com';
UPDATE user_limits SET phone_number = '09926342642' WHERE email = 'fatemeh.yazdanian1@gmail.com';
UPDATE user_limits SET phone_number = '09122458151' WHERE email = 'dornika91_@yahoo.com';
UPDATE user_limits SET phone_number = '09151448297' WHERE email = 'zeinabsarani8690@gmail.com';
UPDATE user_limits SET phone_number = '09033226138' WHERE email = 'reihanemohamadnejad565@gmail.com';
UPDATE user_limits SET phone_number = '09154026001' WHERE email = 'reyhan.eghbali.s@gmail.com';
UPDATE user_limits SET phone_number = '09154028001' WHERE email = 'sajadvafa@yahoo.com';
UPDATE user_limits SET phone_number = '09191052041' WHERE email = 'kzmmdh@gmail.com';
UPDATE user_limits SET phone_number = '09126004137' WHERE email = 'mafshinm@gmail.com';

-- Verify updates
SELECT
  email,
  phone_number,
  tier
FROM user_limits
WHERE phone_number IS NOT NULL
ORDER BY created_at DESC;

-- Show success
DO $$
BEGIN
  RAISE NOTICE '✅ Phone numbers updated!';
  RAISE NOTICE 'Now when these users generate images, phone will be saved.';
END $$;
