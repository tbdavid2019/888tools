/**
 * W3C WebMCP (Web Model Context Protocol) and MCP CallToolResult types
 * Standard: document.modelContext.registerTool({ name, description, inputSchema, execute, ... })
 */

export interface WebMcpToolProperty {
  type: string
  description?: string
  enum?: (string | number | boolean)[]
  default?: any
  items?: WebMcpToolProperty
  properties?: Record<string, WebMcpToolProperty>
  [key: string]: any
}

export interface WebMcpInputSchema {
  type: 'object'
  properties: Record<string, WebMcpToolProperty>
  required?: string[]
  additionalProperties?: boolean
}

export interface WebMcpTextContent {
  type: 'text'
  text: string
}

export interface WebMcpImageContent {
  type: 'image'
  data: string
  mimeType: string
}

export type WebMcpContent = WebMcpTextContent | WebMcpImageContent;

export interface WebMcpCallToolResult {
  content: WebMcpContent[]
  isError?: boolean
  [key: string]: any
}

export interface WebMcpToolDefinition {
  name: string
  description: string
  inputSchema: WebMcpInputSchema
  readOnlyHint?: boolean
  untrustedContentHint?: boolean
  execute: (
    params: Record<string, any>,
  ) =>
  | Promise<WebMcpCallToolResult | string | Record<string, any> | any>
  | WebMcpCallToolResult
  | string
  | Record<string, any>
  | any
}

export interface ModelContextRegisterOptions {
  name: string
  description: string
  inputSchema: WebMcpInputSchema
  readOnlyHint?: boolean
  untrustedContentHint?: boolean
  execute: (args: Record<string, any>) => Promise<WebMcpCallToolResult>
}

export interface ModelContext {
  registerTool: (tool: ModelContextRegisterOptions) => void
  unregisterTool?: (name: string) => void
  listTools?: () => any[]
}

declare global {
  interface Document {
    modelContext?: ModelContext
  }
  interface Window {
    __888TOOLS_WEBMCP_TOOLS__?: Record<string, WebMcpToolDefinition>
  }
}
