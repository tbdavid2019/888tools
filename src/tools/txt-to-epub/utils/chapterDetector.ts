export const DETECTION_MODES = {
  AUTO: 'auto',                  // 自動偵測（系統判斷）
  BY_EMPTY_LINES: 'emptyLines',  // 依空行分章
  BY_SEPARATOR: 'separator',     // 依分隔符號
  BY_KEYWORD: 'keyword',         // 依自訂關鍵字
  SINGLE_CHAPTER: 'single',      // 單一章節
} as const;

export type DetectionMode = typeof DETECTION_MODES[keyof typeof DETECTION_MODES];

export interface TextAnalysis {
  hasPatternChapters: boolean;
  patternChapterCount: number;
  hasBracketNumbers: boolean;
  bracketNumberCount: number;
  emptyLineBlocks: number;
  commonSeparators: Array<{ name: string; count: number }>;
  totalLength: number;
  recommendation: DetectionMode;
  detectedPatterns: string[];
}

export interface Chapter {
  title: string;
  content: string;
}

export interface BookMetadata {
  title: string;
  author: string;
  confidence: {
    title: 'high' | 'medium' | 'low';
    author: 'high' | 'none';
  };
}

/**
 * 分析文字內容，回傳偵測結果與建議
 */
export function analyzeText(text: string): TextAnalysis {
  const analysis: TextAnalysis = {
    hasPatternChapters: false,
    patternChapterCount: 0,
    hasBracketNumbers: false,
    bracketNumberCount: 0,
    emptyLineBlocks: 0,
    commonSeparators: [],
    totalLength: text.length,
    recommendation: DETECTION_MODES.AUTO,
    detectedPatterns: [],
  };

  // 偵測 [數字] 格式
  const bracketPattern = /^\s*\[(\d+)\]/gm;
  const bracketMatches = [...text.matchAll(bracketPattern)];
  if (bracketMatches.length >= 2) {
    analysis.hasBracketNumbers = true;
    analysis.bracketNumberCount = bracketMatches.length;
    analysis.detectedPatterns.push(`[數字] 格式（${bracketMatches.length} 處）`);
  }

  // 偵測傳統章節格式
  const patterns = [
    { regex: /^[　\s]*([☆★✦✧❖◆◇●○■□▲△▼▽♦♠♣♥♡※＊✿❀❁✾✽❃❋✯✰⊙◎►◀▶◁☉✠✡✢✣✤✥✩✪✫✬✭✮][、，,.\s]*[^\r\n]+?)$/gm, name: '符號標記' },
    { regex: /^[　\s]*(第[零一二三四五六七八九十百千\d]+[章節回卷篇集部話])/gm, name: '中文章節' },
    { regex: /^[　\s]*[^\w\s\u4e00-\u9fff]+\s*(\d+\s*章)/gm, name: '符號章節' },
    { regex: /^[　\s]*(Chapter\s+\d+)/gim, name: 'Chapter' },
    { regex: /^[　\s]*(\d+[\.、話]\s*.+?)$/gm, name: '數字編號' },
    { regex: /^[　\s]*([①②③④⑤⑥⑦⑧⑨⑩])/gm, name: '圈號' },
    { regex: /^[　\s]*((?:序章|序幕|楔子|引子|前言|前記|終章|終幕|尾聲|後記|番外|番外[一二三四五六七八九十\d]*|番外篇))/gm, name: '特殊章節' },
    { regex: /^[　\s]*((?:Prologue|Epilogue|Interlude|Foreword|Afterword|Preface))/gim, name: 'Prologue/Epilogue' },
    { regex: /^[　\s]*((?:Ep\.?\s*\d+|EP\s*\d+))/gim, name: 'Ep格式' },
    { regex: /^[　\s]*((?:Act|ACT|Scene|SCENE|PART|Part|Book|BOOK)\s+[\dIVXivx]+)/gm, name: 'Act/Part/Book' },
    { regex: /^[　\s]*((?:Vol\.?\s*\d+|Volume\s+\d+))/gim, name: 'Vol格式' },
    { regex: /^[　\s]*(【.+?】)/gm, name: '【】標題' },
    { regex: /^[　\s]*((?:[（(][零一二三四五六七八九十百\d]+[）)]))/gm, name: '括號編號' },
    { regex: /^[　\s]*([壹貳參肆伍陸柒捌玖拾][、，.\s])/gm, name: '大寫數字' },
    { regex: /^[　\s]*([一二三四五六七八九十]+[、])/gm, name: '中文數字' },
    { regex: /^[　\s]*(S\d+E\d+)/gim, name: '影集格式' },
    { regex: /^[　\s]*((?:Day|LOG|Page|PAGE)\s+\d+)/gim, name: 'Day/LOG/Page' },
  ];

  for (const p of patterns) {
    const matches = [...text.matchAll(p.regex)];
    if (matches.length >= 2) {
      analysis.hasPatternChapters = true;
      analysis.patternChapterCount += matches.length;
      analysis.detectedPatterns.push(`${p.name}（${matches.length} 處）`);
    }
  }

  // 計算空行區塊數量（連續 2+ 空行視為分隔）
  const emptyLineBlocks = text.split(/\n\s*\n\s*\n/).length;
  analysis.emptyLineBlocks = emptyLineBlocks;

  // 偵測常見分隔符號
  const separatorPatterns = [
    { pattern: /^[=]{3,}$/gm, name: '===' },
    { pattern: /^[-]{3,}$/gm, name: '---' },
    { pattern: /^[*]{3,}$/gm, name: '***' },
    { pattern: /^[#]{3,}$/gm, name: '###' },
    { pattern: /^[~]{3,}$/gm, name: '~~~' },
    { pattern: /^[─]{3,}$/gm, name: '───' },
    { pattern: /^[＊]{3,}$/gm, name: '＊＊＊' },
  ];
  
  for (const sep of separatorPatterns) {
    const matches = [...text.matchAll(sep.pattern)];
    if (matches.length >= 2) {
      analysis.commonSeparators.push({ name: sep.name, count: matches.length });
    }
  }

  // 判斷推薦模式
  if (analysis.hasPatternChapters || analysis.hasBracketNumbers) {
    analysis.recommendation = DETECTION_MODES.AUTO;
  } else if (emptyLineBlocks >= 3 && emptyLineBlocks <= 200) {
    analysis.recommendation = DETECTION_MODES.BY_EMPTY_LINES;
  } else {
    analysis.recommendation = DETECTION_MODES.SINGLE_CHAPTER;
  }

  return analysis;
}

/**
 * 主要偵測函數
 */
export function detectChapters(
  text: string,
  mode: DetectionMode = DETECTION_MODES.AUTO,
  options: { separator?: string; keyword?: string } = {}
): Chapter[] {
  if (mode === DETECTION_MODES.BY_EMPTY_LINES) {
    return detectByEmptyLines(text);
  }
  
  if (mode === DETECTION_MODES.BY_SEPARATOR && options.separator) {
    return detectBySeparator(text, options.separator);
  }

  if (mode === DETECTION_MODES.BY_KEYWORD && options.keyword) {
    return detectByKeyword(text, options.keyword);
  }

  if (mode === DETECTION_MODES.SINGLE_CHAPTER) {
    return [{
      title: '全文',
      content: text,
    }];
  }

  return detectByPatterns(text);
}

/**
 * 依規則偵測章節
 */
function detectByPatterns(text: string): Chapter[] {
  const patterns = [
    /^[　\s]*(\[\d+\].*?)$/gm,
    /^[　\s]*([☆★✦✧❖◆◇●○■□▲△▼▽♦♠♣♥♡※＊✿❀❁✾✽❃❋✯✰⊙◎►◀▶◁☉✠✡✢✣✤✥✩✪✫✬✭✮][、，,.\s]*[^\r\n]+?)$/gm,
    /^[　\s]*(第[零一二三四五六七八九十百千\d]+[章節回卷篇集部話].*?)$/gm,
    /^[　\s]*[^\w\s\u4e00-\u9fff]+\s*(\d+\s*章.*?)$/gm,
    /^[　\s]*(Chapter\s+\d+.*?)$/gim,
    /^[　\s]*(CHAPTER\s+\d+.*?)$/gm,
    /^[　\s]*(\d+[\.、話]\s*.+?)$/gm,
    /^[　\s]*([①②③④⑤⑥⑦⑧⑨⑩].+?)$/gm,
    /^[　\s]*(卷[零一二三四五六七八九十百千\d]+.*?)$/gm,
    /^[　\s]*((?:序章|序幕|楔子|引子|前言|前記|終章|終幕|尾聲|後記|番外|番外[一二三四五六七八九十\d]*|番外篇).*?)$/gm,
    /^[　\s]*((?:Prologue|Epilogue|Interlude|Foreword|Afterword|Preface).*?)$/gim,
    /^[　\s]*((?:Ep\.?\s*\d+|EP\s*\d+).*?)$/gim,
    /^[　\s]*((?:Act|ACT|Scene|SCENE|PART|Part|Book|BOOK)\s+[\dIVXivx]+.*?)$/gm,
    /^[　\s]*((?:Vol\.?\s*\d+|Volume\s+\d+).*?)$/gim,
    /^[　\s]*(【.+?】.*?)$/gm,
    /^[　\s]*((?:[（(][零一二三四五六七八九十百\d]+[）)]).*?)$/gm,
    /^[　\s]*([壹貳參肆伍陸柒捌玖拾][、，.\s].+?)$/gm,
    /^[　\s]*([一二三四五六七八九十]+[、].+?)$/gm,
    /^[　\s]*(S\d+E\d+.*?)$/gim,
    /^[　\s]*((?:Day|LOG|Page|PAGE)\s+\d+.*?)$/gim,
  ];

  const groups: Array<Array<{ title: string; index: number }>> = [];
  for (const pattern of patterns) {
    const found = [...text.matchAll(pattern)];
    const group: Array<{ title: string; index: number }> = [];
    for (const match of found) {
      if (match.index === undefined) continue;
      const lineStart = text.lastIndexOf('\n', match.index) + 1;
      const lineEnd = text.indexOf('\n', match.index);
      const fullLine = text.slice(lineStart, lineEnd === -1 ? text.length : lineEnd).trim();
      if (fullLine.length > 30) continue;

      let cleanTitle = match[1].trim();
      cleanTitle = cleanTitle.replace(/^[☆★✦✧❖◆◇●○■□▲△▼▽♦♠♣♥♡※＊✿❀❁✾✽❃❋✯✰⊙◎►◀▶◁☉✠✡✢✣✤✥✩✪✫✬✭✮][、，,.\s]*\d*[、，,.\s]*/, '');
      if (!cleanTitle) cleanTitle = match[1].trim();

      group.push({
        title: cleanTitle,
        index: match.index,
      });
    }
    if (group.length >= 2) {
      groups.push(group);
    }
  }

  let matches: Array<{ title: string; index: number }> = [];
  if (groups.length > 0) {
    groups.sort((a, b) => b.length - a.length);
    matches = groups[0];
  }

  matches.sort((a, b) => a.index - b.index);

  matches = matches.filter((m, i, arr) => {
    if (i === 0) return true;
    return Math.abs(m.index - arr[i - 1].index) > 5;
  });

  if (matches.length === 0) {
    return [{
      title: '全文',
      content: text,
    }];
  }

  const chapters: Chapter[] = [];
  for (let i = 0; i < matches.length; i++) {
    const start = matches[i].index;
    const end = i < matches.length - 1 ? matches[i + 1].index : text.length;
    const content = text.slice(start, end).trim();

    chapters.push({
      title: matches[i].title,
      content,
    });
  }

  if (matches.length > 0 && matches[0].index > 100) {
    const preface = text.slice(0, matches[0].index).trim();
    if (preface.length > 50) {
      chapters.unshift({
        title: '序',
        content: preface,
      });
    }
  }

  return chapters;
}

/**
 * 依空行分章
 */
function detectByEmptyLines(text: string): Chapter[] {
  const blocks = text.split(/\n\s*\n\s*\n+/)
    .map(block => block.trim())
    .filter(block => block.length > 0);

  if (blocks.length === 0) {
    return [{ title: '全文', content: text }];
  }

  if (blocks.length === 1) {
    return [{ title: '全文', content: blocks[0] }];
  }

  return blocks.map((block, index) => {
    const lines = block.split('\n');
    const firstLine = lines[0].trim();
    
    let title: string;
    if (firstLine.length <= 50 && firstLine.length > 0) {
      title = firstLine;
    } else {
      title = `章節 ${index + 1}`;
    }

    return {
      title,
      content: block,
    };
  });
}

/**
 * 依分隔符號分章
 */
function detectBySeparator(text: string, separator: string): Chapter[] {
  const escapedSeparator = separator.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`^[\\s]*${escapedSeparator}+[\\s]*$`, 'gm');
  
  const blocks = text.split(regex)
    .map(block => block.trim())
    .filter(block => block.length > 0);

  if (blocks.length === 0) {
    return [{ title: '全文', content: text }];
  }

  if (blocks.length === 1) {
    return [{ title: '全文', content: blocks[0] }];
  }

  return blocks.map((block, index) => {
    const lines = block.split('\n');
    const firstLine = lines[0].trim();
    
    let title: string;
    if (firstLine.length <= 50 && firstLine.length > 0) {
      title = firstLine;
    } else {
      title = `章節 ${index + 1}`;
    }

    return {
      title,
      content: block,
    };
  });
}

/**
 * 依自訂關鍵字偵測章節
 */
function detectByKeyword(text: string, keyword: string): Chapter[] {
  if (!keyword || !keyword.trim()) {
    return [{ title: '全文', content: text }];
  }

  const escaped = keyword.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`^[　\\s]*([^\\r\\n]*${escaped}[^\\r\\n]*?)$`, 'gm');
  const found = [...text.matchAll(regex)];
  let matches: Array<{ title: string; index: number }> = [];

  for (const match of found) {
    if (match.index === undefined) continue;
    const lineStart = text.lastIndexOf('\n', match.index) + 1;
    const lineEnd = text.indexOf('\n', match.index);
    const fullLine = text.slice(lineStart, lineEnd === -1 ? text.length : lineEnd).trim();
    if (fullLine.length > 40) continue;
    matches.push({ title: match[1].trim(), index: match.index });
  }

  matches = matches.filter((m, i, arr) => {
    if (i === 0) return true;
    return Math.abs(m.index - arr[i - 1].index) > 5;
  });

  if (matches.length === 0) {
    return [{ title: '全文', content: text }];
  }

  const chapters: Chapter[] = [];
  for (let i = 0; i < matches.length; i++) {
    const start = matches[i].index;
    const end = i < matches.length - 1 ? matches[i + 1].index : text.length;
    chapters.push({ title: matches[i].title, content: text.slice(start, end).trim() });
  }

  if (matches.length > 0 && matches[0].index > 100) {
    const preface = text.slice(0, matches[0].index).trim();
    if (preface.length > 50) {
      chapters.unshift({ title: '序', content: preface });
    }
  }

  return chapters;
}

