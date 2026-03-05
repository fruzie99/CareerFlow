# CareerFlow

A full-stack career counseling platform that connects job seekers with career counselors, provides AI-powered recommendations, job listings, career resources, and a community forum.

## Live Demo

**[https://career-flow-nu.vercel.app/](https://career-flow-nu.vercel.app/)**

## Features

- **Authentication** — Register and login as a job seeker, career counselor, or admin with JWT-based auth
- **Profile Management** — Build detailed profiles with education, experience, skills, and career interests
- **Job Board** — Browse, post, and apply for job listings with deadline tracking
- **Counseling Sessions** — Book, reschedule, and manage one-on-one sessions with career counselors
- **AI Recommendations** — Get personalized career guidance powered by Google Gemini AI
- **Resources Library** — Access articles, videos, and templates for resumes, interviews, and job search
- **Community Forum** — Create posts, reply to discussions, and engage with other users

## Tech Stack

### Frontend
- React 19
- Vite
- CSS

### Backend
- Node.js / Express 5
- MongoDB / Mongoose
- JSON Web Tokens (JWT)
- Zod (validation)
- Google Generative AI (Gemini)

## Project Structure

```
backend/
  src/
    server.js
    config/         # Database configuration
    controllers/    # Route handlers
    middleware/     # Auth middleware
    models/         # Mongoose schemas
    routes/         # API route definitions
    services/       # External service integrations (Gemini AI)

frontend/
  src/
    App.jsx
    api/            # API client functions
    pages/          # Page components
    assets/         # Static assets
```

## Getting Started

### Prerequisites
- Node.js
- MongoDB
- Google Gemini API key

### Backend Setup
```bash
cd backend
npm install
```

Create a `.env` file in the `backend/` directory:
```
PORT=5000
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
GEMINI_API_KEY=your_gemini_api_key
CLIENT_URLS=http://localhost:5173
```

```bash
npm run dev
```

### Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

The frontend runs on `http://localhost:5173` and the backend API on `http://localhost:5000`.

## API Endpoints

| Route                    | Description              |
| ------------------------ | ------------------------ |
| `/api/auth`              | Authentication           |
| `/api/jobs`              | Job listings             |
| `/api/applications`      | Job applications         |
| `/api/sessions`          | Counseling sessions      |
| `/api/counsellors`       | Counselor profiles       |
| `/api/resources`         | Career resources         |
| `/api/community/posts`   | Community posts          |
| `/api/community/replies` | Community replies        |
| `/api/ai`                | AI recommendations       |
