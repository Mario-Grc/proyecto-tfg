export interface ToolDefinition {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: {
      type: "object";
      properties: Record<string, unknown>;
      required?: string[];
      additionalProperties?: boolean;
    };
  };
}

export const TOOL_NAME_EXECUTE_CODE = "ejecutar_codigo";
export const TOOL_NAME_EXECUTE_PYTHON = "ejecutar_python";
export const TOOL_NAME_SEARCH_WEB = "buscar_web";

const EXECUTE_CODE_TOOL: ToolDefinition = {
  type: "function",
  function: {
    name: TOOL_NAME_EXECUTE_CODE,
    description: "Ejecuta un fragmento de JavaScript y devuelve salida o error.",
    parameters: {
      type: "object",
      properties: {
        code: {
          type: "string",
          description: "Codigo JavaScript a ejecutar.",
        },
      },
      required: ["code"],
      additionalProperties: false,
    },
  },
};

const EXECUTE_PYTHON_TOOL: ToolDefinition = {
  type: "function",
  function: {
    name: TOOL_NAME_EXECUTE_PYTHON,
    description: "Ejecuta un fragmento de Python 3 y devuelve salida o error.",
    parameters: {
      type: "object",
      properties: {
        code: {
          type: "string",
          description: "Codigo Python 3 a ejecutar.",
        },
      },
      required: ["code"],
      additionalProperties: false,
    },
  },
};

const SEARCH_WEB_TOOL: ToolDefinition = {
  type: "function",
  function: {
    name: TOOL_NAME_SEARCH_WEB,
    description: "Busca informacion actualizada en internet.",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Consulta de busqueda.",
        },
      },
      required: ["query"],
      additionalProperties: false,
    },
  },
};

interface BuildToolRegistryOptions {
  enableMcpWebSearch: boolean;
}

export function buildToolRegistry(options: BuildToolRegistryOptions): ToolDefinition[] {
  const tools = [EXECUTE_CODE_TOOL, EXECUTE_PYTHON_TOOL];

  if (options.enableMcpWebSearch) {
    tools.push(SEARCH_WEB_TOOL);
  }

  return tools;
}
