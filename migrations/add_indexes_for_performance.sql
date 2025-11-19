-- Add indexes to models table for faster queries
-- This will significantly improve the speed of loading models

-- Index on is_active column (used in WHERE clause)
CREATE INDEX IF NOT EXISTS idx_models_is_active ON models(is_active);

-- Index on visibility column (used in WHERE clause)
CREATE INDEX IF NOT EXISTS idx_models_visibility ON models(visibility);

-- Index on category column (used in WHERE clause and IN queries)
CREATE INDEX IF NOT EXISTS idx_models_category ON models(category);

-- Composite index on is_active + visibility (frequently used together)
CREATE INDEX IF NOT EXISTS idx_models_active_visibility ON models(is_active, visibility);

-- Composite index on is_active + category (frequently used together)
CREATE INDEX IF NOT EXISTS idx_models_active_category ON models(is_active, category);

-- Index on created_at for sorting
CREATE INDEX IF NOT EXISTS idx_models_created_at ON models(created_at DESC);

-- Index on owner_user_id for user-specific queries
CREATE INDEX IF NOT EXISTS idx_models_owner_user_id ON models(owner_user_id);

-- Analyze the table to update query planner statistics
ANALYZE models;
