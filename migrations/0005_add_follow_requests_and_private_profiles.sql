
-- Add isPrivate column to users table
ALTER TABLE users ADD COLUMN is_private BOOLEAN NOT NULL DEFAULT false;

-- Create follow_requests table
CREATE TABLE follow_requests (
    id SERIAL PRIMARY KEY,
    requester_id INTEGER NOT NULL,
    requested_id INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
    FOREIGN KEY (requester_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (requested_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create indexes for better performance
CREATE INDEX idx_follow_requests_requester ON follow_requests(requester_id);
CREATE INDEX idx_follow_requests_requested ON follow_requests(requested_id);
CREATE INDEX idx_follow_requests_status ON follow_requests(status);

-- Prevent duplicate follow requests
CREATE UNIQUE INDEX idx_follow_requests_unique ON follow_requests(requester_id, requested_id);
