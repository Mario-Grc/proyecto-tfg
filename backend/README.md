# QuackCode Backend

API backend para QuackCode, construida con Express, TypeScript, Zod y better-sqlite3.

## Scripts

- `npm install`: Install dependencies
- `npm run dev`: Run server in watch mode using tsx
- `npm run check`: Type-check only
- `npm run build`: Compile TypeScript to `dist`
- `npm run start`: Run compiled server

## Entorno

Copia `.env.example` a `.env` y ajusta los valores si es necesario.

Para búsqueda web MCP con Tavily:
- `ENABLE_MCP_WEB_SEARCH=true`
- `TAVILY_API_KEY=<tu_api_key>`
- `TAVILY_MCP_ENDPOINT=https://mcp.tavily.com/mcp` (por defecto)
- `TAVILY_MCP_TOOL_NAME=tavily-search` (por defecto)
- `MCP_WEB_SEARCH_TIMEOUT_MS=15000` (por defecto)

## Estado actual

El backend está estructurado usando un patrón Repository/Service robusto e incluye:
- **Rutas API**: Endpoints para Chat (`/api/chat`), Problemas de programación (`/api/problems`) y Sesiones (`/api/sessions`).
- **Base de datos**: Integración con `better-sqlite3`, sistema de migraciones (`db/migrations`) y seeds (datos iniciales).
- **Herramientas LLM y MCP**: Motores para ejecutar JavaScript de forma segura (`code-runner`) e integración con Tavily vía el cliente MCP para búsquedas web.
- **Validación**: Validaciones de esquema con `zod`.
- **Manejo de errores**: Middleware centralizado para manejo de errores y validaciones.