/**
 * 自動偵測書籍元資料（書名、作者）
 */
export function detectBookMetadata(text: string, fileName: string = ''): BookMetadata {
  const result: BookMetadata = {
    title: fileName || '',
    author: '',
    confidence: { title: 'low', author: 'none' },
  };

  if (fileName) {
    const fileNamePatterns = [
      /^《(.+?)》\s*[-_—]?\s*(.+?)$/,
      /^(.+?)\s*[-_—]?\s*《(.+?)》$/,
      /^[\[【](.+?)[\]】]\s*[-_—]?\s*(.+?)$/,
      /^(.+?)\s*[-_—]?\s*[\[【](.+?)[\]】]$/,
      /^(.+?)\s+[Bb][Yy]\s+(.+?)$/,
      /^(.+?)\s*[（(](.+?)[）)]$/,
      /^(.+?)\s*[-_—]\s*(.+?)$/,
    ];

    for (const pattern of fileNamePatterns) {
      const match = fileName.match(pattern);
      if (match) {
        const [, part1, part2] = match;
        
        if (pattern.source.includes('《')) {
          if (pattern.source.startsWith('^《')) {
            result.title = part1.trim();
            result.author = part2.trim();
          } else {
            result.author = part1.trim();
            result.title = part2.trim();
          }
        } else if (pattern.source.includes('[Bb][Yy]')) {
          result.title = part1.trim();
          result.author = part2.trim();
        } else if (pattern.source.includes('[（(]')) {
          result.title = part1.trim();
          result.author = part2.trim();
        } else if (pattern.source.startsWith('^[\\[【]')) {
          result.author = part1.trim();
          result.title = part2.trim();
        } else if (pattern.source.includes('[\\[【]$')) {
          result.title = part1.trim();
          result.author = part2.trim();
        } else {
          if (part1.length > part2.length * 2 && part2.length <= 10) {
            result.title = part1.trim();
            result.author = part2.trim();
          } else {
            result.author = part1.trim();
            result.title = part2.trim();
          }
        }
        
        result.confidence.title = 'high';
        result.confidence.author = 'high';
        break;
      }
    }
  }

  const lines = text.split('\n').slice(0, 30);
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    if (line.length > 60) continue;
    
    const authorPatterns = [
      /^(?:作者|著者|原著|作|文|撰)[\s]*[：:︰]\s*(.+?)$/i,
      /^(?:Author|Written\s+by|By)[\s]*[：:]?\s*(.+?)$/i,
      /^[——\-─]+\s*(.{2,15})\s*[著作撰文]$/,
      /^(.{2,15})\s*[著作撰文]$/,
    ];
    
    for (const pattern of authorPatterns) {
      const match = line.match(pattern);
      if (match) {
        const authorCandidate = match[1].trim();
        if (authorCandidate.length >= 2 && 
            authorCandidate.length <= 20 &&
            !authorCandidate.match(/第[零一二三四五六七八九十百千\d]+[章節回卷篇集部]/)) {
          result.author = authorCandidate;
          result.confidence.author = 'high';
          break;
        }
      }
    }
    
    if (result.confidence.title !== 'high') {
      const titlePatterns = [
        /^(?:書名|篇名|名稱|Title)[\s]*[：:︰]\s*(.+?)$/i,
        /^《(.+?)》$/,
        /^【(.+?)】$/,
      ];
      
      for (const pattern of titlePatterns) {
        const match = line.match(pattern);
        if (match) {
          const titleCandidate = match[1].trim();
          if (titleCandidate.length >= 1 && titleCandidate.length <= 50) {
            result.title = titleCandidate;
            result.confidence.title = 'high';
            break;
          }
        }
      }
    }
    
    if (i === 0 && result.confidence.title !== 'high' && line.length <= 30) {
      const possibleTitle = line.replace(/^[《【\[]|[》】\]]$/g, '');
      if (!possibleTitle.match(/作者|著者|Author/i)) {
        result.title = possibleTitle;
        result.confidence.title = 'medium';
      }
    }
  }

  result.title = result.title.trim();
  result.author = result.author.trim();
  
  return result;
}
