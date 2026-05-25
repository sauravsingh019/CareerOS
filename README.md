# AI Career Assistant

A production-ready full stack web application for resume analysis, AI-powered career guidance, profile management, and career chat support.

## Tech Stack

- Frontend: HTML, CSS, JavaScript
- Backend: Node.js, Express.js
- Database: MongoDB with Mongoose
- Auth: JWT + bcrypt
- AI: OpenRouter, Gemini, Grok, OpenAI, or built-in fallback recommendations

## Features

- User registration and login
- JWT-protected APIs
- Profile CRUD with skills, education, and experience
- Resume upload for PDF files
- Resume text extraction and skill detection
- AI-generated missing skills and career path suggestions
- Landing page plus dedicated auth, dashboard, analysis, and coach pages
- Dashboard with profile insights and recommendations
- Career advice chatbot
- Validation, centralized error handling, and modular folder structure

## Project Structure

```text
client/
server/
  config/
  controllers/
  middleware/
  models/
  routes/
  services/
  utils/
  uploads/
```

## Setup Instructions

1. Install dependencies:

```bash
npm install
```

2. Copy the environment template:

```bash
cp .env.example .env
```

On Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

3. Update `.env` with your values:
- `MONGODB_URI`
- `JWT_SECRET`
- `AI_PROVIDER`
- One provider key:
  - `OPENROUTER_API_KEY`
  - `GEMINI_API_KEY`
  - `GROK_API_KEY`
  - `OPENAI_API_KEY`

4. Start the Application:

You have **two options** for running the application locally:

### Option A: Running Separately (Recommended for local frontend tuning)
Run the backend API server and frontend client as separate services. This allows you to edit and preview frontend client pages directly using VS Code Live Server (port 5500) or a static server.

1. **Start the API Server**:
   ```bash
   npm run server
   ```
   This runs the Express API server on `http://localhost:5050` with CORS fully enabled for your dev environment.

2. **Start the Client / Live Server**:
   - Option A1: Run `npm run client` to launch a local dev server on `http://localhost:5500`.
   - Option A2: Open the project in VS Code, right-click `client/index.html` and click **Open with Live Server** (runs on `http://localhost:5500`).
   
   *Note: The frontend will automatically detect it's on a client port and map all API requests back to `http://localhost:5050`!*

### Option B: Single Host Mode (Production-like)
Run the backend server and let Express serve the frontend static files on a single port.

1. **Start the App**:
   ```bash
   npm start
   ```
   This starts the Express server and automatically bundles the `client/` folder static assets.

2. **Open**:
   ```text
   http://localhost:5050
   ```
   
This starts the site even if MongoDB is not available yet. In that case the frontend still loads, but database-backed features stay limited until `MONGODB_URI` is reachable.

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
