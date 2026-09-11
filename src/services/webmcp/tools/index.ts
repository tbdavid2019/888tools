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
import { passwordGeneratorTool } from './password-generator.tool';
import { excelCsvConverterTool } from './excel-csv.tool';
import { dockerComposeConverterTool } from './docker-compose.tool';
import { dataFormatConverterTool } from './data-format-converter.tool';
import { crontabTool } from './crontab.tool';
import { phoneNumberTool } from './phone-number.tool';
import { ibanValidatorTool } from './iban.tool';
import { ipv4SubnetTool } from './ipv4-subnet.tool';
import { jsonDiffTool } from './json-diff.tool';
import { sqlPrettifyTool } from './sql-prettify.tool';
import { markdownToHtmlTool } from './markdown-to-html.tool';
import { datetimeConverterTool } from './datetime-converter.tool';
import { listConverterTool } from './list-converter.tool';
import { qrCodeTool } from './qr-code.tool';
import { hmacTool } from './hmac.tool';
import { bcryptTool } from './bcrypt.tool';
import { totpTool } from './totp.tool';
import { userAgentTool } from './user-agent.tool';
import { httpStatusTool } from './http-status.tool';
import { textStatisticsTool } from './text-statistics.tool';
import { colorConverterTool } from './color-converter.tool';
import { htmlEntitiesTool } from './html-entities.tool';

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
  passwordGeneratorTool,
  excelCsvConverterTool,
  dockerComposeConverterTool,
  dataFormatConverterTool,
  crontabTool,
  phoneNumberTool,
  ibanValidatorTool,
  ipv4SubnetTool,
  jsonDiffTool,
  sqlPrettifyTool,
  markdownToHtmlTool,
  datetimeConverterTool,
  listConverterTool,
  qrCodeTool,
  hmacTool,
  bcryptTool,
  totpTool,
  userAgentTool,
  httpStatusTool,
  textStatisticsTool,
  colorConverterTool,
  htmlEntitiesTool,
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
  passwordGeneratorTool,
  excelCsvConverterTool,
  dockerComposeConverterTool,
  dataFormatConverterTool,
  crontabTool,
  phoneNumberTool,
  ibanValidatorTool,
  ipv4SubnetTool,
  jsonDiffTool,
  sqlPrettifyTool,
  markdownToHtmlTool,
  datetimeConverterTool,
  listConverterTool,
  qrCodeTool,
  hmacTool,
  bcryptTool,
  totpTool,
  userAgentTool,
  httpStatusTool,
  textStatisticsTool,
  colorConverterTool,
  htmlEntitiesTool,
};
