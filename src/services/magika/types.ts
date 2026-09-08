export type ContentCategory =
  | 'ebook'
  | 'document'
  | 'code'
  | 'image'
  | 'audio'
  | 'video'
  | 'archive'
  | 'font'
  | 'database'
  | 'executable'
  | 'text'
  | 'binary'
  | 'unknown';

export interface ToolSuggestion {
  name: string;
  path: string;
  action: string;
  icon?: string;
}

export interface ContentTypeMeta {
  label: string;
  name: string;
  nameEn: string;
  mimeType: string;
  extensions: string[];
  category: ContentCategory;
  description: string;
  suggestedTools?: ToolSuggestion[];
}

export interface ScoreItem {
  label: string;
  name: string;
  score: number;
  scorePercent: string;
}

export interface MagikaDetection {
  label: string;
  name: string;
  nameEn: string;
  mimeType: string;
  extensions: string[];
  category: ContentCategory;
  description: string;
  isText: boolean;
  score: number;
  scorePercent: string;
  overwriteReason: string;
  topPredictions: ScoreItem[];
  suggestedTools: ToolSuggestion[];
  isExtensionMismatch: boolean;
  detectedExtension?: string;
}
