# Vak AI - AI Coding Mentor

## Project Overview
Vak AI is a multimodal AI tutor that connects users to Gemini Live for real-time voice conversations. The AI draws diagrams, writes code, and explains complex algorithms through interactive visual learning.

## Recent Fixes
- **API Connectivity Fixed**: Changed server-dev.js to listen on `0.0.0.0:3001` instead of `localhost:3001` to support Replit's distributed architecture
- **Vite Proxy Updated**: Added environment variable support for API URL configuration
- **Deployment Config**: Set up Vercel deployment with proper build and run configuration
- **Environment Variables**: All secrets (GEMINI_API_KEY, VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY) are configured

## Architecture
- **Frontend**: React + Vite (port 5000)
- **Backend API**: Node.js HTTP server (port 3001)
- **AI Integration**: Google Gemini 2.5 Flash Native Audio
- **Database**: Supabase (with mock fallback)
- **Authentication**: Supabase Auth (with mock implementation)

## Development Setup
- Environment variables are stored as secrets in Replit
- Run `npm run dev` to start both frontend and backend
- Frontend auto-proxies `/api` requests to backend

## Deployment
- **Vercel**: Configured with API functions and static frontend build
- **Build**: `npm run build`
- **Production Server**: `node server.js` (serves both API and static assets)

## Key Files
- `server-dev.js` - Development API server
- `server.js` - Production API server and static file server
- `services/geminiService.ts` - Gemini Live integration
- `services/supabaseService.ts` - Database/Auth service with mock support
