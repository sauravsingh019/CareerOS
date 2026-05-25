# CareerOS — Free AI Career Intelligence Platform

🌐 Live App: https://career-os-zeta.vercel.app/

CareerOS is an elite, 100% free open-access AI-driven career optimization assistant. Designed in a state-of-the-art **Obsidian Black & Platinum Silver Apple Pro Theme**, it empowers developers to instantly parse PDF resumes, map technical skill cavities, track profile completeness, and consult an interactive iMessage-style AI Strategy Coach.

---

## 🎨 Premium UI & Background Features

- **Obsidian & Platinum Pro Aesthetic**: High-contrast, minimalist design utilizing deep obsidian black (`#09090b`) interactive accents over a clean, responsive layout.
- **Cyber Squares Grid Pattern**: Symmetrical blueprint-style box grid matrix representing organized technical career structures.
- **Twinkling Starfield Canvas**: Hardware-accelerated, zero-lag background canvas rendering slowly drifting **shimmering four-pointed stars (`✦`)** and **soft circular halos**.
- **iMessage-Style Chat Advisor**: Live AI coach support displaying rich, formatted Markdown, including glowing glassmorphic tables, bold checklists, and clean code blocks.
- **Symmetrical 2x2 Testimonials**: Balanced, grid-aligned success stories from Indian developer profiles utilizing beautiful custom initial logos.

---

## 🛠️ Tech Stack

- **Frontend**: Vanilla HTML5, CSS3 Grid/Flexbox, Core JavaScript (ES6+), Canvas API
- **Backend**: Node.js, Express.js (REST API Server)
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: Secure JWT (JSON Web Tokens) + bcrypt hashing
- **AI Engine**: OpenRouter, Google Gemini, Grok, OpenAI, or built-in fallback advisor

---

## 📁 Project Structure

```text
client/   - Premium Obsidian & Platinum Pro theme frontend files
server/   - Modular Express API backend services
  config/      - Database connection configurations
  controllers/ - Request routers & validation logic
  middleware/  - JWT auth & centralized error handlers
  models/      - MongoDB schema definitions (User, Profile, Resume)
  routes/      - Direct REST endpoints mapping
  services/    - Multi-model AI prompts & PDF parsing services
  uploads/     - Sandbox directory for temporary resume storage
```

---

## 🚀 Setup & Execution Instructions

### 1. Install Dependencies
Initialize libraries and dependencies in the root directory:
```bash
npm install
```

### 2. Configure Environment Variables
Copy the template variables file to `.env`:
```bash
cp .env.example .env
```
*(On Windows PowerShell, run `Copy-Item .env.example .env`)*

Update `.env` with your variables. Note that the API server is configured to run on port **`5051`**:
- `PORT=5051`
- `MONGODB_URI`
- `JWT_SECRET`
- `AI_PROVIDER` + active API keys

### 3. Start the Application

You have **two options** for running CareerOS locally:

#### Option A: Split-Service Mode (Recommended for Frontend Tuning)
Run the backend API server and frontend client as separate services.

1. **Start the API Server**:
   ```bash
   npm run server
   ```
   *This launches the Express server on **`http://localhost:5051`** (connected to MongoDB).*

2. **Start the Client**:
   - Run `npm run client` to launch a local dev server on **`http://localhost:5500`**.
   - Or double-click `client/index.html` to open it directly via the `file:///` protocol (fully supported).

*The frontend automatically detects your local environment and maps all fetch endpoints back to the active API server on **`http://localhost:5051`**!*

#### Option B: Single Host Mode (Production-like)
Run the backend server and let Express serve static client files directly on a single port.

1. **Start the App**:
   ```bash
   npm start
   ```
   *This starts the Express server and bundles all `client/` assets.*

2. **Open in Browser**:
   ```text
   http://localhost:5051
   ```
   
This starts the site even if MongoDB is not available yet. In that case the frontend still loads, but database-backed features stay limited until `MONGODB_URI` is reachable.

### 4. Running the Integration Tests
Execute the comprehensive API integration test suite using the built-in Node.js test runner:
```bash
npm test
```
*This spins up an in-memory MongoDB server instance via `mongodb-memory-server` and runs full API requests through `supertest` to validate authentication, resume parsing, profile updates, and AI integration loops.*

## AI Provider Setup

Set `AI_PROVIDER` to one of:

- `fallback`
- `openrouter`
- `gemini`
- `grok`
- `openai`

Example OpenRouter setup:

```env
AI_PROVIDER=openrouter
OPENROUTER_API_KEY=your_openrouter_api_key
OPENROUTER_MODEL=openrouter/free
```

Example Gemini setup:

```env
AI_PROVIDER=gemini
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-2.5-flash
```

Example Grok setup:

```env
AI_PROVIDER=grok
GROK_API_KEY=your_grok_api_key
GROK_MODEL=grok-4
```

Example OpenAI setup:

```env
AI_PROVIDER=openai
OPENAI_API_KEY=your_openai_api_key
OPENAI_MODEL=gpt-4o-mini
```

## API Overview

### Auth

- `POST /api/auth/register`
- `POST /api/auth/login`

### Profile

- `GET /api/profile/me`
- `PUT /api/profile/me`
- `DELETE /api/profile/me`

### Resume

- `POST /api/resume/upload`
- `GET /api/resume/latest`

### AI

- `POST /api/ai/analyze`
- `POST /api/ai/chat`
- `GET /api/ai/suggestions/latest`

## Production Notes

- Store uploads in cloud storage for production deployments.
- Add rate limiting and helmet in hardened production environments.
- Use a managed MongoDB instance and secrets manager.
- Replace the fallback AI logic with a required API key policy if needed.

## Default Test Flow

1. Register a new user
2. Complete the profile
3. Upload a PDF resume
4. Run AI analysis
5. View recommendations on the dashboard
6. Ask the chatbot for career advice

## Pages

- `/index.html` Landing page
- `/auth.html` Register and login
- `/dashboard.html` Profile and workspace overview
- `/analysis.html` Resume upload and AI analysis
- `/chat.html` Career coaching interface
