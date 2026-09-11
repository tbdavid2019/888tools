import { beforeEach, describe, expect, it } from 'vitest';
import {
  allWebMcpTools,
  base64DecodeTool,
  base64EncodeTool,
  bcryptTool,
  bip39GeneratorTool,
  caseConverterTool,
  chmodCalculatorTool,
  clearWebMcpTools,
  colorConverterTool,
  crontabTool,
  dataFormatConverterTool,
  datetimeConverterTool,
  dockerComposeConverterTool,
  excelCsvConverterTool,
  executeWebMcpTool,
  getRegisteredWebMcpTools,
  hashTextTool,
  hmacTool,
  htmlEntitiesTool,
  httpStatusTool,
  ibanValidatorTool,
  ipv4SubnetTool,
  jsonDiffTool,
  jsonUtilsTool,
  jwtInspectTool,
  listConverterTool,
  listToolsTool,
  loremIpsumTool,
  markdownToHtmlTool,
  passwordGeneratorTool,
  passwordStrengthTool,
  phoneNumberTool,
  qrCodeTool,
  registerWebMcpTool,
  registerWebMcpTools,
  rsaKeyPairTool,
  safelinkDecoderTool,
  slugifyTool,
  sqlPrettifyTool,
  textStatisticsTool,
  tongwenConverterTool,
  totpTool,
  ulidGeneratorTool,
  urlEncodeDecodeTool,
  userAgentTool,
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

  it('executes generate_password tool (passphrase, single, and all formats)', async () => {
    registerWebMcpTool(passwordGeneratorTool);

    // Passphrase format
    const passRes = await executeWebMcpTool('generate_password', {
      format: 'passphrase',
      wordCount: 4,
      capitalize: true,
      addNumber: true,
    });
    const passData = JSON.parse(passRes.content[0].text);
    expect(passData.count).toBe(1);
    expect(passData.first).toContain('-');
    expect(passData.passwords[0].strength).toBeTruthy();

    // All categories format
    const allRes = await executeWebMcpTool('generate_password', {
      format: 'all',
      length: 20,
    });
    const allData = JSON.parse(allRes.content[0].text);
    expect(allData.totalCategories).toBeGreaterThan(5);
    expect(allData.categories[0].key).toBe('passphrase');
  });

  it('executes convert_to_excel_csv tool with BOM and JSON tabular data', async () => {
    registerWebMcpTool(excelCsvConverterTool);

    // 1. Raw CSV content with Chinese text
    const rawRes = await executeWebMcpTool('convert_to_excel_csv', {
      content: '姓名,部門,職稱\n王小明,研發部,工程師\n李小美,行銷部,經理',
    });
    const rawData = JSON.parse(rawRes.content[0].text);
    expect(rawData.success).toBe(true);
    expect(rawData.hasBom).toBe(true);
    expect(rawData.rowCount).toBe(3);
    expect(rawData.csv.charCodeAt(0)).toBe(0xFEFF); // UTF-8 BOM
    expect(rawData.csv).toContain('研發部');
    expect(rawData.dataUrl).toContain('data:text/csv;charset=utf-8;base64,');

    // 2. Tabular JSON data
    const jsonRes = await executeWebMcpTool('convert_to_excel_csv', {
      data: [
        { 員工編號: 'E001', 姓名: '張三', 薪資: 65000 },
        { 員工編號: 'E002', 姓名: '李四', 薪資: 72000 },
      ],
      includeBom: true,
      fileName: 'employees.csv',
    });
    const jsonData = JSON.parse(jsonRes.content[0].text);
    expect(jsonData.success).toBe(true);
    expect(jsonData.fileName).toBe('employees.csv');
    expect(jsonData.csv.charCodeAt(0)).toBe(0xFEFF);
    expect(jsonData.csv).toContain('員工編號');
    expect(jsonData.csv).toContain('張三');

    // 3. Option to disable BOM
    const noBomRes = await executeWebMcpTool('convert_to_excel_csv', {
      content: 'a,b\n1,2',
      includeBom: false,
    });
    const noBomData = JSON.parse(noBomRes.content[0].text);
    expect(noBomData.hasBom).toBe(false);
    expect(noBomData.csv.charCodeAt(0)).not.toBe(0xFEFF);
  });

  it('executes convert_docker_run_to_compose', async () => {
    registerWebMcpTool(dockerComposeConverterTool);
    const res = await executeWebMcpTool('convert_docker_run_to_compose', {
      dockerRun: 'docker run -d -p 80:80 --name web nginx',
    });
    const data = JSON.parse(res.content[0].text);
    expect(data.success).toBe(true);
    expect(data.dockerComposeYaml).toContain('services:');
    expect(data.dockerComposeYaml).toContain('image: nginx');
  });

  it('executes convert_data_format (JSON, YAML, TOML, XML)', async () => {
    registerWebMcpTool(dataFormatConverterTool);

    // JSON to YAML
    const jsonToYaml = await executeWebMcpTool('convert_data_format', {
      content: '{"name":"antigravity","active":true}',
      from: 'json',
      to: 'yaml',
    });
    const yamlData = JSON.parse(jsonToYaml.content[0].text);
    expect(yamlData.success).toBe(true);
    expect(yamlData.result).toContain('name: antigravity');

    // YAML to JSON
    const yamlToJson = await executeWebMcpTool('convert_data_format', {
      content: 'name: antigravity\nactive: true',
      from: 'yaml',
      to: 'json',
    });
    const jsonData = JSON.parse(yamlToJson.content[0].text);
    expect(jsonData.success).toBe(true);
    expect(JSON.parse(jsonData.result).name).toBe('antigravity');
  });

  it('executes parse_crontab_expression', async () => {
    registerWebMcpTool(crontabTool);
    const res = await executeWebMcpTool('parse_crontab_expression', {
      expression: '*/15 * * * *',
    });
    const data = JSON.parse(res.content[0].text);
    expect(data.isValid).toBe(true);
    expect(data.description.toLowerCase()).toContain('minute');
  });

  it('executes parse_phone_number', async () => {
    registerWebMcpTool(phoneNumberTool);
    const res = await executeWebMcpTool('parse_phone_number', {
      phoneNumber: '+886912345678',
      defaultCountry: 'TW',
    });
    const data = JSON.parse(res.content[0].text);
    expect(data.isValid).toBe(true);
    expect(data.country).toBe('TW');
    expect(data.e164).toBe('+886912345678');
  });

  it('executes validate_iban', async () => {
    registerWebMcpTool(ibanValidatorTool);
    const res = await executeWebMcpTool('validate_iban', {
      iban: 'GB82 WEST 1234 5698 7654 32',
    });
    const data = JSON.parse(res.content[0].text);
    expect(data.countryCode).toBe('GB');
  });

  it('executes calculate_ipv4_subnet', async () => {
    registerWebMcpTool(ipv4SubnetTool);
    const res = await executeWebMcpTool('calculate_ipv4_subnet', {
      address: '192.168.1.0/24',
    });
    const data = JSON.parse(res.content[0].text);
    expect(data.success).toBe(true);
    expect(data.networkAddress).toBe('192.168.1.0');
    expect(data.netmask).toBe('255.255.255.0');
    expect(data.usableHosts).toBe(254);
    expect(data.ipClass).toBe('C');
  });

  it('executes diff_json', async () => {
    registerWebMcpTool(jsonDiffTool);
    const res = await executeWebMcpTool('diff_json', {
      original: JSON.stringify({ a: 1, b: 2 }),
      modified: JSON.stringify({ a: 1, b: 3, c: 4 }),
    });
    const data = JSON.parse(res.content[0].text);
    expect(data.success).toBe(true);
    expect(data.diff).toBeDefined();
  });

  it('executes prettify_sql', async () => {
    registerWebMcpTool(sqlPrettifyTool);
    const res = await executeWebMcpTool('prettify_sql', {
      sql: 'select id,name from users where active=1;',
      dialect: 'sql',
    });
    const data = JSON.parse(res.content[0].text);
    expect(data.success).toBe(true);
    expect(data.formattedSql).toContain('SELECT');
    expect(data.formattedSql).toContain('FROM');
  });

  it('executes convert_markdown_to_html', async () => {
    registerWebMcpTool(markdownToHtmlTool);
    const res = await executeWebMcpTool('convert_markdown_to_html', {
      markdown: '# Title\n\nParagraph text',
    });
    const data = JSON.parse(res.content[0].text);
    expect(data.success).toBe(true);
    expect(data.html).toContain('<h1>Title</h1>');
    expect(data.html).toContain('<p>Paragraph text</p>');
  });

  it('executes convert_datetime', async () => {
    registerWebMcpTool(datetimeConverterTool);
    const res = await executeWebMcpTool('convert_datetime', {
      input: '2026-09-11T00:00:00Z',
    });
    const data = JSON.parse(res.content[0].text);
    expect(data.success).toBe(true);
    expect(data.iso8601).toBeDefined();
    expect(data.timestampMs).toBeGreaterThan(0);
  });

  it('executes convert_list_format', async () => {
    registerWebMcpTool(listConverterTool);
    const res = await executeWebMcpTool('convert_list_format', {
      items: 'apple\nbanana\norange',
      itemPrefix: '\'',
      itemSuffix: '\'',
      separator: ', ',
      listPrefix: '(',
      listSuffix: ')',
    });
    const data = JSON.parse(res.content[0].text);
    expect(data.success).toBe(true);
    expect(data.result).toBe('(\'apple\', \'banana\', \'orange\')');
  });

  it('executes generate_qr_code', async () => {
    registerWebMcpTool(qrCodeTool);
    const res = await executeWebMcpTool('generate_qr_code', {
      text: 'https://feature.aitago.tw',
      format: 'svg',
    });
    const data = JSON.parse(res.content[0].text);
    expect(data.success).toBe(true);
    expect(data.svg).toContain('<svg');
  });

  it('executes generate_hmac', async () => {
    registerWebMcpTool(hmacTool);
    const res = await executeWebMcpTool('generate_hmac', {
      text: 'message payload',
      secret: 'secret-key-123',
      algorithm: 'SHA256',
    });
    const data = JSON.parse(res.content[0].text);
    expect(data.success).toBe(true);
    expect(data.hmac).toHaveLength(64);
  });

  it('executes bcrypt_tool', async () => {
    registerWebMcpTool(bcryptTool);
    const hashRes = await executeWebMcpTool('bcrypt_tool', {
      action: 'hash',
      text: 'super-password',
      saltRounds: 4,
    });
    const hashData = JSON.parse(hashRes.content[0].text);
    expect(hashData.success).toBe(true);
    expect(hashData.hash).toContain('$2');

    const verifyRes = await executeWebMcpTool('bcrypt_tool', {
      action: 'verify',
      text: 'super-password',
      hash: hashData.hash,
    });
    const verifyData = JSON.parse(verifyRes.content[0].text);
    expect(verifyData.success).toBe(true);
    expect(verifyData.matches).toBe(true);
  });

  it('executes totp_tool', async () => {
    registerWebMcpTool(totpTool);
    const secretRes = await executeWebMcpTool('totp_tool', { action: 'generate_secret' });
    const secretData = JSON.parse(secretRes.content[0].text);
    expect(secretData.secret).toBeDefined();

    const genRes = await executeWebMcpTool('totp_tool', {
      action: 'generate',
      secret: secretData.secret,
    });
    const genData = JSON.parse(genRes.content[0].text);
    expect(genData.code).toHaveLength(6);

    const verifyRes = await executeWebMcpTool('totp_tool', {
      action: 'verify',
      secret: secretData.secret,
      token: genData.code,
    });
    const verifyData = JSON.parse(verifyRes.content[0].text);
    expect(verifyData.isValid).toBe(true);
  });

  it('executes parse_user_agent', async () => {
    registerWebMcpTool(userAgentTool);
    const res = await executeWebMcpTool('parse_user_agent', {
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
    });
    const data = JSON.parse(res.content[0].text);
    expect(data.success).toBe(true);
    expect(data.browser.name).toBe('Chrome');
    expect(data.os.name).toBe('Mac OS');
  });

  it('executes lookup_http_status', async () => {
    registerWebMcpTool(httpStatusTool);
    const res = await executeWebMcpTool('lookup_http_status', { query: 404 });
    const data = JSON.parse(res.content[0].text);
    expect(data.success).toBe(true);
    expect(data.found).toBeGreaterThan(0);
    expect(data.matches[0].name).toContain('Not Found');
  });

  it('executes analyze_text_statistics', async () => {
    registerWebMcpTool(textStatisticsTool);
    const res = await executeWebMcpTool('analyze_text_statistics', {
      text: '你好世界！Hello world! Today is a great day.',
    });
    const data = JSON.parse(res.content[0].text);
    expect(data.success).toBe(true);
    expect(data.charCount).toBeGreaterThan(10);
    expect(data.cjkCharCount).toBe(4);
  });

  it('executes convert_color', async () => {
    registerWebMcpTool(colorConverterTool);
    const res = await executeWebMcpTool('convert_color', { color: '#3498db' });
    const data = JSON.parse(res.content[0].text);
    expect(data.success).toBe(true);
    expect(data.rgb).toContain('rgb');
    expect(data.hsl).toContain('hsl');
  });

  it('executes html_entities_codec', async () => {
    registerWebMcpTool(htmlEntitiesTool);
    const escRes = await executeWebMcpTool('html_entities_codec', {
      text: '<div>&"hello"</div>',
      action: 'escape',
    });
    const escData = JSON.parse(escRes.content[0].text);
    expect(escData.result).toContain('&lt;div&gt;');

    const unescRes = await executeWebMcpTool('html_entities_codec', {
      text: escData.result,
      action: 'unescape',
    });
    const unescData = JSON.parse(unescRes.content[0].text);
    expect(unescData.result).toBe('<div>&"hello"</div>');
  });
});
