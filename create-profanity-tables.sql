
-- Create content_filter_settings table
CREATE TABLE IF NOT EXISTS content_filter_settings (
  id SERIAL PRIMARY KEY,
  field_name TEXT NOT NULL UNIQUE,
  is_enabled BOOLEAN DEFAULT true NOT NULL,
  max_length INTEGER,
  allow_profanity BOOLEAN DEFAULT false NOT NULL,
  clean_automatically BOOLEAN DEFAULT false NOT NULL,
  updated_by INTEGER REFERENCES users(id),
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Create banned_words table
CREATE TABLE IF NOT EXISTS banned_words (
  id SERIAL PRIMARY KEY,
  word TEXT NOT NULL UNIQUE,
  is_active BOOLEAN DEFAULT true NOT NULL,
  added_by INTEGER NOT NULL REFERENCES users(id),
  reason TEXT,
  added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Insert default filter settings
INSERT INTO content_filter_settings (field_name, is_enabled, allow_profanity, clean_automatically) 
VALUES 
  ('displayName', true, false, true),
  ('bio', true, false, true),
  ('comments', true, false, true),
  ('messages', true, false, true),
  ('username', true, false, false)
ON CONFLICT (field_name) DO NOTHING;
