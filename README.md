# Chat-to-Ticket

AI-powered ticket management through a chat interface. Natural-language team chat messages are parsed into structured, trackable tickets in an admin panel with multi-language understanding, relative date resolution, assignee ambiguity resolution, and multi-turn clarification.

## Submission Details

| Item | Value |
| :--- | :--- |
| **Live app URL (chat)** | http://localhost:3000 |
| **Admin panel URL** | http://localhost:3000/admin |
| **API base URL** | http://localhost:5000 (proxied via `/api/*`) |
| **Admin login (email / password)** | `admin@chattoticket.com` / `admin123` |
| **Test member user** | `priya@example.com` / `password123` |
| **Seeded assignees available for testing** | Priya (Backend), Rahul Sharma (Backend), Rahul Verma (Frontend), Amit (DevOps), Sneha Rao (Product) |

## Tech Stack & Architecture

- **Backend**: Node.js, Express, TypeScript (strict mode enabled).
- **Frontend**: Next.js 16 (App Router), React 19, Tailwind CSS.
- **Database**: Neon PostgreSQL with `pg` connection pooling.
- **AI Layer**: Swappable provider interface (`LlmProvider`) supporting Google Gemini (`gemini-3.5-flash-lite`, `gemini-3.6-flash`) and OpenAI-compatible providers (`OpenAiProvider`).
- **Validation**: Zod schema validation for structured JSON output with fallback and retry mechanisms.
- **Authentication**: JWT token authentication for administrative routes and password hashing using bcrypt.

## Database Choice

Neon PostgreSQL is chosen for robust relational integrity between users, sessions, chat history, and tickets, with JSONB support for pending drafts and array types for ticket tags.

## AI Layer & Clarification Strategy

1. **Structured Extraction**: The system passes the session conversation, current reference date, configured timezone, and registered system users to the model. The model outputs validated JSON containing either a complete ticket draft or a clarification request.
2. **Ambiguity Handling**: If multiple users match a first name (e.g. "Rahul"), the AI asks specifically between "Rahul Sharma (Backend)" and "Rahul Verma (Frontend)". If an unregistered name is provided, the AI informs the user and lists existing team members.
3. **Multi-turn State**: Incomplete tickets preserve a `pending_ticket` draft in the session so that follow-up answers ("Rahul Sharma, yes October") merge seamlessly into the draft.
4. **Multi-language**: Multi-lingual inputs (including Hinglish, Spanish, Arabic, Hindi, Chinese) are detected and replied to in the speaker's language, while maintaining a normalized English title for consistent team tracking in the admin panel.
5. **Provider Swapping**: The AI abstraction layer (`getAiProvider`) allows switching between Google Gemini and OpenAI / Groq / local Ollama by simply updating the environment variables.

## Environment Variables

Copy `.env.example` to `.env`:

```env
DATABASE_URL="postgresql://neondb_owner:npg_DzTq8AsF0cMB@ep-curly-bird-b5p5kxn9-pooler.c-7.us-east-2.aws.neon.tech/neondb?sslmode=require"
GEMINI_API_KEY="your-gemini-api-key"
GEMINI_MODEL="gemini-3.5-flash-lite"
AI_PROVIDER="gemini"
JWT_SECRET="your-jwt-secret"
PORT=5000
NEXT_PUBLIC_API_URL="http://localhost:5000"
TIMEZONE="Asia/Kolkata"
```

## Setup & Running Locally

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Initialize and seed the database**:
   ```bash
   npm run db:seed
   ```

3. **Start both backend and frontend concurrently**:
   ```bash
   npm run dev
   ```

4. Open the application:
   - Chat Interface: `http://localhost:3000`
   - Admin Panel: `http://localhost:3000/admin`

## API Endpoints

- `POST /api/auth/login` - Admin login, returns JWT token and session.
- `POST /api/chat/message` - Send chat message with session ID; returns AI reply and created ticket.
- `GET /api/chat/sessions/:id` - Load conversation history for a given session.
- `GET /api/tickets` - List tickets with filtering (status, assignee, priority), search, and pagination.
- `GET /api/tickets/:id` - View single ticket with source chat context.
- `PATCH /api/tickets/:id` - Update ticket fields (status, assignee, due date, priority).
- `DELETE /api/tickets/:id` - Remove a ticket.
- `GET /api/users` - Retrieve assignable system users.
- `POST /api/users` - Create a new assignable team member.

## Known Limitations

- High API rate limits from free-tier keys may trigger automatic fallback retries. The system is designed with multiple candidate models to mitigate temporary rate limits or spikes.
