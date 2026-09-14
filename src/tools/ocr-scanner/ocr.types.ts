export interface Point {
  x: number;
  y: number;
}

export interface OcrBox {
  x: number;
  y: number;
  width: number;
  height: number;
  points?: [Point, Point, Point, Point];
}

export interface OcrTextItem {
  id: string;
  text: string;
  box: OcrBox;
  confidence: number;
}

export interface OcrResult {
  text: string;
  items: OcrTextItem[];
  timeMs: number;
  backend: 'webgpu' | 'wasm' | 'cpu';
  imageWidth: number;
  imageHeight: number;
}

export interface TableCell {
  id: string;
  row: number;
  col: number;
  rowspan?: number;
  colspan?: number;
  text: string;
  box?: OcrBox;
}

export interface TableReconstructResult {
  grid: string[][];
  cells: TableCell[];
  markdown: string;
  csv: string;
  html: string;
  rowCount: number;
  colCount: number;
}

export interface TableReconstructOptions {
  rowOverlapThreshold?: number; // 垂直重疊比例閾值 (0~1)，預設 0.4
  colTolerance?: number; // 水平列對齊容差 (像素或比例)
  headerRow?: boolean; // 第一行是否視為表頭，預設 true
}

export interface OcrProgressEvent {
  stage: 'init' | 'load-model' | 'det' | 'rec' | 'table' | 'complete';
  message: string;
  progress: number; // 0 - 100
  current?: number;
  total?: number;
}
