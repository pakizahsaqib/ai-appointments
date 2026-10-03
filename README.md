# AI Appointment Assistant

A simplified full-stack SaaS-style prototype for authenticated, AI-assisted appointment booking and management.

## Overview

Users can sign up, log in, review a dashboard summary, and manage appointments in a weekly calendar workspace. A floating chat widget lets them book or update appointments in natural language. Incomplete requests prompt clarification. Manual create, edit, cancel, and status changes are available from the calendar UI.

## Architecture

- `frontend/`: Next.js, React, TypeScript app with signup, login, dashboard, and calendar pages, plus a floating chat widget.
- `backend/`: NestJS REST API with JWT auth, TypeORM entities, DTO validation, request logging, rate limiting, OpenRouter integration, and deterministic fallback extraction.
- `database/schema.sql`: SQL DDL, relationships, indexes, and sample inserts.
- `docker-compose.yml`: Local PostgreSQL service.

The AI path is intentionally simple:

```text
ChatController -> ChatService -> AiService -> OpenRouter
                              -> AppointmentsService
```

## Local Setup

1. Install dependencies:

   ```bash
   npm run install:all
   ```

2. Copy environment variables:

   ```bash
   cp .env.example backend/.env
   cp .env.example frontend/.env.local
   ```

3. Start PostgreSQL:

   ```bash
   docker compose up -d postgres
   ```

4. Start the backend:

   ```bash
   npm run start:dev --prefix backend
   ```

5. Start the frontend:

   ```bash
   npm run dev --prefix frontend
   ```

6. Open `http://localhost:3000`. The API listens on `http://localhost:3001` by default.

For the prototype, TypeORM `synchronize` is enabled to create tables during local development. The explicit DDL still lives in `database/schema.sql` for assessment review and deployment planning.

## Environment Variables

- `DATABASE_HOST`, `DATABASE_PORT`, `DATABASE_USER`, `DATABASE_PASSWORD`, `DATABASE_NAME`: PostgreSQL connection.
- `JWT_SECRET`, `JWT_EXPIRES_IN`: JWT signing configuration.
- `OPENROUTER_API_KEY`: Optional OpenRouter key. Without it, the backend uses deterministic extraction for demoable booking and updates.
- `OPENROUTER_MODEL`: OpenRouter model name, defaulting to `openai/gpt-4o-mini`.
- `FRONTEND_ORIGIN`: CORS origin for the frontend.
- `PORT`: Backend HTTP port, defaulting to `3001`.
- `NEXT_PUBLIC_API_URL`: Backend URL used by the Next.js client.

## REST APIs

Authentication:

- `POST /auth/signup`
- `POST /auth/login`
- `GET /auth/me`

Chat:

- `POST /chat/sessions`
- `GET /chat/sessions`
- `GET /chat/sessions/:id/messages`
- `POST /chat/sessions/:id/messages`

Appointments:

- `POST /appointments`
- `GET /appointments`
- `GET /appointments/:id`
- `PATCH /appointments/:id`

Protected routes require `Authorization: Bearer <token>`.

## Product Surfaces

- **Dashboard** (`/dashboard`): summary of upcoming appointments and quick navigation.
- **Calendar** (`/appointments`): weekly scheduler, agenda list, search, create/edit dialog, hover details, and cancel actions. Statuses include `PENDING` (shown as Draft), `CONFIRMED`, `CANCELLED`, and `COMPLETED`.
- **Floating chat widget**: available on dashboard and calendar for natural-language booking and updates without a dedicated chat page.

## Database

Tables:

- `users`: profile and password hash data. Password hashes are never returned by APIs.
- `appointments`: date, time, status, owning user, and optional originating chat session.
- `chat_sessions`: user-owned conversations.
- `chat_messages`: persisted user and assistant messages.
- `ai_interactions`: model, prompt, structured response, latency, token usage placeholder, errors, and timestamp.

Relationships:

```text
User
 ├── Appointments
 └── ChatSessions
       ├── ChatMessages
       ├── AiInteractions
       └── Appointments
```

Indexes:

- `users.email`: unique login lookup.
- `appointments.user_id`: user appointment listing.
- `appointments.appointment_date`: schedule filtering/sorting.
- `chat_sessions.user_id`: user conversation listing.
- `chat_messages.chat_session_id`: conversation history retrieval.
- `ai_interactions.chat_session_id`: debugging AI behavior by session.

See `database/schema.sql` for full DDL and sample insert statements.

## AI Integration

`AiService` calls OpenRouter when `OPENROUTER_API_KEY` is present. It asks for strict JSON containing intent (`BOOK_APPOINTMENT`, `UPDATE_APPOINTMENT`, or `GENERAL_QUERY`), appointment details, missing fields, a clarification question, and assistant text. Recent conversation history is included so simple multi-turn flows work.

Chat booking requires date, start time, and end time before an appointment is created. Update requests identify an existing appointment and apply the requested changes through `AppointmentsService`.

If OpenRouter fails or no key is configured, the deterministic fallback supports common prototype phrases such as “tomorrow from 3 PM to 4 PM” and still refuses to invent missing information. Overlapping slots are rejected with a clear error.

AI interaction logs are stored in `ai_interactions` with prompt, response, model, latency, timestamp, and error text when applicable. Secrets and passwords are not logged.

## Design Decisions

- Request/response chat with a typing state satisfies the near-real-time requirement without WebSocket infrastructure.
- The floating chat widget keeps AI booking available while users stay in dashboard/calendar context.
- Calendar dialogs handle structured create/edit/cancel so users are not dependent on chat for every change.
- TypeORM `synchronize` keeps the prototype easy to run locally; SQL DDL documents the production shape.
- JWT auth is implemented with Passport guards so ownership checks happen per route/service.
- The AI layer is isolated so the rest of the backend does not depend directly on OpenRouter.

## Tradeoffs

- No Redis-backed rate limiting; NestJS throttling is enough for this assessment.
- No OAuth, external calendar sync, email, SMS, admin panel, vector database, RAG, or agent framework.
- Date parsing is intentionally small in fallback mode. OpenRouter should handle richer language when configured.
- Local development uses automatic schema sync; production should use migrations generated from the same entities. Migration tooling exists, but migration files are not checked in for this prototype.

## Assumptions

- A user books and manages appointments only for themselves.
- Chat booking requires an explicit end time; the structured calendar form can still leave duration optional when creating through the UI/API.
- Confirmed appointments are created when required booking fields are present and the slot is available.
- Multi-tenancy is omitted because the assessment marks it optional.

## Known Limitations

- The fallback parser understands only simple date/time phrasing.
- Deployment manifests are intentionally not included beyond environment-based configuration.
- Automated tests are not included in this submission.

## Verification

Run:

```bash
npm run build --prefix backend
npm run build --prefix frontend
```
