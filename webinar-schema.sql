-- Webinar Registrations Table
-- Run this SQL in your Supabase SQL Editor

-- Create the webinar_registrations table
CREATE TABLE IF NOT EXISTS webinar_registrations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on phone for faster lookups
CREATE INDEX IF NOT EXISTS idx_webinar_registrations_phone ON webinar_registrations(phone);

-- Create index on created_at for sorting
CREATE INDEX IF NOT EXISTS idx_webinar_registrations_created_at ON webinar_registrations(created_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE webinar_registrations ENABLE ROW LEVEL SECURITY;

-- Create policy to allow inserts from anyone (for registration form)
CREATE POLICY "Anyone can register for webinar"
ON webinar_registrations
FOR INSERT
TO public
WITH CHECK (true);

-- Create policy to allow admins to view all registrations
-- Note: You'll need to adjust this based on your admin authentication setup
CREATE POLICY "Admins can view all registrations"
ON webinar_registrations
FOR SELECT
TO authenticated
USING (true);

-- Optional: Create a function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_webinar_registrations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_webinar_registrations_updated_at_trigger
    BEFORE UPDATE ON webinar_registrations
    FOR EACH ROW
    EXECUTE FUNCTION update_webinar_registrations_updated_at();

-- Optional: Add a comment to the table
COMMENT ON TABLE webinar_registrations IS 'Stores registrations for the Yalda webinar';
COMMENT ON COLUMN webinar_registrations.name IS 'Full name of the registrant';
COMMENT ON COLUMN webinar_registrations.phone IS 'Phone number of the registrant (format: 09XXXXXXXXX)';
