-- Allow processes without a backing .gapp directory (srcdoc processes)
ALTER TABLE process ALTER COLUMN directory_id DROP NOT NULL;
ALTER TABLE process ADD COLUMN bundle_name TEXT;

-- Allow windows without a running instance (srcdoc windows)
ALTER TABLE workspace_window ALTER COLUMN instance_id DROP NOT NULL;
ALTER TABLE workspace_window ADD COLUMN srcdoc TEXT;
