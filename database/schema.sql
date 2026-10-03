CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TYPE appointment_status AS ENUM ('PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED');
CREATE TYPE chat_message_role AS ENUM ('USER', 'ASSISTANT', 'SYSTEM');

CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name varchar(120) NOT NULL,
  email varchar(255) NOT NULL UNIQUE,
  password_hash varchar(255) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE chat_sessions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title varchar(160),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE appointments (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  chat_session_id uuid REFERENCES chat_sessions(id) ON DELETE SET NULL,
  title varchar(160) NOT NULL,
  description text,
  appointment_date date NOT NULL,
  start_time time NOT NULL,
  end_time time,
  status appointment_status NOT NULL DEFAULT 'CONFIRMED',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE chat_messages (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  chat_session_id uuid NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
  role chat_message_role NOT NULL,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE ai_interactions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  chat_session_id uuid REFERENCES chat_sessions(id) ON DELETE SET NULL,
  model varchar(120) NOT NULL,
  prompt text NOT NULL,
  response text NOT NULL,
  latency_ms integer NOT NULL DEFAULT 0,
  token_usage jsonb,
  error text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_appointments_user_id ON appointments(user_id);
CREATE INDEX idx_appointments_appointment_date ON appointments(appointment_date);
CREATE INDEX idx_chat_sessions_user_id ON chat_sessions(user_id);
CREATE INDEX idx_chat_messages_chat_session_id ON chat_messages(chat_session_id);
CREATE INDEX idx_ai_interactions_chat_session_id ON ai_interactions(chat_session_id);

INSERT INTO users (id, name, email, password_hash)
VALUES ('00000000-0000-0000-0000-000000000001', 'Demo User', 'demo@example.com', '$2b$10$sample.hash.for.documentation.only');

INSERT INTO chat_sessions (id, user_id, title)
VALUES ('00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000001', 'Demo booking chat');

INSERT INTO appointments (user_id, chat_session_id, title, appointment_date, start_time, status)
VALUES ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000101', 'Consultation', current_date + interval '1 day', '15:00', 'CONFIRMED');
