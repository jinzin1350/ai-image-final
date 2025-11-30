-- Discount Codes Table
-- This table stores promotional discount codes that admins can create

CREATE TABLE IF NOT EXISTS discount_codes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) UNIQUE NOT NULL, -- The actual discount code (e.g., "SUMMER2024")
    discount_percentage INTEGER NOT NULL CHECK (discount_percentage > 0 AND discount_percentage <= 100), -- Percentage off (1-100)
    description TEXT, -- Internal note/description for admin
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL, -- When this code expires
    is_active BOOLEAN DEFAULT true, -- Can be toggled on/off without deleting
    max_uses INTEGER, -- Maximum number of times this code can be used (NULL = unlimited)
    current_uses INTEGER DEFAULT 0, -- Counter of how many times it's been used
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster code lookups
CREATE INDEX IF NOT EXISTS idx_discount_codes_code ON discount_codes(code);
CREATE INDEX IF NOT EXISTS idx_discount_codes_active ON discount_codes(is_active);
CREATE INDEX IF NOT EXISTS idx_discount_codes_expires ON discount_codes(expires_at);

-- Discount Code Usage Tracking Table
-- Tracks each time a discount code is used by a user

CREATE TABLE IF NOT EXISTS discount_code_usage (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    discount_code_id UUID NOT NULL REFERENCES discount_codes(id) ON DELETE CASCADE,
    user_id UUID NOT NULL, -- References auth.users(id)
    used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    order_amount DECIMAL(10,2), -- The final amount paid after discount
    tier VARCHAR(50), -- Which tier was purchased (bronze, silver, gold)
    CONSTRAINT fk_discount_code FOREIGN KEY (discount_code_id) REFERENCES discount_codes(id) ON DELETE CASCADE
);

-- Index for faster usage lookups
CREATE INDEX IF NOT EXISTS idx_discount_usage_code ON discount_code_usage(discount_code_id);
CREATE INDEX IF NOT EXISTS idx_discount_usage_user ON discount_code_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_discount_usage_date ON discount_code_usage(used_at);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_discount_codes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER discount_codes_updated_at
    BEFORE UPDATE ON discount_codes
    FOR EACH ROW
    EXECUTE FUNCTION update_discount_codes_updated_at();

-- Enable Row Level Security (RLS)
ALTER TABLE discount_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE discount_code_usage ENABLE ROW LEVEL SECURITY;

-- RLS Policies for discount_codes
-- Allow service role (backend) full access
CREATE POLICY "Service role has full access to discount_codes"
    ON discount_codes
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Allow authenticated users to read active, non-expired codes
CREATE POLICY "Users can read active discount codes"
    ON discount_codes
    FOR SELECT
    TO authenticated
    USING (is_active = true AND expires_at > NOW());

-- RLS Policies for discount_code_usage
-- Allow service role full access
CREATE POLICY "Service role has full access to discount_code_usage"
    ON discount_code_usage
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Allow users to see their own usage
CREATE POLICY "Users can see their own discount usage"
    ON discount_code_usage
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

-- Function to safely increment discount code usage counter
CREATE OR REPLACE FUNCTION increment_discount_usage(discount_id UUID)
RETURNS void AS $$
BEGIN
    UPDATE discount_codes
    SET current_uses = current_uses + 1
    WHERE id = discount_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comments
COMMENT ON TABLE discount_codes IS 'Stores promotional discount codes created by admins';
COMMENT ON TABLE discount_code_usage IS 'Tracks usage of discount codes by users';
COMMENT ON COLUMN discount_codes.code IS 'Unique discount code string (e.g., SUMMER2024)';
COMMENT ON COLUMN discount_codes.discount_percentage IS 'Percentage discount (1-100)';
COMMENT ON COLUMN discount_codes.max_uses IS 'Max times code can be used (NULL = unlimited)';
COMMENT ON COLUMN discount_codes.current_uses IS 'Number of times code has been used';
