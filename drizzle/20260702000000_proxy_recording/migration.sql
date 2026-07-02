CREATE TABLE proxy_recording_session (
  id SERIAL PRIMARY KEY,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  stopped_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE proxy_traffic (
  id SERIAL PRIMARY KEY,
  session_id INTEGER NOT NULL REFERENCES proxy_recording_session(id) ON DELETE CASCADE,
  recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  slug TEXT NOT NULL,
  method TEXT NOT NULL,
  upstream_url TEXT NOT NULL,
  request_headers JSONB NOT NULL DEFAULT '[]',
  request_body TEXT,
  response_status INTEGER,
  response_headers JSONB NOT NULL DEFAULT '[]',
  response_body TEXT,
  response_body_encoding TEXT,
  duration_ms INTEGER
);

CREATE INDEX ON proxy_traffic (session_id, id);
