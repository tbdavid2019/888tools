import { beforeEach, describe, expect, it } from 'vitest';
import {
  allWebMcpTools,
  base64DecodeTool,
  base64EncodeTool,
  bip39GeneratorTool,
  caseConverterTool,
  chmodCalculatorTool,
  clearWebMcpTools,
  executeWebMcpTool,
  getRegisteredWebMcpTools,
  hashTextTool,
  jsonUtilsTool,
  jwtInspectTool,
  listToolsTool,
  loremIpsumTool,
  passwordStrengthTool,
  registerWebMcpTool,
  registerWebMcpTools,
  rsaKeyPairTool,
  safelinkDecoderTool,
  slugifyTool,
  tongwenConverterTool,
  ulidGeneratorTool,
  urlEncodeDecodeTool,
  uuidGeneratorTool,
} from './index';

describe('WebMCP Engine and Registry', () => {
  beforeEach(() => {
    clearWebMcpTools();
  });

  it('registers and retrieves WebMCP tools', () => {
    registerWebMcpTools(allWebMcpTools);
    const tools = getRegisteredWebMcpTools();
    expect(tools.length).toBe(allWebMcpTools.length);
    expect(tools.some(t => t.name === 'convert_chinese_text')).toBe(true);
    expect(tools.some(t => t.name === 'generate_uuid')).toBe(true);
  });

  it('executes list_888_tools correctly', async () => {
    registerWebMcpTool(listToolsTool);
    const result = await executeWebMcpTool('list_888_tools', { search: 'uuid' });
    expect(result.isError).toBeFalsy();
    const data = JSON.parse(result.content[0].text);
    expect(data.matchedTools).toBeGreaterThan(0);
    expect(data.tools.some((t: any) => t.path.includes('uuid'))).toBe(true);
  });

  it('executes convert_chinese_text tool (s2t & t2s)', async () => {
    registerWebMcpTool(tongwenConverterTool);

    // Simplified to Traditional
    const s2tRes = await executeWebMcpTool('convert_chinese_text', {
      text: '简体中文转换测试',
      direction: 's2t',
    });
    const s2tData = JSON.parse(s2tRes.content[0].text);
    expect(s2tData.convertedText).toBe('簡體中文轉換測試');

    // Traditional to Simplified
    const t2sRes = await executeWebMcpTool('convert_chinese_text', {
      text: '繁體中文轉換測試',
      direction: 't2s',
    });
    const t2sData = JSON.parse(t2sRes.content[0].text);
    expect(t2sData.convertedText).toBe('繁体中文转换测试');
  });

  it('executes generate_uuid and generate_ulid', async () => {
    registerWebMcpTool(uuidGeneratorTool);
    registerWebMcpTool(ulidGeneratorTool);

    const uuidRes = await executeWebMcpTool('generate_uuid', { count: 3, uppercase: true });
    const uuidData = JSON.parse(uuidRes.content[0].text);
    expect(uuidData.uuids.length).toBe(3);
    expect(uuidData.uuids[0]).toMatch(/^[0-9A-F-]{36}$/);

    const ulidRes = await executeWebMcpTool('generate_ulid', { count: 2 });
    const ulidData = JSON.parse(ulidRes.content[0].text);
    expect(ulidData.ulids.length).toBe(2);
  });

  it('executes base64 encode and decode', async () => {
    registerWebMcpTool(base64EncodeTool);
    registerWebMcpTool(base64DecodeTool);

    const encRes = await executeWebMcpTool('base64_encode', { text: 'Hello WebMCP!' });
    const encData = JSON.parse(encRes.content[0].text);
    expect(encData.encoded).toBe('SGVsbG8gV2ViTUNQIQ==');

    const decRes = await executeWebMcpTool('base64_decode', { base64: encData.encoded });
    const decData = JSON.parse(decRes.content[0].text);
    expect(decData.decoded).toBe('Hello WebMCP!');
  });

  it('executes hash_text tool with MD5 and SHA256', async () => {
    registerWebMcpTool(hashTextTool);

    const hashRes = await executeWebMcpTool('hash_text', { text: 'test', algorithm: 'MD5' });
    const hashData = JSON.parse(hashRes.content[0].text);
    expect(hashData.hash).toBe('098f6bcd4621d373cade4e832627b4f6');

    const allRes = await executeWebMcpTool('hash_text', { text: 'test', algorithm: 'ALL' });
    const allData = JSON.parse(allRes.content[0].text);
    expect(allData.hashes.SHA256).toBeDefined();
  });

  it('executes convert_text_case and slugify_string', async () => {
    registerWebMcpTool(caseConverterTool);
    registerWebMcpTool(slugifyTool);

    const caseRes = await executeWebMcpTool('convert_text_case', { text: 'hello world', targetCase: 'pascalCase' });
    const caseData = JSON.parse(caseRes.content[0].text);
    expect(caseData.result).toBe('HelloWorld');

    const slugRes = await executeWebMcpTool('slugify_string', { text: 'WebMCP in 888tools!' });
    const slugData = JSON.parse(slugRes.content[0].text);
    expect(slugData.slug).toBe('web-mcp-in-888tools');
  });

  it('executes format_or_minify_json', async () => {
    registerWebMcpTool(jsonUtilsTool);

    const formatRes = await executeWebMcpTool('format_or_minify_json', {
      json: '{"a":1,"b":[2,3]}',
      action: 'format',
      indent: 2,
    });
    const formatData = JSON.parse(formatRes.content[0].text);
    expect(formatData.valid).toBe(true);
    expect(formatData.result).toBe('{\n  "a": 1,\n  "b": [\n    2,\n    3\n  ]\n}');

    const minifyRes = await executeWebMcpTool('format_or_minify_json', {
      json: '{\n  "a": 1\n}',
      action: 'minify',
    });
    const minifyData = JSON.parse(minifyRes.content[0].text);
    expect(minifyData.result).toBe('{"a":1}');
  });

  it('executes inspect_jwt', async () => {
    registerWebMcpTool(jwtInspectTool);

    // Sample unsigned JWT header: {"alg":"none","typ":"JWT"}, payload: {"sub":"12345","name":"David"}
    const testJwt = 'eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJzdWIiOiIxMjM0NSIsIm5hbWUiOiJEYXZpZCJ9.';
    const jwtRes = await executeWebMcpTool('inspect_jwt', { jwt: testJwt });
    const jwtData = JSON.parse(jwtRes.content[0].text);
    expect(jwtData.valid).toBe(true);
    expect(jwtData.payload.sub).toBe('12345');
    expect(jwtData.payload.name).toBe('David');
  });

  it('executes calculate_chmod', async () => {
    registerWebMcpTool(chmodCalculatorTool);

    const octRes = await executeWebMcpTool('calculate_chmod', { octal: '755' });
    const octData = JSON.parse(octRes.content[0].text);
    expect(octData.symbolic).toBe('rwxr-xr-x');

    const symRes = await executeWebMcpTool('calculate_chmod', { symbolic: 'rw-r--r--' });
    const symData = JSON.parse(symRes.content[0].text);
    expect(symData.octal).toBe('644');
  });

  it('executes decode_safelink and url_encode_decode', async () => {
    registerWebMcpTool(safelinkDecoderTool);
    registerWebMcpTool(urlEncodeDecodeTool);

    const safeRes = await executeWebMcpTool('decode_safelink', {
      url: 'https://nam01.safelinks.protection.outlook.com/?url=https%3A%2F%2Ftool.david888.com&data=xyz',
    });
    const safeData = JSON.parse(safeRes.content[0].text);
    expect(safeData.decodedUrl).toBe('https://tool.david888.com');

    const urlRes = await executeWebMcpTool('url_encode_decode', {
      text: 'hello world/foo?bar=1',
      action: 'encode',
    });
    const urlData = JSON.parse(urlRes.content[0].text);
    expect(urlData.encoded).toBe('hello%20world%2Ffoo%3Fbar%3D1');
  });

  it('executes generate_bip39_mnemonic and analyze_password_strength', async () => {
    registerWebMcpTool(bip39GeneratorTool);
    registerWebMcpTool(passwordStrengthTool);

    const bipRes = await executeWebMcpTool('generate_bip39_mnemonic', { wordsCount: 12 });
    const bipData = JSON.parse(bipRes.content[0].text);
    expect(bipData.wordsCount).toBe(12);
    expect(bipData.words.length).toBe(12);

    const pwdRes = await executeWebMcpTool('analyze_password_strength', { password: 'Correct-Horse-Battery-Staple-2026!' });
    const pwdData = JSON.parse(pwdRes.content[0].text);
    expect(pwdData.entropyBits).toBeGreaterThan(60);
    expect(pwdData.strengthRating).toBeDefined();
  });

  it('executes generate_lorem_ipsum', async () => {
    registerWebMcpTool(loremIpsumTool);

    const loremRes = await executeWebMcpTool('generate_lorem_ipsum', { paragraphCount: 2 });
    const loremData = JSON.parse(loremRes.content[0].text);
    expect(loremData.paragraphs).toBe(2);
    expect(loremData.text).toContain('Lorem ipsum');
  });

  it('executes generate_rsa_keypair', async () => {
    registerWebMcpTool(rsaKeyPairTool);

    const rsaRes = await executeWebMcpTool('generate_rsa_keypair', { bits: 512 });
    const rsaData = JSON.parse(rsaRes.content[0].text);
    expect(rsaData.publicKeyPem).toContain('BEGIN PUBLIC KEY');
    expect(rsaData.privateKeyPem).toContain('BEGIN RSA PRIVATE KEY');
  });
});
