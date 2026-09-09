import _ from 'lodash';

export interface PasswordItem {
  id: string;
  category: string;
  categoryKey: string;
  label: string;
  value: string;
  crackTime: string;
  crackTimeEn: string;
  strength: 'very-strong' | 'strong' | 'moderate' | 'weak';
  color: string;
}

export interface PasswordCategory {
  title: string;
  titleEn: string;
  items: PasswordItem[];
}

const LOWERCASE = 'abcdefghijklmnopqrstuvwxyz';
const UPPERCASE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const NUMBERS = '0123456789';
const SYMBOLS = '!@#$%^&*()_+-=[]{}|;:,.<>?~`\'"';

const AMBIGUOUS = /[0O1lI|`'"]/g;

const WORDLIST = [
  'apple', 'banana', 'orange', 'galaxy', 'forest', 'mountain', 'river', 'ocean',
  'silver', 'golden', 'crystal', 'rocket', 'falcon', 'tiger', 'dragon', 'phoenix',
  'shadow', 'wizard', 'castle', 'knight', 'planet', 'cosmic', 'winter', 'summer',
  'autumn', 'spring', 'breeze', 'thunder', 'storm', 'anchor', 'bridge', 'candle',
  'desert', 'echo', 'feather', 'garden', 'harbor', 'island', 'jungle', 'kettle',
  'lantern', 'meadow', 'nebula', 'oasis', 'pilot', 'quartz', 'radar', 'sailor',
  'temple', 'valley', 'voyage', 'walnut', 'zenith', 'beacon', 'canyon', 'drizzle',
  'ember', 'glacier', 'horizon', 'lagoon', 'monarch', 'prairie', 'summit', 'tundra',
  'whistle', 'aurora', 'clover', 'dynamo', 'fable', 'gadget', 'helix', 'lotus',
  'matrix', 'pebble', 'prism', 'radiant', 'sapphire', 'tempo', 'vortex', 'compass',
  'gravity', 'mirage', 'panther', 'cascade', 'equinox', 'haven', 'magnet', 'spark',
  'stride', 'vector', 'velvet', 'orbit', 'atlas', 'shield', 'quantum', 'pulse'
];

/**
 * Cryptographically secure random integer between [0, max)
 */
function secureRandomInt(max: number): number {
  if (max <= 0) return 0;
  const array = new Uint32Array(1);
  if (typeof window !== 'undefined' && window.crypto) {
    window.crypto.getRandomValues(array);
    return array[0] % max;
  }
  return Math.floor(Math.random() * max);
}

/**
 * Generate random string from a given charset
 */
function generateFromCharset(charset: string, length: number): string {
  let result = '';
  for (let i = 0; i < length; i++) {
    result += charset[secureRandomInt(charset.length)];
  }
  return result;
}

/**
 * Format string with hyphens every N characters
 */
function formatHyphenated(str: string, groupSize = 4): string {
  const parts: string[] = [];
  for (let i = 0; i < str.length; i += groupSize) {
    parts.push(str.slice(i, i + groupSize));
  }
  return parts.join('-');
}

/**
 * Calculate estimated crack time and strength
 */
export function estimatePasswordStrength(password: string): {
  crackTimeZh: string;
  crackTimeEn: string;
  strength: 'very-strong' | 'strong' | 'moderate' | 'weak';
  color: string;
} {
  const cleanPass = password.replace(/-/g, '');
  const len = cleanPass.length;
  if (len === 0) {
    return { crackTimeZh: '瞬間', crackTimeEn: 'Instantly', strength: 'weak', color: '#ef4444' };
  }

  let charsetSize = 0;
  if (/[a-z]/.test(cleanPass)) charsetSize += 26;
  if (/[A-Z]/.test(cleanPass)) charsetSize += 26;
  if (/\d/.test(cleanPass)) charsetSize += 10;
  if (/[^a-zA-Z0-9]/.test(cleanPass)) charsetSize += 32;

  charsetSize = Math.max(10, charsetSize);
  const entropy = Math.log2(charsetSize) * len;

  // Assume 10 billion (1e10) guesses/sec for modern offline GPU cluster
  const guessesPerSecond = 1e10;
  const seconds = (2 ** entropy) / guessesPerSecond;

  let crackTimeZh = '';
  let crackTimeEn = '';
  let strength: 'very-strong' | 'strong' | 'moderate' | 'weak' = 'weak';
  let color = '#ef4444'; // red

  if (seconds < 1) {
    crackTimeZh = '瞬間可破解';
    crackTimeEn = 'guessed instantly';
    strength = 'weak';
    color = '#ef4444';
  } else if (seconds < 60) {
    const s = Math.max(1, Math.round(seconds));
    crackTimeZh = `約 ${s} 秒`;
    crackTimeEn = `guessed in ${s} seconds`;
    strength = 'weak';
    color = '#ef4444';
  } else if (seconds < 3600) {
    const m = Math.max(1, Math.round(seconds / 60));
    crackTimeZh = `約 ${m} 分鐘`;
    crackTimeEn = `guessed in ${m} minutes`;
    strength = 'weak';
    color = '#f97316'; // orange
  } else if (seconds < 86400) {
    const h = Math.max(1, Math.round(seconds / 3600));
    crackTimeZh = `約 ${h} 小時`;
    crackTimeEn = `guessed in ${h} hours`;
    strength = 'moderate';
    color = '#eab308'; // yellow
  } else if (seconds < 86400 * 30) {
    const d = Math.max(1, Math.round(seconds / 86400));
    crackTimeZh = `約 ${d} 天`;
    crackTimeEn = `guessed in ${d} days`;
    strength = 'strong';
    color = '#22c55e'; // green
  } else if (seconds < 86400 * 365) {
    const mo = Math.max(1, Math.round(seconds / (86400 * 30)));
    crackTimeZh = `約 ${mo} 個月`;
    crackTimeEn = `guessed in ${mo} months`;
    strength = 'strong';
    color = '#22c55e';
  } else if (seconds < 86400 * 365 * 100) {
    const y = Math.max(1, Math.round(seconds / (86400 * 365)));
    crackTimeZh = `約 ${y} 年`;
    crackTimeEn = `guessed in ${y} years`;
    strength = 'very-strong';
    color = '#10b981'; // emerald green
  } else if (seconds < 86400 * 365 * 100000) {
    const c = Math.max(1, Math.round(seconds / (86400 * 365 * 100)));
    crackTimeZh = `數百年以上 (${c} 世紀)`;
    crackTimeEn = `guessed in ${c} centuries`;
    strength = 'very-strong';
    color = '#10b981';
  } else {
    crackTimeZh = '數千年至數億年 (極度安全)';
    crackTimeEn = 'guessed in millennia';
    strength = 'very-strong';
    color = '#10b981';
  }

  return { crackTimeZh, crackTimeEn, strength, color };
}

/**
 * Generate a complete set of passwords across all categories
 */
export function generateAllPasswordCategories(options: {
  length: number;
  excludeAmbiguous?: boolean;
}): PasswordCategory[] {
  const { length, excludeAmbiguous = false } = options;

  let lChars = LOWERCASE;
  let uChars = UPPERCASE;
  let nChars = NUMBERS;
  let sChars = SYMBOLS;

  if (excludeAmbiguous) {
    lChars = lChars.replace(AMBIGUOUS, '');
    uChars = uChars.replace(AMBIGUOUS, '');
    nChars = nChars.replace(AMBIGUOUS, '');
    sChars = sChars.replace(AMBIGUOUS, '');
  }

  const allAlpha = lChars + uChars;
  const allAlphaNum = allAlpha + nChars;
  const allAlphaSym = allAlpha + sChars;
  const allCombo = allAlpha + nChars + sChars;

  // 1. Alphabets, Numbers and Symbols
  const full1 = generateFromCharset(allCombo, length);
  const full2 = formatHyphenated(generateFromCharset(allCombo, length), 4);

  // 2. Alphabets & Numbers
  const an1 = generateFromCharset(allAlphaNum, length);
  const an2 = formatHyphenated(generateFromCharset(allAlphaNum, length), 4);

  // 3. Alphabets & Symbols
  const as1 = generateFromCharset(allAlphaSym, length);

  // 4. Symbols only
  const sym1 = generateFromCharset(sChars, length);

  // 5. Alphabets only
  const aLower = generateFromCharset(lChars, length);
  const aMixed = generateFromCharset(allAlpha, length);
  const aGroup = formatHyphenated(generateFromCharset(allAlpha, length), 4);

  // 6. Numbers only
  const num1 = generateFromCharset(nChars, length);
  const num2 = formatHyphenated(generateFromCharset(nChars, length), 4);

  // 7. Passphrase
  const wordCount = Math.max(3, Math.min(6, Math.round(length / 4)));
  const phraseWords: string[] = [];
  for (let i = 0; i < wordCount; i++) {
    phraseWords.push(WORDLIST[secureRandomInt(WORDLIST.length)]);
  }
  const phrase = phraseWords.join('-');

  function buildItem(val: string, label: string, category: string, catKey: string): PasswordItem {
    const est = estimatePasswordStrength(val);
    return {
      id: Math.random().toString(36).substring(2, 9),
      category,
      categoryKey: catKey,
      label,
      value: val,
      crackTime: est.crackTimeZh,
      crackTimeEn: est.crackTimeEn,
      strength: est.strength,
      color: est.color,
    };
  }

  return [
    {
      title: '字母、數字與特殊符號 (Alphabets, Numbers and Symbols)',
      titleEn: 'Alphabets, Numbers and Symbols',
      items: [
        buildItem(full1, '標準全組合', 'Alphabets, Numbers and Symbols', 'alphaNumSym'),
        buildItem(full2, '分組易讀型', 'Alphabets, Numbers and Symbols', 'alphaNumSym'),
      ],
    },
    {
      title: '字母與數字 (Alphabets & Numbers / 無符號)',
      titleEn: 'Alphabets & Numbers',
      items: [
        buildItem(an1, '標準英數混合', 'Alphabets & Numbers', 'alphaNum'),
        buildItem(an2, '分組英數型 (如軟體金鑰)', 'Alphabets & Numbers', 'alphaNum'),
      ],
    },
    {
      title: '字母與特殊符號 (Alphabets & Symbols)',
      titleEn: 'Alphabets & Symbols',
      items: [
        buildItem(as1, '無數字符號混合', 'Alphabets & Symbols', 'alphaSym'),
      ],
    },
    {
      title: '純特殊符號 (Symbols only)',
      titleEn: 'Symbols',
      items: [
        buildItem(sym1, '高熵符號字串', 'Symbols', 'symbols'),
      ],
    },
    {
      title: '純英文字母 (Alphabets only)',
      titleEn: 'Alphabets',
      items: [
        buildItem(aLower, '純小寫字母', 'Alphabets', 'alphabets'),
        buildItem(aMixed, '大小寫混合', 'Alphabets', 'alphabets'),
        buildItem(aGroup, '字母分組型', 'Alphabets', 'alphabets'),
      ],
    },
    {
      title: '純數字 PIN (Numbers only)',
      titleEn: 'Numbers',
      items: [
        buildItem(num1, '純數字 PIN 碼', 'Numbers', 'numbers'),
        buildItem(num2, '分段數字驗證碼 / 卡號', 'Numbers', 'numbers'),
      ],
    },
    {
      title: '好記單字密語 (Passphrase / 口令)',
      titleEn: 'Memorable Passphrase',
      items: [
        buildItem(phrase, '單字口令型 (易記且高熵)', 'Memorable Passphrase', 'passphrase'),
      ],
    },
  ];
}
