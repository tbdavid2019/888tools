# W3C WebMCP (Web Model Context Protocol)

[![WebMCP Standard](https://img.shields.io/badge/W3C-WebMCP%20Ready-6366f1)](#)
[![Client-Side Privacy](https://img.shields.io/badge/Privacy-100%25%20In--Browser-success)](#)
[![Zero Latency](https://img.shields.io/badge/Latency-0ms%20Local-brightgreen)](#)

> Live Deployment: **[https://tool.david888.com](https://tool.david888.com)**  
> AI Skill Manifest: **[https://tool.david888.com/SKILL.md](https://tool.david888.com/SKILL.md)**  
> LLM Guide: **[https://tool.david888.com/llms.txt](https://tool.david888.com/llms.txt)**

**888tools** natively implements the **W3C WebMCP (Web Model Context Protocol)** browser specification. WebMCP enables autonomous AI Agents (such as Chrome 146+ native agents, Cloudflare BrowserRun, Stagehand, Browser-use, and Playwright-driven LLM assistants) to invoke developer utility functions programmatically without DOM scraping or simulated clicking.

---

## How WebMCP Works

Traditional AI agents interact with web pages by parsing raw HTML, scanning screenshot pixels, or emulating mouse coordinates. This approach is brittle, high-latency, and prone to breaking whenever CSS or layouts change.

With **WebMCP**, web applications expose tool definitions directly on `document.modelContext.registerTool(...)`. When an AI Agent lands on `tool.david888.com`, it can introspect the tool catalog and call functions directly using standardized JSON parameters.

```text
AI Agent (BrowserRun / Stagehand / Agentic Browser)
       │
       │ Native WebMCP RPC Call (JSON Schema)
       ▼
window.document.modelContext
       │
       │ Executes inside client-side WebAssembly / JS sandbox
       ▼
Local Browser Memory (0ms latency, zero server transfer, 100% private)
```

---

## Built-in WebMCP Tools Catalog

888tools currently registers **39+ WebMCP tools** in `src/services/webmcp/tools/`:

| WebMCP Tool Name | Description | Key Input Parameters |
| :--- | :--- | :--- |
| `list_888_tools` | Discover all 115+ online tools, routes, and descriptions | None |
| `convert_chinese_text` | Convert between Traditional and Simplified Chinese with OpenCC phrases | `text`, `mode` (`s2t`, `t2s`, `twp`) |
| `generate_uuid` | RFC 4122 compliant UUID v4/v1 generator | `version`, `quantity`, `uppercase`, `hyphens` |
| `generate_ulid` | Universally Unique Lexicographically Sortable Identifier | `quantity`, `seedTime` |
| `base64_encode` / `base64_decode` | Standard and URL-safe Base64 encoding/decoding | `text`, `urlSafe` |
| `hash_text` | Cryptographic digests (MD5, SHA-1, SHA-256, SHA-512, SHA-3, RIPEMD160) | `text`, `algorithm`, `encoding` |
| `convert_text_case` | Convert strings to camelCase, snake_case, kebab-case, PascalCase, etc. | `text`, `targetCase` |
| `slugify_string` | URL-safe slug generation with Unicode and special character support | `text`, `separator`, `lowercase` |
| `format_or_minify_json` | Prettify, validate, or minify JSON data | `jsonString`, `action`, `indent` |
| `inspect_jwt` | Decode and inspect JWT header, payload, and expiry | `token` |
| `calculate_chmod` | Convert between Linux octal permissions (755) and symbolic notation (`rwxr-xr-x`) | `octal` or `symbolic` |
| `decode_safelink` | Decode original destination URL from Outlook and Google SafeLinks | `url` |
| `url_encode_decode` | Encode or decode URI components and query strings | `text`, `mode` |
| `generate_bip39_mnemonic` | Cryptographic BIP39 12–24 word passphrases and entropy | `wordCount`, `language` |
| `analyze_password_strength` | Calculate password entropy bits, crack time, and strength score | `password` |
| `generate_lorem_ipsum` | Generate dummy placeholder paragraphs, sentences, and words | `type`, `count`, `asHtml` |
| `generate_rsa_keypair` | Generate RSA public/private key pairs in PEM format (512–4096 bits) | `modulusLength` |
| `convert_to_excel_csv` | Convert CSV or JSON into UTF-8 BOM CSV for Windows Excel compatibility | `data`, `format` |
| `convert_docker_run_to_compose` | Transform `docker run` shell command into `docker-compose.yml` | `command` |
| `convert_data_format` | Bi-directional format conversion: JSON ↔ YAML ↔ TOML ↔ XML | `content`, `from`, `to` |
| `prettify_sql` | Format and indent complex SQL queries across standard dialects | `sql`, `dialect` |
| `convert_markdown_to_html` | Render GitHub Flavored Markdown into sanitized HTML | `markdown` |
| `calculate_ipv4_subnet` | Subnet mask, CIDR, broadcast address, and host range calculation | `ip`, `cidr` |
| `parse_phone_number` | International phone number validation and formatting (`libphonenumber-js`) | `phone`, `defaultCountry` |
| `validate_iban` | International Bank Account Number (IBAN) validation and country parsing | `iban` |
| `parse_crontab_expression` | Human-readable explanation and next occurrence dates of Cron schedules | `expression` |
| `diff_json` | Semantic deep-diff between two JSON objects or arrays | `left`, `right` |
| `convert_datetime` | Convert ISO 8601, Unix timestamps, and timezones | `date`, `format`, `targetTimezone` |
| `convert_list_format` | Sort, deduplicate, prefix, suffix, and transform list strings | `list`, `delimiter`, `options` |
| `generate_qr_code` | SVG / Data URL QR Code generation with customizable error correction | `text`, `size`, `errorCorrection` |
| `generate_hmac` | HMAC authentication signatures using SHA-256, SHA-512, MD5 | `text`, `secret`, `algorithm` |
| `bcrypt_tool` | Bcrypt salt hashing and password verification | `action`, `password`, `hash`, `rounds` |
| `totp_tool` | RFC 6238 Time-Based One-Time Password generator and validator | `secret`, `step`, `digits` |
| `parse_user_agent` | Parse browser, engine, OS, CPU, and device brand from User-Agent | `userAgent` |
| `lookup_http_status` | Query HTTP status codes, standard names, and RFC descriptions | `code` |
| `analyze_text_statistics` | Real-time character, word, byte, sentence, and reading-time counters | `text` |
| `convert_color` | Color space conversion (HEX, RGB, HSL, CMYK) with WCAG luminance | `color` |
| `html_entities_codec` | Encode and decode special characters into HTML entities | `text`, `mode` |

---

## Client Integration Example

When executing in an AI Agent runtime that supports WebMCP:

```javascript
// Check if WebMCP is active
if (window.document?.modelContext?.tools) {
  // Execute UUID tool
  const result = await window.document.modelContext.executeTool('generate_uuid', {
    quantity: 3,
    uppercase: true,
    hyphens: true
  });
  console.log(result.data); // ['F81D4FAE-7DEC-11D0-A765-00A0C91E6BF6', ...]
}
```

---

## Cloudflare Edge WebMCP Bridge

For custom domains deployed on Cloudflare:
1. Log into your **Cloudflare Dashboard**.
2. Navigate to your domain ➜ **Agent Readiness > WebMCP**.
3. Toggle WebMCP on. Cloudflare automatically injects `/.webmcp/bridge.js` at the edge to enable C2PA content verification and enhanced agent discovery.
