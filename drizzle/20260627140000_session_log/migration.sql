CREATE TABLE IF NOT EXISTS "session_log" (
  "id" serial PRIMARY KEY NOT NULL,
  "session_id" integer NOT NULL REFERENCES "sessions"("id") ON DELETE CASCADE,
  "level" text NOT NULL,
  "source" text NOT NULL,
  "message" text NOT NULL,
  "detail" text,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "session_log_session_id_idx" ON "session_log" ("session_id");
CREATE INDEX IF NOT EXISTS "session_log_session_created_idx" ON "session_log" ("session_id", "created_at" DESC);