-- ================================================
-- Add image_generation_model to user_profiles
-- ================================================
-- Allow users to choose which AI model to use for image generation
-- ================================================

-- Add column for image generation model selection
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS image_generation_model TEXT DEFAULT 'gemini-2-flash'
CHECK (image_generation_model IN ('gemini-2-flash', 'nano-banana-2'));

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_user_profiles_model ON user_profiles(image_generation_model);

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ Added image_generation_model column to user_profiles';
    RAISE NOTICE '🤖 Users can now choose between Gemini 2 Flash and Nano Banana 2';
    RAISE NOTICE '📊 Default model: gemini-2-flash';
END $$;
