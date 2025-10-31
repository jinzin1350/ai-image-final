-- Create model_prompts table to store multiple prompts for each model
-- This allows varied image generation for the same model

CREATE TABLE IF NOT EXISTS model_prompts (
  id SERIAL PRIMARY KEY,
  model_id INTEGER NOT NULL,
  prompt_text TEXT NOT NULL,
  prompt_type VARCHAR(50) DEFAULT 'accessory',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Foreign key to content_library (models)
  CONSTRAINT fk_model
    FOREIGN KEY (model_id)
    REFERENCES content_library(id)
    ON DELETE CASCADE
);

-- Create index for faster queries
CREATE INDEX idx_model_prompts_model_id ON model_prompts(model_id);
CREATE INDEX idx_model_prompts_active ON model_prompts(is_active);

-- Add some example prompts for body-part models (will be populated via admin UI)
-- These are just examples - admin can add more via Model Studio

COMMENT ON TABLE model_prompts IS 'Stores multiple scene prompts for each model to create varied image generation results';
COMMENT ON COLUMN model_prompts.model_id IS 'References content_library.id where content_type = model';
COMMENT ON COLUMN model_prompts.prompt_text IS 'Full prompt text describing the scene, lighting, angle, etc.';
COMMENT ON COLUMN model_prompts.prompt_type IS 'Type of prompt: accessory, fashion, etc.';
COMMENT ON COLUMN model_prompts.is_active IS 'Whether this prompt is active and can be randomly selected';
