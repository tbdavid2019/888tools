import type { App } from 'vue';

export const webmcpPlugin = {
  install: (_app: App) => {
    const doRegister = async () => {
      try {
        const { allWebMcpTools, registerWebMcpTools } = await import('@/services/webmcp');
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
      } catch (e) {
        console.warn('[WebMCP] initialization warning:', e);
      }
    };

    // Defer tool registration in browser environment so initial mount is fast and resilient
    if (typeof window !== 'undefined' && !import.meta.env.VITEST) {
      setTimeout(() => {
        void doRegister();
      }, 0);
    } else {
      void doRegister();
    }
  },
};
