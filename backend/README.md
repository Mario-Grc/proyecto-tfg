# QuackCode Backend

Backend API for QuackCode built with Express, TypeScript, Zod, and better-sqlite3.

## Scripts

- `npm run dev`: Run server in watch mode using tsx
- `npm run check`: Type-check only
- `npm run build`: Compile TypeScript to `dist`
- `npm run start`: Run compiled server

## Environment

Copy `.env.example` to `.env` and adjust values if needed.

## Current status

Phase A bootstrap includes:
- Express app with centralized error handling
- CORS config for frontend origin
- SQLite connection bootstrap
- Health route at `GET /api/health`
