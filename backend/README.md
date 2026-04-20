# QuackCode Backend

Backend API for QuackCode built with Express, TypeScript, Zod, and better-sqlite3.

## Scripts

- `npm run dev`: Run server in watch mode using tsx
- `npm run check`: Type-check only
- `npm run build`: Compile TypeScript to `dist`
- `npm run start`: Run compiled server

## Environment

Copy `.env.example` to `.env` and adjust values if needed.

For MCP web search with Tavily:
- `ENABLE_MCP_WEB_SEARCH=true`
- `TAVILY_API_KEY=<tu_api_key>`
- `TAVILY_MCP_ENDPOINT=https://mcp.tavily.com/mcp` (default)
- `TAVILY_MCP_TOOL_NAME=tavily-search` (default)
- `MCP_WEB_SEARCH_TIMEOUT_MS=15000` (default)

## Current status

Phase A bootstrap includes:
- Express app with centralized error handling
- CORS config for frontend origin
- SQLite connection bootstrap
- Health route at `GET /api/health`
