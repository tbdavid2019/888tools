import iconv from 'iconv-lite';
import { Base64 } from 'js-base64';
import * as XLSX from 'xlsx';
import type { WebMcpToolDefinition } from '../types';

export const excelCsvConverterTool: WebMcpToolDefinition = {
  name: 'convert_to_excel_csv',
  description: 'Convert CSV text, JSON arrays, or Base64-encoded CSV/Excel files into Windows Excel-compatible CSV with UTF-8 BOM (\\uFEFF) to guarantee 100% Chinese character readability without garbled text.',
  readOnlyHint: true,
  inputSchema: {
    type: 'object',
    properties: {
      content: {
        type: 'string',
        description: 'Raw CSV/TSV text to convert into Excel-compatible CSV (with UTF-8 BOM)',
      },
      data: {
        type: 'array',
        description: 'Array of objects or array of arrays (JSON tabular data) to format as Excel-compatible CSV',
      },
      base64Content: {
        type: 'string',
        description: 'Optional Base64-encoded CSV, TSV, or XLSX file content',
      },
      encoding: {
        type: 'string',
        enum: ['auto', 'utf-8', 'big5', 'gb18030', 'shift_jis', 'windows-1252'],
        description: 'Source encoding if passing base64Content (default: "auto")',
        default: 'auto',
      },
      includeBom: {
        type: 'boolean',
        description: 'Whether to prepend UTF-8 BOM (\\uFEFF). Default is true to fix Windows Excel Chinese garbled text.',
        default: true,
      },
      fileName: {
        type: 'string',
        description: 'Export filename (default: "excel_utf8_bom.csv")',
        default: 'excel_utf8_bom.csv',
      },
    },
  },
  execute: ({
    content,
    data,
    base64Content,
    encoding = 'auto',
    includeBom = true,
    fileName = 'excel_utf8_bom.csv',
  }) => {
    let rawCsv = '';
    let detectedEnc = 'utf-8';

    // 1. Process base64 input if provided
    if (base64Content && typeof base64Content === 'string') {
      const cleanBase64 = base64Content.replace(/^data:.*?;base64,/, '');
      const uint8 = Base64.toUint8Array(cleanBase64);

      const hasBom = uint8.length >= 3 && uint8[0] === 0xEF && uint8[1] === 0xBB && uint8[2] === 0xBF;

      // Check if it's an Excel binary file (.xlsx / .xls)
      const isZip = uint8.length >= 4 && uint8[0] === 0x50 && uint8[1] === 0x4B; // PK zip header
      const isOle = uint8.length >= 8 && uint8[0] === 0xD0 && uint8[1] === 0xCF; // OLE header (.xls)

      if (isZip || isOle) {
        try {
          const workbook = XLSX.read(uint8, { type: 'array' });
          const firstSheetName = workbook.SheetNames[0];
          if (firstSheetName && workbook.Sheets[firstSheetName]) {
            rawCsv = XLSX.utils.sheet_to_csv(workbook.Sheets[firstSheetName]);
            detectedEnc = 'excel-binary';
          }
        }
        catch (err: any) {
          return {
            isError: true,
            error: `Failed to parse Excel file: ${err?.message || String(err)}`,
          };
        }
      }
      else {
        // Plain text / CSV with potential multi-byte encoding (Big5, GB18030, etc.)
        const candidates = encoding === 'auto'
          ? (hasBom ? ['utf-8'] : ['utf-8', 'big5', 'gb18030', 'shift_jis', 'windows-1252'])
          : [encoding];

        let bestText = '';
        let bestEncoding = candidates[0];
        let bestScore = Number.POSITIVE_INFINITY;

        for (const candidate of candidates) {
          try {
            let text = '';
            if (candidate === 'utf-8') {
              text = new TextDecoder('utf-8').decode(uint8);
            }
            else {
              text = iconv.decode(uint8 as any, candidate);
            }

            const replacements = (text.match(/\uFFFD/g) || []).length;
            if (replacements < bestScore) {
              bestScore = replacements;
              bestEncoding = candidate;
              bestText = text;
            }
          }
          catch {
            // ignore fallback
          }
        }

        rawCsv = bestText || new TextDecoder('utf-8').decode(uint8);
        detectedEnc = bestEncoding;
      }
    }
    // 2. Process JSON array tabular data if provided
    else if (data && (Array.isArray(data) || typeof data === 'string')) {
      try {
        let parsedData = data;
        if (typeof data === 'string') {
          parsedData = JSON.parse(data);
        }

        if (Array.isArray(parsedData)) {
          if (parsedData.length === 0) {
            rawCsv = '';
          }
          else if (Array.isArray(parsedData[0])) {
            const ws = XLSX.utils.aoa_to_sheet(parsedData as any[][]);
            rawCsv = XLSX.utils.sheet_to_csv(ws);
          }
          else {
            const ws = XLSX.utils.json_to_sheet(parsedData);
            rawCsv = XLSX.utils.sheet_to_csv(ws);
          }
        }
        else {
          return { isError: true, error: 'Input data must be an array of objects or 2D array' };
        }
      }
      catch (e: any) {
        return { isError: true, error: `Invalid JSON tabular data: ${e?.message || String(e)}` };
      }
    }
    // 3. Process direct text content
    else if (typeof content === 'string') {
      rawCsv = content;
    }
    else {
      return {
        isError: true,
        error: 'Please provide either "content" (CSV text), "data" (JSON array), or "base64Content".',
      };
    }

    // Strip existing BOM if present to avoid duplication
    let cleanCsv = rawCsv;
    if (cleanCsv.charCodeAt(0) === 0xFEFF) {
      cleanCsv = cleanCsv.slice(1);
    }

    const bomPrefix = includeBom !== false ? '\uFEFF' : '';
    const finalCsv = bomPrefix + cleanCsv;

    // Calculate line / row count
    const lines = cleanCsv.split(/\r\n|\r|\n/).filter(line => line.trim().length > 0);
    const rowCount = lines.length;

    // Generate Base64 and Data URL for download
    const utf8Bytes = new TextEncoder().encode(finalCsv);
    const base64 = Base64.fromUint8Array(utf8Bytes);
    const dataUrl = `data:text/csv;charset=utf-8;base64,${base64}`;

    return {
      success: true,
      fileName,
      hasBom: includeBom !== false,
      rowCount,
      detectedEncoding: detectedEnc,
      byteLength: utf8Bytes.byteLength,
      csv: finalCsv,
      dataUrl,
      preview: cleanCsv.slice(0, 300),
    };
  },
};
