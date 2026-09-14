import * as XLSX from 'xlsx';
import type { OcrTextItem, TableCell, TableReconstructOptions, TableReconstructResult } from './ocr.types';

interface InternalRow {
  top: number;
  bottom: number;
  items: OcrTextItem[];
}

interface ColumnBoundary {
  center: number;
  minX: number;
  maxX: number;
}

/**
 * 2D 幾何表格重構演算法
 * 依據 OCR 偵測到的文字塊幾何座標 (x, y, w, h)，自動計算水平列 (Row) 與垂直欄 (Column)，
 * 映射為二維結構化表格，並生成 Markdown、CSV 與 HTML 格式。
 */
export function reconstructTableFromOcrBoxes(
  items: OcrTextItem[],
  options: TableReconstructOptions = {},
): TableReconstructResult {
  const { rowOverlapThreshold = 0.45 } = options;

  if (!items || items.length === 0) {
    return {
      grid: [],
      cells: [],
      markdown: '',
      csv: '',
      html: '',
      rowCount: 0,
      colCount: 0,
    };
  }

  // 1. 過濾有效項目並依 Y 軸座標（由上至下）排序
  const sortedByY = [...items]
    .filter(it => it.text && it.text.trim().length > 0 && it.box && it.box.width > 0 && it.box.height > 0)
    .sort((a, b) => {
      if (Math.abs(a.box.y - b.box.y) < 4) {
        return a.box.x - b.box.x;
      }
      return a.box.y - b.box.y;
    });

  if (sortedByY.length === 0) {
    return {
      grid: [],
      cells: [],
      markdown: '',
      csv: '',
      html: '',
      rowCount: 0,
      colCount: 0,
    };
  }

  // 2. 水平行分群 (Row Clustering by vertical intersection)
  const rows: InternalRow[] = [];

  for (const item of sortedByY) {
    const itemTop = item.box.y;
    const itemBottom = item.box.y + item.box.height;
    const itemHeight = item.box.height;

    // 尋找垂直高度重疊最大的現有行
    let bestRowIndex = -1;
    let maxOverlap = 0;

    for (let r = 0; r < rows.length; r++) {
      const row = rows[r];
      const overlapTop = Math.max(itemTop, row.top);
      const overlapBottom = Math.min(itemBottom, row.bottom);
      const overlap = Math.max(0, overlapBottom - overlapTop);
      const minHeight = Math.min(itemHeight, row.bottom - row.top);

      if (minHeight > 0) {
        const ratio = overlap / minHeight;
        if (ratio >= rowOverlapThreshold && overlap > maxOverlap) {
          maxOverlap = overlap;
          bestRowIndex = r;
        }
      }
    }

    if (bestRowIndex >= 0) {
      const row = rows[bestRowIndex];
      row.items.push(item);
      // 動態更新該行的上下邊界
      row.top = Math.min(row.top, itemTop);
      row.bottom = Math.max(row.bottom, itemBottom);
    } else {
      rows.push({
        top: itemTop,
        bottom: itemBottom,
        items: [item],
      });
    }
  }

  // 每行內的項目按 X 軸（由左至右）排序，並將水平間距極小（同一詞組/單元格內）的相鄰文字塊就地合流
  for (const row of rows) {
    row.items.sort((a, b) => a.box.x - b.box.x);

    const mergedItems: OcrTextItem[] = [];
    for (const item of row.items) {
      if (mergedItems.length === 0) {
        mergedItems.push({ ...item });
        continue;
      }

      const prev = mergedItems[mergedItems.length - 1];
      const gap = item.box.x - (prev.box.x + prev.box.width);
      const avgHeight = (prev.box.height + item.box.height) / 2;

      // 若兩字塊相鄰間隔小於 0.8 倍字高，視為同單元格內的連續文字
      if (gap >= -5 && gap < avgHeight * 0.8) {
        prev.text = `${prev.text} ${item.text}`.trim();
        const newRight = Math.max(prev.box.x + prev.box.width, item.box.x + item.box.width);
        prev.box.width = newRight - prev.box.x;
        prev.box.height = Math.max(prev.box.height, item.box.height);
        prev.confidence = (prev.confidence + item.confidence) / 2;
      } else {
        mergedItems.push({ ...item });
      }
    }
    row.items = mergedItems;
  }

  // 3. 垂直欄分群 (Column Clustering)
  // 統計所有單元格的 X 軸分佈，聚類出欄邊界
  const columns: ColumnBoundary[] = [];

  for (const row of rows) {
    for (const item of row.items) {
      const left = item.box.x;
      const right = item.box.x + item.box.width;
      const center = left + item.box.width / 2;

      // 尋找是否屬於已有欄
      let matchedCol = -1;
      let minDistance = Infinity;

      for (let c = 0; c < columns.length; c++) {
        const col = columns[c];
        const overlap = Math.max(0, Math.min(right, col.maxX) - Math.max(left, col.minX));
        const span = Math.min(item.box.width, col.maxX - col.minX);

        if (span > 0 && overlap / span > 0.35) {
          matchedCol = c;
          break;
        }

        const dist = Math.abs(center - col.center);
        if (dist < minDistance && dist < Math.max(item.box.width, 30) * 0.7) {
          minDistance = dist;
          matchedCol = c;
        }
      }

      if (matchedCol >= 0) {
        const col = columns[matchedCol];
        col.minX = Math.min(col.minX, left);
        col.maxX = Math.max(col.maxX, right);
        col.center = (col.minX + col.maxX) / 2;
      } else {
        columns.push({
          center,
          minX: left,
          maxX: right,
        });
      }
    }
  }

  // 將欄由左至右排序
  columns.sort((a, b) => a.minX - b.minX);

  const numRows = rows.length;
  const numCols = Math.max(1, columns.length);

  // 4. 構建二維陣列 (Grid Matrix)
  const grid: string[][] = Array.from({ length: numRows }, () =>
    Array.from({ length: numCols }, () => ''),
  );

  const cells: TableCell[] = [];

  for (let r = 0; r < numRows; r++) {
    const row = rows[r];

    for (const item of row.items) {
      const left = item.box.x;
      const right = item.box.x + item.box.width;
      const center = left + item.box.width / 2;

      // 找出最匹配的欄
      let bestColIndex = 0;
      let bestScore = -Infinity;

      for (let c = 0; c < numCols; c++) {
        const col = columns[c];
        const overlap = Math.max(0, Math.min(right, col.maxX) - Math.max(left, col.minX));
        const distance = Math.abs(center - col.center);
        const score = overlap * 2 - distance;

        if (score > bestScore) {
          bestScore = score;
          bestColIndex = c;
        }
      }

      const existingText = grid[r][bestColIndex];
      const textToAppend = item.text.trim();

      if (existingText) {
        grid[r][bestColIndex] = `${existingText} ${textToAppend}`;
      } else {
        grid[r][bestColIndex] = textToAppend;
      }

      cells.push({
        id: `cell-${r}-${bestColIndex}-${item.id}`,
        row: r,
        col: bestColIndex,
        text: textToAppend,
        box: item.box,
      });
    }
  }

  // 5. 生成 Markdown 表格
  const markdownLines: string[] = [];
  if (numRows > 0) {
    // 標題行
    const header = `| ${grid[0].map(c => c.replace(/\|/g, '\\|') || ' ').join(' | ')} |`;
    const separator = `| ${grid[0].map(() => '---').join(' | ')} |`;
    markdownLines.push(header);
    markdownLines.push(separator);

    for (let r = 1; r < numRows; r++) {
      const line = `| ${grid[r].map(c => c.replace(/\|/g, '\\|') || ' ').join(' | ')} |`;
      markdownLines.push(line);
    }
  }
  const markdown = markdownLines.join('\n');

  // 6. 生成 CSV (遵循 RFC4180 逸出字元)
  const csvLines = grid.map(row =>
    row
      .map((val) => {
        if (/[",\n\r]/.test(val)) {
          return `"${val.replace(/"/g, '""')}"`;
        }
        return val;
      })
      .join(','),
  );
  const csv = csvLines.join('\n');

  // 7. 生成 HTML <table>
  const htmlParts: string[] = ['<table class="ocr-reconstructed-table">'];
  if (numRows > 0) {
    htmlParts.push('  <thead>');
    htmlParts.push('    <tr>');
    for (const cell of grid[0]) {
      htmlParts.push(`      <th>${escapeHtml(cell)}</th>`);
    }
    htmlParts.push('    </tr>');
    htmlParts.push('  </thead>');

    if (numRows > 1) {
      htmlParts.push('  <tbody>');
      for (let r = 1; r < numRows; r++) {
        htmlParts.push('    <tr>');
        for (const cell of grid[r]) {
          htmlParts.push(`      <td>${escapeHtml(cell)}</td>`);
        }
        htmlParts.push('    </tr>');
      }
      htmlParts.push('  </tbody>');
    }
  }
  htmlParts.push('</table>');
  const html = htmlParts.join('\n');

  return {
    grid,
    cells,
    markdown,
    csv,
    html,
    rowCount: numRows,
    colCount: numCols,
  };
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * 匯出二維網格為 Excel (.xlsx) 檔案
 */
export function exportGridToXlsx(grid: string[][], filename = 'table_ocr_export.xlsx'): void {
  const ws = XLSX.utils.aoa_to_sheet(grid);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'OCR_Table');
  XLSX.writeFile(wb, filename);
}
