
-- این SQL رو در Supabase SQL Editor اجرا کنید تا کاربرهای تستی اضافه بشن

-- ابتدا یک کاربر تست در auth.users (اختیاری - اگر خودتون یوزر دارید skip کنید)
-- این فقط برای نمایش است

-- اضافه کردن کاربرهای تست به user_limits
INSERT INTO user_limits (user_id, is_premium, images_limit, images_used, captions_limit, captions_used, descriptions_limit, descriptions_used, notes)
VALUES 
  -- کاربر Free (با UUID تصادفی)
  (gen_random_uuid(), false, 10, 3, 5, 1, 3, 0, 'Test free user'),
  
  -- کاربر Premium (با UUID تصادفی)
  (gen_random_uuid(), true, 1000, 45, 500, 12, 100, 5, 'Test premium user'),
  
  -- کاربر Free دیگر
  (gen_random_uuid(), false, 10, 8, 5, 4, 3, 2, 'Another free user');

-- اضافه کردن ایمیل برای نمایش بهتر در ادمین پنل
-- این کار optional است ولی کمک می‌کنه کاربرها رو بهتر ببینید
-- توجه: این ایمیل‌ها فیک هستند چون کاربر واقعی در auth.users نیست

SELECT '✅ 3 test users added to user_limits table!' as status;
