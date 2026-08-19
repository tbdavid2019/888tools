import { onMounted, onUnmounted } from 'vue';
import {
  clearWebMcpTools,
  executeWebMcpTool,
  getRegisteredWebMcpTools,
  getWebMcpTool,
  registerWebMcpTool,
  registerWebMcpTools,
} from '@/services/webmcp/registry';
import type { WebMcpToolDefinition } from '@/services/webmcp/types';

export {
  registerWebMcpTool,
  registerWebMcpTools,
  getRegisteredWebMcpTools,
  getWebMcpTool,
  executeWebMcpTool,
  clearWebMcpTools,
};

/**
 * Vue Composable for registering page-level WebMCP tools
 */
export function useWebMcp(tools?: WebMcpToolDefinition | WebMcpToolDefinition[]) {
  if (tools) {
    const toolList = Array.isArray(tools) ? tools : [tools];

    onMounted(() => {
      registerWebMcpTools(toolList);
    });

    onUnmounted(() => {
      // Tools remain globally in registry for agent persistence, or can be managed per page
    });
  }

  return {
    registerTool: registerWebMcpTool,
    registerTools: registerWebMcpTools,
    getTools: getRegisteredWebMcpTools,
    execute: executeWebMcpTool,
  };
}
