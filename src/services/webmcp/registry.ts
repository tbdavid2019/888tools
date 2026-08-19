import type { WebMcpCallToolResult, WebMcpToolDefinition } from './types';

const registeredTools = new Map<string, WebMcpToolDefinition>();

export function formatCallToolResult(result: any): WebMcpCallToolResult {
  if (result && typeof result === 'object' && Array.isArray(result.content)) {
    return result as WebMcpCallToolResult;
  }

  if (typeof result === 'string') {
    return {
      content: [{ type: 'text', text: result }],
    };
  }

  return {
    content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
  };
}

export function registerWebMcpTool(toolDef: WebMcpToolDefinition): void {
  registeredTools.set(toolDef.name, toolDef);

  if (typeof window !== 'undefined') {
    if (!window.__888TOOLS_WEBMCP_TOOLS__) {
      window.__888TOOLS_WEBMCP_TOOLS__ = {};
    }
    window.__888TOOLS_WEBMCP_TOOLS__[toolDef.name] = toolDef;
  }

  if (
    typeof document !== 'undefined'
    && 'modelContext' in document
    && document.modelContext
    && typeof document.modelContext.registerTool === 'function'
  ) {
    try {
      document.modelContext.registerTool({
        name: toolDef.name,
        description: toolDef.description,
        inputSchema: toolDef.inputSchema,
        readOnlyHint: toolDef.readOnlyHint ?? true,
        untrustedContentHint: toolDef.untrustedContentHint ?? false,
        execute: async (args: Record<string, any>) => {
          try {
            const rawResult = await toolDef.execute(args || {});
            return formatCallToolResult(rawResult);
          }
          catch (err: any) {
            return {
              isError: true,
              content: [
                {
                  type: 'text',
                  text: `Error executing tool '${toolDef.name}': ${err?.message || String(err)}`,
                },
              ],
            };
          }
        },
      });
    }
    catch (e) {
      console.warn(`[WebMCP] Failed to register tool '${toolDef.name}' with document.modelContext:`, e);
    }
  }
}

export function registerWebMcpTools(toolDefs: WebMcpToolDefinition[]): void {
  for (const toolDef of toolDefs) {
    registerWebMcpTool(toolDef);
  }
}

export function getRegisteredWebMcpTools(): WebMcpToolDefinition[] {
  return Array.from(registeredTools.values());
}

export function getWebMcpTool(name: string): WebMcpToolDefinition | undefined {
  return registeredTools.get(name);
}

export async function executeWebMcpTool(name: string, args: Record<string, any> = {}): Promise<WebMcpCallToolResult> {
  const tool = registeredTools.get(name);
  if (!tool) {
    return {
      isError: true,
      content: [{ type: 'text', text: `WebMCP tool not found: ${name}` }],
    };
  }

  try {
    const rawResult = await tool.execute(args);
    return formatCallToolResult(rawResult);
  }
  catch (err: any) {
    return {
      isError: true,
      content: [{ type: 'text', text: `Execution failed: ${err?.message || String(err)}` }],
    };
  }
}

export function clearWebMcpTools(): void {
  registeredTools.clear();
  if (typeof window !== 'undefined') {
    window.__888TOOLS_WEBMCP_TOOLS__ = {};
  }
}
