import type { App } from 'vue';
import { allWebMcpTools, registerWebMcpTools } from '@/services/webmcp';

export const webmcpPlugin = {
  install: (_app: App) => {
    // Automatically register all built-in WebMCP tools on application launch
    registerWebMcpTools(allWebMcpTools);

    if (typeof window !== 'undefined') {
      (window as any).__888TOOLS_WEBMCP_READY__ = true;

      // Log in development or when WebMCP is detected
      if (import.meta.env.DEV || (typeof document !== 'undefined' && 'modelContext' in document)) {
        // eslint-disable-next-line no-console
        console.info(
          `[WebMCP] 888tools WebMCP engine active: ${allWebMcpTools.length} tools registered for AI agents.`,
        );
      }
    }
  },
};
