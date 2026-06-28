-- Rename workspace desk table (legacy name: sessions)
ALTER TABLE IF EXISTS "sessions" RENAME TO "workspace";
ALTER INDEX IF EXISTS "sessions_global_pc_id_idx" RENAME TO "workspace_global_pc_id_idx";

-- Rename workspace activity log
ALTER TABLE IF EXISTS "session_log" RENAME TO "workspace_log";
ALTER INDEX IF EXISTS "session_log_session_id_idx" RENAME TO "workspace_log_workspace_id_idx";
ALTER INDEX IF EXISTS "session_log_session_created_idx" RENAME TO "workspace_log_workspace_created_idx";

DO $$ BEGIN
  ALTER TABLE "workspace_log" RENAME COLUMN "session_id" TO "workspace_id";
EXCEPTION WHEN undefined_column THEN NULL;
END $$;

-- Workspace window: session_id → workspace_id (intermediate; dropped after process migration)
DO $$ BEGIN
  ALTER TABLE "workspace_window" RENAME COLUMN "session_id" TO "workspace_id";
EXCEPTION WHEN undefined_column THEN NULL;
END $$;

-- Legacy process table used session_id
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'process' AND column_name = 'session_id'
  ) THEN
    ALTER TABLE "process" RENAME COLUMN "session_id" TO "workspace_id";
  END IF;
END $$;

-- Process table (workspace-scoped; reintroduced after mistaken task-only migration)
CREATE TABLE IF NOT EXISTS "process" (
  "id" serial PRIMARY KEY NOT NULL,
  "workspace_id" integer NOT NULL REFERENCES "workspace"("id") ON DELETE CASCADE,
  "directory_id" integer NOT NULL REFERENCES "directory"("id")
);

CREATE INDEX IF NOT EXISTS "process_workspace_id_idx" ON "process" ("workspace_id");
CREATE UNIQUE INDEX IF NOT EXISTS "process_workspace_directory_uidx" ON "process" ("workspace_id", "directory_id");

-- One process per (.gapp, workspace) from legacy task-backed windows
INSERT INTO "process" ("workspace_id", "directory_id")
SELECT DISTINCT ww."workspace_id", t."directory_id"
FROM "workspace_window" ww
JOIN "task" t ON t."id" = ww."task_id"
WHERE ww."workspace_id" IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM "process" p
    WHERE p."workspace_id" = ww."workspace_id"
      AND p."directory_id" = t."directory_id"
  );

-- Instances: process_id for workspace runtimes
ALTER TABLE "instances" ADD COLUMN IF NOT EXISTS "process_id" integer REFERENCES "process"("id") ON DELETE CASCADE;

UPDATE "instances" i
SET "process_id" = p."id"
FROM "workspace_window" ww
JOIN "task" t ON t."id" = ww."task_id"
JOIN "process" p ON p."workspace_id" = ww."workspace_id" AND p."directory_id" = t."directory_id"
WHERE ww."instance_id" = i."id"
  AND i."process_id" IS NULL;

-- Windows: attach to process instead of task/workspace directly
ALTER TABLE "workspace_window" ADD COLUMN IF NOT EXISTS "process_id" integer REFERENCES "process"("id") ON DELETE CASCADE;

UPDATE "workspace_window" ww
SET "process_id" = p."id"
FROM "task" t
JOIN "process" p ON p."directory_id" = t."directory_id"
WHERE t."id" = ww."task_id"
  AND p."workspace_id" = ww."workspace_id"
  AND ww."process_id" IS NULL;

ALTER TABLE "workspace_window" DROP CONSTRAINT IF EXISTS "workspace_window_task_id_task_id_fk";
ALTER TABLE "workspace_window" DROP CONSTRAINT IF EXISTS "workspace_window_session_id_sessions_id_fk";
ALTER TABLE "workspace_window" DROP CONSTRAINT IF EXISTS "workspace_window_workspace_id_workspace_id_fk";
DROP INDEX IF EXISTS "workspace_window_task_id_idx";
DROP INDEX IF EXISTS "workspace_window_session_id_idx";

ALTER TABLE "workspace_window" DROP COLUMN IF EXISTS "task_id";
ALTER TABLE "workspace_window" DROP COLUMN IF EXISTS "workspace_id";

ALTER TABLE "workspace_window" ALTER COLUMN "process_id" SET NOT NULL;
CREATE INDEX IF NOT EXISTS "workspace_window_process_id_idx" ON "workspace_window" ("process_id");

-- Workspace process instances no longer reference task
ALTER TABLE "instances" ALTER COLUMN "task_id" DROP NOT NULL;

UPDATE "instances" SET "task_id" = NULL WHERE "process_id" IS NOT NULL;