import { describe, expect, it } from 'vitest';
import { reconstructTableFromOcrBoxes } from './table-reconstruction.service';
import type { OcrTextItem } from './ocr.types';

describe('reconstructTableFromOcrBoxes', () => {
  it('handles empty input gracefully', () => {
    const result = reconstructTableFromOcrBoxes([]);
    expect(result.rowCount).toBe(0);
    expect(result.colCount).toBe(0);
    expect(result.grid).toEqual([]);
    expect(result.markdown).toBe('');
    expect(result.csv).toBe('');
  });

  it('correctly reconstructs a 2x3 table from unordered OCR bounding boxes', () => {
    // 模擬一個 2 行 3 列的表格：
    // Row 0: [姓名 (x:10, y:20), 年齡 (x:110, y:22), 城市 (x:210, y:19)]
    // Row 1: [張三 (x:12, y:60), 28 (x:112, y:58), 台北 (x:208, y:62)]
    // 故意打亂輸入順序
    const items: OcrTextItem[] = [
      { id: '1', text: '28', box: { x: 112, y: 58, width: 30, height: 20 }, confidence: 0.95 },
      { id: '2', text: '姓名', box: { x: 10, y: 20, width: 40, height: 20 }, confidence: 0.98 },
      { id: '3', text: '台北', box: { x: 208, y: 62, width: 40, height: 20 }, confidence: 0.92 },
      { id: '4', text: '年齡', box: { x: 110, y: 22, width: 40, height: 20 }, confidence: 0.97 },
      { id: '5', text: '張三', box: { x: 12, y: 60, width: 40, height: 20 }, confidence: 0.96 },
      { id: '6', text: '城市', box: { x: 210, y: 19, width: 40, height: 20 }, confidence: 0.99 },
    ];

    const result = reconstructTableFromOcrBoxes(items);

    expect(result.rowCount).toBe(2);
    expect(result.colCount).toBe(3);

    expect(result.grid[0]).toEqual(['姓名', '年齡', '城市']);
    expect(result.grid[1]).toEqual(['張三', '28', '台北']);

    // Check markdown table structure
    expect(result.markdown).toContain('| 姓名 | 年齡 | 城市 |');
    expect(result.markdown).toContain('| --- | --- | --- |');
    expect(result.markdown).toContain('| 張三 | 28 | 台北 |');

    // Check CSV format
    expect(result.csv).toContain('姓名,年齡,城市\n張三,28,台北');

    // Check HTML format
    expect(result.html).toContain('<th>姓名</th>');
    expect(result.html).toContain('<td>張三</td>');
  });

  it('handles CSV escaping for quotes and commas', () => {
    const items: OcrTextItem[] = [
      { id: '1', text: '產品,名稱', box: { x: 10, y: 10, width: 80, height: 20 }, confidence: 0.9 },
      { id: '2', text: '含"引號"', box: { x: 120, y: 10, width: 60, height: 20 }, confidence: 0.9 },
    ];

    const result = reconstructTableFromOcrBoxes(items);
    expect(result.csv).toBe('"產品,名稱","含""引號"""');
  });

  it('merges multiple text boxes that fall into the same cell horizontally', () => {
    // 同一行同一欄內有兩個相鄰片段
    const items: OcrTextItem[] = [
      { id: '1', text: '總計', box: { x: 10, y: 10, width: 30, height: 20 }, confidence: 0.9 },
      { id: '2', text: '金額', box: { x: 42, y: 12, width: 30, height: 20 }, confidence: 0.9 },
      { id: '3', text: '1,000', box: { x: 150, y: 11, width: 50, height: 20 }, confidence: 0.9 },
    ];

    const result = reconstructTableFromOcrBoxes(items);
    expect(result.rowCount).toBe(1);
    expect(result.colCount).toBe(2);
    expect(result.grid[0][0]).toBe('總計 金額');
    expect(result.grid[0][1]).toBe('1,000');
  });

  it('correctly handles sparse tables with missing cells', () => {
    // 2x3 table where Row 1 has missing middle cell:
    // [A, B, C]
    // [D,   , F]
    const items: OcrTextItem[] = [
      { id: '1', text: 'A', box: { x: 10, y: 10, width: 20, height: 20 }, confidence: 0.9 },
      { id: '2', text: 'B', box: { x: 100, y: 10, width: 20, height: 20 }, confidence: 0.9 },
      { id: '3', text: 'C', box: { x: 200, y: 10, width: 20, height: 20 }, confidence: 0.9 },
      { id: '4', text: 'D', box: { x: 10, y: 50, width: 20, height: 20 }, confidence: 0.9 },
      { id: '5', text: 'F', box: { x: 200, y: 50, width: 20, height: 20 }, confidence: 0.9 },
    ];

    const result = reconstructTableFromOcrBoxes(items);
    expect(result.rowCount).toBe(2);
    expect(result.colCount).toBe(3);
    expect(result.grid[0]).toEqual(['A', 'B', 'C']);
    expect(result.grid[1]).toEqual(['D', '', 'F']);
  });
});
