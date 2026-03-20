-- Create the backups table to store deleted records
CREATE TABLE IF NOT EXISTS backups (
    id BIGSERIAL PRIMARY KEY,
    table_name TEXT NOT NULL,
    record_id TEXT NOT NULL,
    data JSONB NOT NULL,
    deleted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_by TEXT -- Optional: store admin email if available
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_backups_table_name ON backups(table_name);
CREATE INDEX IF NOT EXISTS idx_backups_deleted_at ON backups(deleted_at);
