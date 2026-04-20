import { config } from "../config";

interface WebSearchResult {
  ok: boolean;
  output: string;
}

interface McpToolSummary {
  name: string;
}

interface McpClientLike {
  listTools: (
    params?: unknown,
    options?: {
      timeout?: number;
    },
  ) => Promise<{ tools?: McpToolSummary[] }>;
  callTool: (
    params: {
      name: string;
      arguments?: Record<string, unknown>;
    },
    resultSchema?: unknown,
    options?: {
      timeout?: number;
    },
  ) => Promise<Record<string, unknown>>;
  close: () => Promise<void>;
  connect: (transport: unknown) => Promise<void>;
}

interface McpSdkModules {
  Client: new (
    implementation: {
      name: string;
      version: string;
    },
    options: {
      capabilities: Record<string, unknown>;
    },
  ) => McpClientLike;
  StreamableHTTPClientTransport: new (
    url: URL,
    options?: {
      requestInit?: RequestInit;
    },
  ) => unknown;
}

let cachedMcpSdkPromise: Promise<McpSdkModules> | null = null;

async function loadMcpSdk(): Promise<McpSdkModules> {
  if (!cachedMcpSdkPromise) {
    cachedMcpSdkPromise = Promise.all([
      import("@modelcontextprotocol/sdk/client"),
      import("@modelcontextprotocol/sdk/client/streamableHttp"),
    ]).then(([clientModule, transportModule]) => ({
      Client: clientModule.Client as McpSdkModules["Client"],
      StreamableHTTPClientTransport:
        transportModule.StreamableHTTPClientTransport as McpSdkModules["StreamableHTTPClientTransport"],
    }));
  }

  return cachedMcpSdkPromise;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

function normalizeErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

function formatStructuredContent(structuredContent: unknown): string | null {
  if (structuredContent === undefined) {
    return null;
  }

  try {
    return JSON.stringify(structuredContent, null, 2);
  } catch {
    return String(structuredContent);
  }
}

function extractTextBlocks(content: unknown): string[] {
  if (!Array.isArray(content)) {
    return [];
  }

  const blocks: string[] = [];

  for (const item of content) {
    const parsedItem = asRecord(item);
    if (!parsedItem || typeof parsedItem.type !== "string") {
      continue;
    }

    if (parsedItem.type === "text" && typeof parsedItem.text === "string") {
      const normalizedText = parsedItem.text.trim();
      if (normalizedText) {
        blocks.push(normalizedText);
      }

      continue;
    }

    if (parsedItem.type === "resource") {
      const resource = asRecord(parsedItem.resource);
      if (!resource) {
        continue;
      }

      if (typeof resource.text === "string" && resource.text.trim()) {
        blocks.push(resource.text.trim());
        continue;
      }

      if (typeof resource.uri === "string" && resource.uri.trim()) {
        blocks.push(`[resource] ${resource.uri.trim()}`);
      }

      continue;
    }

    if (parsedItem.type === "resource_link") {
      const resourceName = typeof parsedItem.name === "string" ? parsedItem.name.trim() : "resource";
      const resourceUri = typeof parsedItem.uri === "string" ? parsedItem.uri.trim() : "";
      blocks.push(resourceUri ? `${resourceName}: ${resourceUri}` : resourceName);
    }
  }

  return blocks;
}

function buildToolOutput(result: Record<string, unknown>): string {
  const outputBlocks: string[] = [];

  const textBlocks = extractTextBlocks(result.content);
  if (textBlocks.length > 0) {
    outputBlocks.push(textBlocks.join("\n\n"));
  }

  const structuredContent = formatStructuredContent(result.structuredContent);
  if (structuredContent) {
    outputBlocks.push(`structured_content:\n${structuredContent}`);
  }

  return outputBlocks.join("\n\n").trim();
}

export class TavilyMcpClient {
  private client: McpClientLike | null = null;
  private connectPromise: Promise<void> | null = null;
  private selectedToolName: string | null = null;

  private buildServerUrl(): URL {
    const endpoint = config.tavilyMcpEndpoint.trim();
    const serverUrl = new URL(endpoint);

    if (config.tavilyApiKey && !serverUrl.searchParams.has("tavilyApiKey")) {
      serverUrl.searchParams.set("tavilyApiKey", config.tavilyApiKey);
    }

    return serverUrl;
  }

  private async ensureConnected(): Promise<void> {
    if (this.client) {
      return;
    }

    if (this.connectPromise) {
      await this.connectPromise;
      return;
    }

    this.connectPromise = this.connectInternal();

    try {
      await this.connectPromise;
    } finally {
      this.connectPromise = null;
    }
  }

  private async connectInternal(): Promise<void> {
    const { Client, StreamableHTTPClientTransport } = await loadMcpSdk();

    const client = new Client(
      {
        name: "quackcode-backend",
        version: "1.0.0",
      },
      {
        capabilities: {},
      },
    );

    const requestHeaders: Record<string, string> = {};

    if (config.tavilyApiKey) {
      requestHeaders.Authorization = `Bearer ${config.tavilyApiKey}`;
    }

    const transport = new StreamableHTTPClientTransport(this.buildServerUrl(), {
      requestInit: {
        headers: requestHeaders,
      },
    });

    await client.connect(transport);
    this.client = client;
  }

  private async resolveToolName(client: McpClientLike): Promise<string> {
    if (this.selectedToolName) {
      return this.selectedToolName;
    }

    const toolsResponse = await client.listTools(undefined, {
      timeout: config.mcpWebSearchTimeoutMs,
    });

    const availableTools = toolsResponse.tools ?? [];
    const preferredName = config.tavilyMcpToolName.trim();

    const exactMatch = availableTools.find((tool) => tool.name === preferredName);
    const fallbackMatch = availableTools.find((tool) => /tavily|search/i.test(tool.name));
    const selectedTool = exactMatch ?? fallbackMatch;

    if (!selectedTool) {
      const availableNames = availableTools.map((tool) => tool.name).join(", ") || "ninguna";
      throw new Error(
        `No se encontro una herramienta de busqueda compatible en MCP. Herramientas disponibles: ${availableNames}`,
      );
    }

    this.selectedToolName = selectedTool.name;
    return selectedTool.name;
  }

  private resetConnection(): void {
    const previousClient = this.client;

    this.client = null;
    this.selectedToolName = null;

    if (previousClient) {
      void previousClient.close().catch(() => {
        // Ignorado: el cierre de transporte no debe romper el flujo de chat.
      });
    }
  }

  async search(query: string): Promise<WebSearchResult> {
    if (!config.tavilyApiKey) {
      return {
        ok: false,
        output: "Falta configurar TAVILY_API_KEY para usar buscar_web.",
      };
    }

    const normalizedQuery = query.trim();
    if (!normalizedQuery) {
      return {
        ok: false,
        output: "La consulta de busqueda no puede estar vacia.",
      };
    }

    try {
      await this.ensureConnected();

      if (!this.client) {
        return {
          ok: false,
          output: "No se pudo establecer conexion con el servidor MCP de busqueda.",
        };
      }

      const toolName = await this.resolveToolName(this.client);
      const result = (await this.client.callTool(
        {
          name: toolName,
          arguments: {
            query: normalizedQuery,
          },
        },
        undefined,
        {
          timeout: config.mcpWebSearchTimeoutMs,
        },
      )) as Record<string, unknown>;

      const output = buildToolOutput(result) || "La herramienta no devolvio contenido textual.";
      const isError = result.isError === true;

      return {
        ok: !isError,
        output,
      };
    } catch (error) {
      this.resetConnection();

      return {
        ok: false,
        output: `Fallo al consultar MCP web: ${normalizeErrorMessage(error)}`,
      };
    }
  }
}