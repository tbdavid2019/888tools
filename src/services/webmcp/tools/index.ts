import type { WebMcpToolDefinition } from '../types';
import { listToolsTool } from './list-tools.tool';
import { tongwenConverterTool } from './tongwen-converter.tool';
import { uuidGeneratorTool } from './uuid.tool';
import { ulidGeneratorTool } from './ulid.tool';
import { base64DecodeTool, base64EncodeTool } from './base64.tool';
import { hashTextTool } from './hash-text.tool';
import { caseConverterTool } from './case-converter.tool';
import { slugifyTool } from './slugify.tool';
import { jsonUtilsTool } from './json-utils.tool';
import { jwtInspectTool } from './jwt-inspect.tool';
import { chmodCalculatorTool } from './chmod.tool';
import { safelinkDecoderTool } from './safelink.tool';
import { urlEncodeDecodeTool } from './url-codec.tool';
import { bip39GeneratorTool } from './bip39.tool';
import { passwordStrengthTool } from './password-strength.tool';
import { loremIpsumTool } from './lorem-ipsum.tool';
import { rsaKeyPairTool } from './rsa-keys.tool';

export const allWebMcpTools: WebMcpToolDefinition[] = [
  listToolsTool,
  tongwenConverterTool,
  uuidGeneratorTool,
  ulidGeneratorTool,
  base64EncodeTool,
  base64DecodeTool,
  hashTextTool,
  caseConverterTool,
  slugifyTool,
  jsonUtilsTool,
  jwtInspectTool,
  chmodCalculatorTool,
  safelinkDecoderTool,
  urlEncodeDecodeTool,
  bip39GeneratorTool,
  passwordStrengthTool,
  loremIpsumTool,
  rsaKeyPairTool,
];

export {
  listToolsTool,
  tongwenConverterTool,
  uuidGeneratorTool,
  ulidGeneratorTool,
  base64EncodeTool,
  base64DecodeTool,
  hashTextTool,
  caseConverterTool,
  slugifyTool,
  jsonUtilsTool,
  jwtInspectTool,
  chmodCalculatorTool,
  safelinkDecoderTool,
  urlEncodeDecodeTool,
  bip39GeneratorTool,
  passwordStrengthTool,
  loremIpsumTool,
  rsaKeyPairTool,
};
