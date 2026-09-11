import { MessageType, composerize } from 'composerize-ts';
import type { WebMcpToolDefinition } from '../types';

export const dockerComposeConverterTool: WebMcpToolDefinition = {
  name: 'convert_docker_run_to_compose',
  description: 'Convert a "docker run" CLI command into a docker-compose.yml YAML configuration specification.',
  readOnlyHint: true,
  inputSchema: {
    type: 'object',
    properties: {
      dockerRun: {
        type: 'string',
        description: 'The docker run command line string (e.g. "docker run -d -p 80:80 --name web nginx")',
      },
    },
    required: ['dockerRun'],
  },
  execute: ({ dockerRun }) => {
    if (!dockerRun || typeof dockerRun !== 'string') {
      return { isError: true, error: 'Input dockerRun must be a non-empty string' };
    }

    try {
      const result = composerize(dockerRun.trim());
      const notTranslatable = result.messages
        .filter(msg => msg.type === MessageType.notTranslatable)
        .map(msg => msg.value);
      const notImplemented = result.messages
        .filter(msg => msg.type === MessageType.notImplemented)
        .map(msg => msg.value);
      const errors = result.messages
        .filter(msg => msg.type === MessageType.errorDuringConversion)
        .map(msg => msg.value);

      return {
        success: true,
        dockerComposeYaml: result.yaml,
        notTranslatable,
        notImplemented,
        errors,
      };
    }
    catch (e: any) {
      return { isError: true, error: `Failed to convert command: ${e?.message || String(e)}` };
    }
  },
};
