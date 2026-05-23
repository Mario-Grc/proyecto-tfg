# QuackCode Backend

API backend para QuackCode, construida con Express, TypeScript, Zod y better-sqlite3.

## Scripts

- `npm install`: Install dependencies
- `npm run dev`: Run server in watch mode using tsx
- `npm run check`: Type-check only
- `npm run build`: Compile TypeScript to `dist`
- `npm run start`: Run compiled server

## Entorno

Copia `.env.example` a `.env` y ajusta los valores si es necesario. Con los valores por defecto el backend arranca y la aplicación funciona sin búsqueda web. Si quieres cambiar la configuración, el endpoint de LM Studio o activar la búsqueda con Tavily, revisa las variables de abajo.

Variables necesarias para el arranque:
- `PORT`: Puerto del backend.
- `FRONTEND_ORIGIN`: URL del frontend para CORS (ej: `http://localhost:5173`).
- `LLM_API_ENDPOINT`: URL del endpoint de LM Studio (ej: `http://localhost:1234/v1/chat/completions`).
- `LLM_MODEL_NAME`: Nombre del modelo que se usa en el backend. Si solo se tiene un modelo cargado en LM Studio, se puede dejar local-model.

Variables por defecto (no hace falta editarlas para que funcione el proyecto, solo para personalizarlo):
- `ENABLE_TOOL_CALLING`: activa o desactiva el uso de herramientas.
- `TOOL_CALL_MAX_ROUNDS`: número máximo de llamadas a herramientas por mensaje.
- `CODE_RUNNER_TIMEOUT_MS`: tiempo máximo de ejecución del runner de código (JavaScript y Python).
- `CODE_RUNNER_MAX_CODE_CHARS`: límite de tamaño del código a ejecutar.
- `DATA_DIR`: carpeta donde se guarda la base de datos.
- `DB_FILE_NAME`: nombre del fichero SQLite.

- `ENABLE_MCP_WEB_SEARCH`: activar la búsqueda web con Tavily.
- `TAVILY_API_KEY`: clave de Tavily, solo si activas la búsqueda web.
- `TAVILY_MCP_ENDPOINT`: endpoint del servidor MCP de Tavily (por defecto https://mcp.tavily.com/mcp)
- `TAVILY_MCP_TOOL_NAME`: nombre de la herramienta MCP.
- `MCP_WEB_SEARCH_TIMEOUT_MS`: tiempo máximo para la búsqueda web.

## Estado actual

El backend está estructurado usando un patrón Repository/Service robusto e incluye:
- **Rutas API**: Endpoints para Chat (`/api/chat`), Problemas de programación (`/api/problems`), Sesiones (`/api/sessions`) y Ejecución de código (`/api/run`).
- **Base de datos**: Integración con `better-sqlite3`, sistema de migraciones (`db/migrations`) y seeds (datos iniciales).
- **Herramientas LLM y MCP**: Motores para ejecutar JavaScript y Python de forma segura (`code-runner`) e integración con Tavily vía el cliente MCP para búsquedas web.
- **Validación**: Validaciones de esquema con `zod`.
- **Manejo de errores**: Middleware centralizado para manejo de errores y validaciones.