import { type Lab, deltaE2000, getDeltaEAssessment, hexToLab, hexToRgb, rgbToCmyk } from './delta-e-2000';

export interface PantoneColor {
  code: string;
  name: string;
  hex: string;
  category: 'Color of the Year' | 'Formula Guide Coated' | 'Fashion, Home + Interiors' | 'Pantone Pastels & Neons';
  year?: number;
  lab?: Lab;
}

export interface PantoneMatch extends PantoneColor {
  deltaE: number;
  assessment: ReturnType<typeof getDeltaEAssessment>;
  rgb: string;
  cmyk: string;
}

/**
 * Curated comprehensive Pantone Color Library
 * Includes 2000-2026 Colors of the Year, Formula Guide Coated (C),
 * and popular Fashion Home Interiors (TCX).
 */
export const rawPantoneColors: PantoneColor[] = [
  // --- Pantone Colors of the Year (2000 - 2026) ---
  { code: 'PANTONE 11-4201 TCX', name: 'Cloud Dancer', hex: '#F0EFEA', category: 'Color of the Year', year: 2026 },
  { code: 'PANTONE 17-1230 TCX', name: 'Mocha Mousse', hex: '#A47864', category: 'Color of the Year', year: 2025 },
  { code: 'PANTONE 13-1023 TCX', name: 'Peach Fuzz', hex: '#FFBE98', category: 'Color of the Year', year: 2024 },
  { code: 'PANTONE 18-1750 TCX', name: 'Viva Magenta', hex: '#BB2649', category: 'Color of the Year', year: 2023 },
  { code: 'PANTONE 17-3938 TCX', name: 'Very Peri', hex: '#6667AB', category: 'Color of the Year', year: 2022 },
  { code: 'PANTONE 17-5104 TCX', name: 'Ultimate Gray', hex: '#939597', category: 'Color of the Year', year: 2021 },
  { code: 'PANTONE 13-0647 TCX', name: 'Illuminating', hex: '#F5DF4D', category: 'Color of the Year', year: 2021 },
  { code: 'PANTONE 19-4052 TCX', name: 'Classic Blue', hex: '#0F4C81', category: 'Color of the Year', year: 2020 },
  { code: 'PANTONE 16-1546 TCX', name: 'Living Coral', hex: '#FF6F61', category: 'Color of the Year', year: 2019 },
  { code: 'PANTONE 18-3838 TCX', name: 'Ultra Violet', hex: '#5F4B8B', category: 'Color of the Year', year: 2018 },
  { code: 'PANTONE 15-0343 TCX', name: 'Greenery', hex: '#88B04B', category: 'Color of the Year', year: 2017 },
  { code: 'PANTONE 13-1520 TCX', name: 'Rose Quartz', hex: '#F7CAC9', category: 'Color of the Year', year: 2016 },
  { code: 'PANTONE 15-3919 TCX', name: 'Serenity', hex: '#92A8D1', category: 'Color of the Year', year: 2016 },
  { code: 'PANTONE 18-1438 TCX', name: 'Marsala', hex: '#955251', category: 'Color of the Year', year: 2015 },
  { code: 'PANTONE 18-3224 TCX', name: 'Radiant Orchid', hex: '#B163A3', category: 'Color of the Year', year: 2014 },
  { code: 'PANTONE 17-5641 TCX', name: 'Emerald', hex: '#009B77', category: 'Color of the Year', year: 2013 },
  { code: 'PANTONE 17-1463 TCX', name: 'Tangerine Tango', hex: '#DD4124', category: 'Color of the Year', year: 2012 },
  { code: 'PANTONE 18-2120 TCX', name: 'Honeysuckle', hex: '#D65076', category: 'Color of the Year', year: 2011 },
  { code: 'PANTONE 15-5519 TCX', name: 'Turquoise', hex: '#45B5AA', category: 'Color of the Year', year: 2010 },
  { code: 'PANTONE 14-0848 TCX', name: 'Mimosa', hex: '#EFC050', category: 'Color of the Year', year: 2009 },
  { code: 'PANTONE 18-3943 TCX', name: 'Blue Iris', hex: '#5A5B9F', category: 'Color of the Year', year: 2008 },
  { code: 'PANTONE 19-1557 TCX', name: 'Chili Pepper', hex: '#9B2335', category: 'Color of the Year', year: 2007 },
  { code: 'PANTONE 13-1106 TCX', name: 'Sand Dollar', hex: '#DECDBE', category: 'Color of the Year', year: 2006 },
  { code: 'PANTONE 15-5217 TCX', name: 'Blue Turquoise', hex: '#53B0AE', category: 'Color of the Year', year: 2005 },
  { code: 'PANTONE 17-1456 TCX', name: 'Tigerlily', hex: '#E15D44', category: 'Color of the Year', year: 2004 },
  { code: 'PANTONE 14-4811 TCX', name: 'Aqua Sky', hex: '#7BC4C4', category: 'Color of the Year', year: 2003 },
  { code: 'PANTONE 19-1664 TCX', name: 'True Red', hex: '#BF1932', category: 'Color of the Year', year: 2002 },
  { code: 'PANTONE 17-2031 TCX', name: 'Fuchsia Rose', hex: '#C74375', category: 'Color of the Year', year: 2001 },
  { code: 'PANTONE 15-4020 TCX', name: 'Cerulean Blue', hex: '#9BB7D4', category: 'Color of the Year', year: 2000 },

  // --- Base Formula Guide Standards ---
  { code: 'PANTONE Yellow C', name: 'Yellow', hex: '#FEDD00', category: 'Formula Guide Coated' },
  { code: 'PANTONE Yellow 012 C', name: 'Yellow 012', hex: '#FFD700', category: 'Formula Guide Coated' },
  { code: 'PANTONE Orange 021 C', name: 'Orange 021', hex: '#FE5000', category: 'Formula Guide Coated' },
  { code: 'PANTONE Warm Red C', name: 'Warm Red', hex: '#F9423A', category: 'Formula Guide Coated' },
  { code: 'PANTONE Red 032 C', name: 'Red 032', hex: '#EF3340', category: 'Formula Guide Coated' },
  { code: 'PANTONE Rubine Red C', name: 'Rubine Red', hex: '#CE0058', category: 'Formula Guide Coated' },
  { code: 'PANTONE Rhodamine Red C', name: 'Rhodamine Red', hex: '#E10098', category: 'Formula Guide Coated' },
  { code: 'PANTONE Purple C', name: 'Purple', hex: '#BB29BB', category: 'Formula Guide Coated' },
  { code: 'PANTONE Violet C', name: 'Violet', hex: '#440099', category: 'Formula Guide Coated' },
  { code: 'PANTONE Medium Purple C', name: 'Medium Purple', hex: '#875695', category: 'Formula Guide Coated' },
  { code: 'PANTONE Blue 072 C', name: 'Blue 072', hex: '#10069F', category: 'Formula Guide Coated' },
  { code: 'PANTONE Reflex Blue C', name: 'Reflex Blue', hex: '#0A1172', category: 'Formula Guide Coated' },
  { code: 'PANTONE Process Blue C', name: 'Process Blue', hex: '#0085CA', category: 'Formula Guide Coated' },
  { code: 'PANTONE Process Cyan C', name: 'Process Cyan', hex: '#009FDF', category: 'Formula Guide Coated' },
  { code: 'PANTONE Process Magenta C', name: 'Process Magenta', hex: '#EC008C', category: 'Formula Guide Coated' },
  { code: 'PANTONE Process Yellow C', name: 'Process Yellow', hex: '#FFEC00', category: 'Formula Guide Coated' },
  { code: 'PANTONE Process Black C', name: 'Process Black', hex: '#27251F', category: 'Formula Guide Coated' },
  { code: 'PANTONE Green C', name: 'Green', hex: '#00AB84', category: 'Formula Guide Coated' },
  { code: 'PANTONE Black C', name: 'Black', hex: '#2D2926', category: 'Formula Guide Coated' },

  // --- Yellows & Ambers ---
  { code: 'PANTONE 100 C', name: 'Light Primrose Yellow', hex: '#F6EB61', category: 'Formula Guide Coated' },
  { code: 'PANTONE 101 C', name: 'Lemon Yellow', hex: '#F7EA48', category: 'Formula Guide Coated' },
  { code: 'PANTONE 102 C', name: 'Canary Yellow', hex: '#FCE300', category: 'Formula Guide Coated' },
  { code: 'PANTONE 106 C', name: 'Pale Sun', hex: '#F7E658', category: 'Formula Guide Coated' },
  { code: 'PANTONE 107 C', name: 'Sunburst', hex: '#FFE700', category: 'Formula Guide Coated' },
  { code: 'PANTONE 108 C', name: 'Bright Yellow', hex: '#FFDD00', category: 'Formula Guide Coated' },
  { code: 'PANTONE 109 C', name: 'Goldenrod', hex: '#FFD100', category: 'Formula Guide Coated' },
  { code: 'PANTONE 110 C', name: 'Mustard Gold', hex: '#DAAA00', category: 'Formula Guide Coated' },
  { code: 'PANTONE 111 C', name: 'Antique Gold', hex: '#AA8A00', category: 'Formula Guide Coated' },
  { code: 'PANTONE 112 C', name: 'Olive Gold', hex: '#9B7D00', category: 'Formula Guide Coated' },
  { code: 'PANTONE 113 C', name: 'Corn Yellow', hex: '#F7DE61', category: 'Formula Guide Coated' },
  { code: 'PANTONE 114 C', name: 'Buttercup', hex: '#FADC41', category: 'Formula Guide Coated' },
  { code: 'PANTONE 115 C', name: 'Daffodil', hex: '#FDDB24', category: 'Formula Guide Coated' },
  { code: 'PANTONE 116 C', name: 'Sunflower Yellow', hex: '#FFCD00', category: 'Formula Guide Coated' },
  { code: 'PANTONE 117 C', name: 'Bronze Gold', hex: '#C99700', category: 'Formula Guide Coated' },
  { code: 'PANTONE 118 C', name: 'Tuscan Sun', hex: '#A17A00', category: 'Formula Guide Coated' },
  { code: 'PANTONE 120 C', name: 'Cream Yellow', hex: '#FBDE76', category: 'Formula Guide Coated' },
  { code: 'PANTONE 121 C', name: 'Pale Banana', hex: '#FCD856', category: 'Formula Guide Coated' },
  { code: 'PANTONE 122 C', name: 'Mellow Yellow', hex: '#FED141', category: 'Formula Guide Coated' },
  { code: 'PANTONE 123 C', name: 'School Bus Yellow', hex: '#FFC72C', category: 'Formula Guide Coated' },
  { code: 'PANTONE 124 C', name: 'Deep Ochre', hex: '#EAAA00', category: 'Formula Guide Coated' },
  { code: 'PANTONE 125 C', name: 'Raw Umber Yellow', hex: '#B58500', category: 'Formula Guide Coated' },
  { code: 'PANTONE 129 C', name: 'Amber Glow', hex: '#F3CD44', category: 'Formula Guide Coated' },
  { code: 'PANTONE 130 C', name: 'Marigold', hex: '#F2A900', category: 'Formula Guide Coated' },
  { code: 'PANTONE 131 C', name: 'Butterscotch', hex: '#CC8A00', category: 'Formula Guide Coated' },
  { code: 'PANTONE 137 C', name: 'Apricot', hex: '#FFA300', category: 'Formula Guide Coated' },
  { code: 'PANTONE 138 C', name: 'Warm Amber', hex: '#DE7C00', category: 'Formula Guide Coated' },
  { code: 'PANTONE 144 C', name: 'Carrot Orange', hex: '#ED8B00', category: 'Formula Guide Coated' },
  { code: 'PANTONE 1495 C', name: 'Papaya', hex: '#FF8F39', category: 'Formula Guide Coated' },
  { code: 'PANTONE 151 C', name: 'Vibrant Orange', hex: '#FF8200', category: 'Formula Guide Coated' },
  { code: 'PANTONE 152 C', name: 'Clementine', hex: '#E56A00', category: 'Formula Guide Coated' },
  { code: 'PANTONE 158 C', name: 'Pumpkin Orange', hex: '#E87722', category: 'Formula Guide Coated' },
  { code: 'PANTONE 165 C', name: 'Bright Orange', hex: '#FF671F', category: 'Formula Guide Coated' },
  { code: 'PANTONE 166 C', name: 'Persimmon Red', hex: '#E35205', category: 'Formula Guide Coated' },
  { code: 'PANTONE 172 C', name: 'Flame Red', hex: '#FA4616', category: 'Formula Guide Coated' },
  { code: 'PANTONE 173 C', name: 'Crimson Orange', hex: '#D03C15', category: 'Formula Guide Coated' },

  // --- Reds & Corals ---
  { code: 'PANTONE 176 C', name: 'Blush Pink', hex: '#FCAEBB', category: 'Formula Guide Coated' },
  { code: 'PANTONE 177 C', name: 'Salmon Coral', hex: '#FF8993', category: 'Formula Guide Coated' },
  { code: 'PANTONE 178 C', name: 'Coral Kiss', hex: '#F96374', category: 'Formula Guide Coated' },
  { code: 'PANTONE 179 C', name: 'Bright Scarlet', hex: '#E03C31', category: 'Formula Guide Coated' },
  { code: 'PANTONE 185 C', name: 'Cadmium Red', hex: '#E4002B', category: 'Formula Guide Coated' },
  { code: 'PANTONE 186 C', name: 'Crimson Red', hex: '#C8102E', category: 'Formula Guide Coated' },
  { code: 'PANTONE 187 C', name: 'Brick Cardinal', hex: '#A6192E', category: 'Formula Guide Coated' },
  { code: 'PANTONE 192 C', name: 'Poppy Red', hex: '#E40046', category: 'Formula Guide Coated' },
  { code: 'PANTONE 193 C', name: 'Ruby Red', hex: '#BF0D3E', category: 'Formula Guide Coated' },
  { code: 'PANTONE 199 C', name: 'Cherry Red', hex: '#D50032', category: 'Formula Guide Coated' },
  { code: 'PANTONE 200 C', name: 'Carmine Red', hex: '#BA0C2F', category: 'Formula Guide Coated' },
  { code: 'PANTONE 201 C', name: 'Burgundy Red', hex: '#9D2235', category: 'Formula Guide Coated' },
  { code: 'PANTONE 202 C', name: 'Wine Red', hex: '#862633', category: 'Formula Guide Coated' },
  { code: 'PANTONE 2035 C', name: 'Speed Red', hex: '#DA291C', category: 'Formula Guide Coated' },
  { code: 'PANTONE 2042 C', name: 'Imperial Maroon', hex: '#7A131A', category: 'Formula Guide Coated' },

  // --- Pinks, Magentas & Purples ---
  { code: 'PANTONE 210 C', name: 'Cotton Candy', hex: '#F9A3B2', category: 'Formula Guide Coated' },
  { code: 'PANTONE 211 C', name: 'Carnation Pink', hex: '#F5728E', category: 'Formula Guide Coated' },
  { code: 'PANTONE 212 C', name: 'Flamingo Pink', hex: '#F14371', category: 'Formula Guide Coated' },
  { code: 'PANTONE 213 C', name: 'Bubblegum', hex: '#E31C5F', category: 'Formula Guide Coated' },
  { code: 'PANTONE 214 C', name: 'Deep Fuchsia', hex: '#CE0F53', category: 'Formula Guide Coated' },
  { code: 'PANTONE 219 C', name: 'Barbie Pink', hex: '#DA1884', category: 'Formula Guide Coated' },
  { code: 'PANTONE 225 C', name: 'Neon Fuchsia', hex: '#DF1995', category: 'Formula Guide Coated' },
  { code: 'PANTONE 226 C', name: 'Hot Magenta', hex: '#D60270', category: 'Formula Guide Coated' },
  { code: 'PANTONE 233 C', name: 'Imperial Magenta', hex: '#B8006E', category: 'Formula Guide Coated' },
  { code: 'PANTONE 239 C', name: 'Electric Violet', hex: '#BD3B9F', category: 'Formula Guide Coated' },
  { code: 'PANTONE 240 C', name: 'Plum Purple', hex: '#A81F8D', category: 'Formula Guide Coated' },
  { code: 'PANTONE 252 C', name: 'Lavender Mist', hex: '#C283B5', category: 'Formula Guide Coated' },
  { code: 'PANTONE 253 C', name: 'Amethyst', hex: '#AE2573', category: 'Formula Guide Coated' },
  { code: 'PANTONE 254 C', name: 'Royal Orchid', hex: '#9B26B6', category: 'Formula Guide Coated' },
  { code: 'PANTONE 259 C', name: 'Deep Grape', hex: '#6D2077', category: 'Formula Guide Coated' },
  { code: 'PANTONE 260 C', name: 'Byzantium', hex: '#5B1761', category: 'Formula Guide Coated' },
  { code: 'PANTONE 266 C', name: 'Indigo Purple', hex: '#753BBD', category: 'Formula Guide Coated' },
  { code: 'PANTONE 268 C', name: 'Regal Violet', hex: '#582C83', category: 'Formula Guide Coated' },
  { code: 'PANTONE 272 C', name: 'Periwinkle Light', hex: '#877BC4', category: 'Formula Guide Coated' },
  { code: 'PANTONE 273 C', name: 'Midnight Violet', hex: '#3E2568', category: 'Formula Guide Coated' },

  // --- Blues & Cyans ---
  { code: 'PANTONE 279 C', name: 'Sky Cerulean', hex: '#418FDE', category: 'Formula Guide Coated' },
  { code: 'PANTONE 280 C', name: 'Navy Blue', hex: '#012169', category: 'Formula Guide Coated' },
  { code: 'PANTONE 285 C', name: 'Pacific Blue', hex: '#0072CE', category: 'Formula Guide Coated' },
  { code: 'PANTONE 286 C', name: 'Royal Blue', hex: '#0033A0', category: 'Formula Guide Coated' },
  { code: 'PANTONE 287 C', name: 'Cobalt Blue', hex: '#002F6C', category: 'Formula Guide Coated' },
  { code: 'PANTONE 288 C', name: 'Sapphire Blue', hex: '#002D62', category: 'Formula Guide Coated' },
  { code: 'PANTONE 292 C', name: 'Baby Blue', hex: '#69B3E7', category: 'Formula Guide Coated' },
  { code: 'PANTONE 293 C', name: 'Ultramarine', hex: '#0051BA', category: 'Formula Guide Coated' },
  { code: 'PANTONE 294 C', name: 'Dark Ultramarine', hex: '#002F6C', category: 'Formula Guide Coated' },
  { code: 'PANTONE 295 C', name: 'Deep Oceanic Blue', hex: '#002855', category: 'Formula Guide Coated' },
  { code: 'PANTONE 298 C', name: 'Bright Azure', hex: '#41B6E6', category: 'Formula Guide Coated' },
  { code: 'PANTONE 299 C', name: 'Capri Blue', hex: '#00A3E0', category: 'Formula Guide Coated' },
  { code: 'PANTONE 300 C', name: 'Corporate Blue', hex: '#005EB8', category: 'Formula Guide Coated' },
  { code: 'PANTONE 301 C', name: 'Deep Steel Blue', hex: '#004B87', category: 'Formula Guide Coated' },
  { code: 'PANTONE 305 C', name: 'Cyan Aqua', hex: '#59CBE8', category: 'Formula Guide Coated' },
  { code: 'PANTONE 306 C', name: 'Electric Cyan', hex: '#00B5E2', category: 'Formula Guide Coated' },
  { code: 'PANTONE 311 C', name: 'Robins Egg', hex: '#05C3DE', category: 'Formula Guide Coated' },
  { code: 'PANTONE 312 C', name: 'Caribbean Blue', hex: '#00A9CE', category: 'Formula Guide Coated' },
  { code: 'PANTONE 313 C', name: 'Lagoon Blue', hex: '#0092BC', category: 'Formula Guide Coated' },
  { code: 'PANTONE 314 C', name: 'Peacock Blue', hex: '#007A9E', category: 'Formula Guide Coated' },
  { code: 'PANTONE 319 C', name: 'Seafoam Aqua', hex: '#2CD5C4', category: 'Formula Guide Coated' },
  { code: 'PANTONE 320 C', name: 'Deep Teal', hex: '#009CA6', category: 'Formula Guide Coated' },
  { code: 'PANTONE 321 C', name: 'Ocean Green', hex: '#00857C', category: 'Formula Guide Coated' },
  { code: 'PANTONE 322 C', name: 'Dark Petrol', hex: '#00736C', category: 'Formula Guide Coated' },

  // --- Greens & Mints ---
  { code: 'PANTONE 337 C', name: 'Spearmint Pale', hex: '#95D6B4', category: 'Formula Guide Coated' },
  { code: 'PANTONE 338 C', name: 'Spring Mint', hex: '#71C598', category: 'Formula Guide Coated' },
  { code: 'PANTONE 339 C', name: 'Jade Green', hex: '#00B159', category: 'Formula Guide Coated' },
  { code: 'PANTONE 340 C', name: 'Kelly Green', hex: '#009A44', category: 'Formula Guide Coated' },
  { code: 'PANTONE 341 C', name: 'Pine Green', hex: '#007A3D', category: 'Formula Guide Coated' },
  { code: 'PANTONE 347 C', name: 'Classic Shamrock', hex: '#009A44', category: 'Formula Guide Coated' },
  { code: 'PANTONE 348 C', name: 'Irish Green', hex: '#00843D', category: 'Formula Guide Coated' },
  { code: 'PANTONE 349 C', name: 'Hunter Green', hex: '#046A38', category: 'Formula Guide Coated' },
  { code: 'PANTONE 354 C', name: 'Vivid Clover', hex: '#00B140', category: 'Formula Guide Coated' },
  { code: 'PANTONE 355 C', name: 'Forest Green', hex: '#009639', category: 'Formula Guide Coated' },
  { code: 'PANTONE 356 C', name: 'Evergreen', hex: '#007A33', category: 'Formula Guide Coated' },
  { code: 'PANTONE 360 C', name: 'Apple Green', hex: '#6CC24A', category: 'Formula Guide Coated' },
  { code: 'PANTONE 361 C', name: 'Leaf Green', hex: '#43B02A', category: 'Formula Guide Coated' },
  { code: 'PANTONE 362 C', name: 'Lush Green', hex: '#389622', category: 'Formula Guide Coated' },
  { code: 'PANTONE 368 C', name: 'Lime Green', hex: '#78BE20', category: 'Formula Guide Coated' },
  { code: 'PANTONE 375 C', name: 'Neon Lime', hex: '#97D700', category: 'Formula Guide Coated' },
  { code: 'PANTONE 376 C', name: 'Chartreuse', hex: '#84BD00', category: 'Formula Guide Coated' },
  { code: 'PANTONE 382 C', name: 'Electric Olive', hex: '#C4D600', category: 'Formula Guide Coated' },
  { code: 'PANTONE 389 C', name: 'Highlighter Green', hex: '#D0DF00', category: 'Formula Guide Coated' },
  { code: 'PANTONE 575 C', name: 'Army Olive', hex: '#58732E', category: 'Formula Guide Coated' },

  // --- Browns, Neutrals & Warm Tones ---
  { code: 'PANTONE 465 C', name: 'Khaki Beige', hex: '#C39E6D', category: 'Formula Guide Coated' },
  { code: 'PANTONE 466 C', name: 'Camel Tan', hex: '#C6A972', category: 'Formula Guide Coated' },
  { code: 'PANTONE 467 C', name: 'Cream Sand', hex: '#D6C096', category: 'Formula Guide Coated' },
  { code: 'PANTONE 468 C', name: 'Vanilla Wheat', hex: '#E3D4B6', category: 'Formula Guide Coated' },
  { code: 'PANTONE 469 C', name: 'Coffee Brown', hex: '#5C311E', category: 'Formula Guide Coated' },
  { code: 'PANTONE 470 C', name: 'Chestnut', hex: '#8D4925', category: 'Formula Guide Coated' },
  { code: 'PANTONE 471 C', name: 'Cinnamon Bark', hex: '#AD5927', category: 'Formula Guide Coated' },
  { code: 'PANTONE 472 C', name: 'Warm Terracotta', hex: '#D47E53', category: 'Formula Guide Coated' },
  { code: 'PANTONE 476 C', name: 'Dark Chocolate', hex: '#4E3629', category: 'Formula Guide Coated' },
  { code: 'PANTONE 7527 C', name: 'Alabaster Gray', hex: '#D6D2C4', category: 'Formula Guide Coated' },
  { code: 'PANTONE 7530 C', name: 'Mushroom Taupe', hex: '#8C827A', category: 'Formula Guide Coated' },

  // --- Cool & Warm Grays ---
  { code: 'PANTONE Cool Gray 1 C', name: 'Cool Gray 1', hex: '#D9D9D6', category: 'Formula Guide Coated' },
  { code: 'PANTONE Cool Gray 3 C', name: 'Cool Gray 3', hex: '#C8C9C7', category: 'Formula Guide Coated' },
  { code: 'PANTONE Cool Gray 5 C', name: 'Cool Gray 5', hex: '#B1B3B3', category: 'Formula Guide Coated' },
  { code: 'PANTONE Cool Gray 7 C', name: 'Cool Gray 7', hex: '#97999B', category: 'Formula Guide Coated' },
  { code: 'PANTONE Cool Gray 9 C', name: 'Cool Gray 9', hex: '#75787B', category: 'Formula Guide Coated' },
  { code: 'PANTONE Cool Gray 11 C', name: 'Cool Gray 11', hex: '#53565A', category: 'Formula Guide Coated' },
  { code: 'PANTONE Warm Gray 1 C', name: 'Warm Gray 1', hex: '#D7D2CB', category: 'Formula Guide Coated' },
  { code: 'PANTONE Warm Gray 3 C', name: 'Warm Gray 3', hex: '#BFB8AF', category: 'Formula Guide Coated' },
  { code: 'PANTONE Warm Gray 5 C', name: 'Warm Gray 5', hex: '#AC9F93', category: 'Formula Guide Coated' },
  { code: 'PANTONE Warm Gray 7 C', name: 'Warm Gray 7', hex: '#968C83', category: 'Formula Guide Coated' },
  { code: 'PANTONE Warm Gray 9 C', name: 'Warm Gray 9', hex: '#83786F', category: 'Formula Guide Coated' },
  { code: 'PANTONE Warm Gray 11 C', name: 'Warm Gray 11', hex: '#6E6259', category: 'Formula Guide Coated' },
  { code: 'PANTONE Black 6 C', name: 'Midnight Charcoal', hex: '#101820', category: 'Formula Guide Coated' },
  { code: 'PANTONE Black 7 C', name: 'Onyx Black', hex: '#3D3935', category: 'Formula Guide Coated' },

  // --- Fashion, Home + Interiors (TCX Highlights) ---
  { code: 'PANTONE 19-4029 TCX', name: 'Navy Peony', hex: '#223A5E', category: 'Fashion, Home + Interiors' },
  { code: 'PANTONE 19-4034 TCX', name: 'Sailor Blue', hex: '#1F2A44', category: 'Fashion, Home + Interiors' },
  { code: 'PANTONE 19-4524 TCX', name: 'Shaded Spruce', hex: '#005953', category: 'Fashion, Home + Interiors' },
  { code: 'PANTONE 19-1725 TCX', name: 'Tawny Port', hex: '#562B3B', category: 'Fashion, Home + Interiors' },
  { code: 'PANTONE 17-1558 TCX', name: 'Grenadine', hex: '#DF3F32', category: 'Fashion, Home + Interiors' },
  { code: 'PANTONE 17-1145 TCX', name: 'Autumn Maple', hex: '#C46238', category: 'Fashion, Home + Interiors' },
  { code: 'PANTONE 16-1341 TCX', name: 'Butterum', hex: '#C19A6B', category: 'Fashion, Home + Interiors' },
  { code: 'PANTONE 16-0543 TCX', name: 'Golden Lime', hex: '#999B3C', category: 'Fashion, Home + Interiors' },
  { code: 'PANTONE 14-4202 TCX', name: 'Harbor Mist', hex: '#B4B7BA', category: 'Fashion, Home + Interiors' },
  { code: 'PANTONE 11-0608 TCX', name: 'Coconut Milk', hex: '#F0ECE1', category: 'Fashion, Home + Interiors' },
  { code: 'PANTONE 18-1440 TCX', name: 'Chili Oil', hex: '#8D3F37', category: 'Fashion, Home + Interiors' },
  { code: 'PANTONE 15-1520 TCX', name: 'Blooming Dahlia', hex: '#EB9687', category: 'Fashion, Home + Interiors' },
  { code: 'PANTONE 16-5533 TCX', name: 'Arcadia', hex: '#00A887', category: 'Fashion, Home + Interiors' },
  { code: 'PANTONE 18-1028 TCX', name: 'Emperador', hex: '#6C4735', category: 'Fashion, Home + Interiors' },
  { code: 'PANTONE 12-2103 TCX', name: 'Almost Mauve', hex: '#EAE1DF', category: 'Fashion, Home + Interiors' },
  { code: 'PANTONE 17-3020 TCX', name: 'Spring Crocus', hex: '#BA69A1', category: 'Fashion, Home + Interiors' },
  { code: 'PANTONE 13-0550 TCX', name: 'Lime Punch', hex: '#C0D725', category: 'Fashion, Home + Interiors' },
  { code: 'PANTONE 16-4132 TCX', name: 'Little Boy Blue', hex: '#6EA2D5', category: 'Fashion, Home + Interiors' },
  { code: 'PANTONE 14-3207 TCX', name: 'Pink Lavender', hex: '#D8B5D5', category: 'Fashion, Home + Interiors' },
  { code: 'PANTONE 13-0646 TCX', name: 'Meadowlark', hex: '#EDE47A', category: 'Fashion, Home + Interiors' },
  { code: 'PANTONE 17-1563 TCX', name: 'Cherry Tomato', hex: '#EA3C34', category: 'Fashion, Home + Interiors' },
  { code: 'PANTONE 19-1862 TCX', name: 'Jester Red', hex: '#8B263E', category: 'Fashion, Home + Interiors' },
  { code: 'PANTONE 15-1247 TCX', name: 'Coral Gold', hex: '#D68A57', category: 'Fashion, Home + Interiors' },
  { code: 'PANTONE 18-0430 TCX', name: 'Martini Olive', hex: '#716A4D', category: 'Fashion, Home + Interiors' },
  { code: 'PANTONE 19-3810 TCX', name: 'Eclipse', hex: '#343843', category: 'Fashion, Home + Interiors' },
  { code: 'PANTONE 11-0104 TCX', name: 'Pure Cashmere', hex: '#ECE6DC', category: 'Fashion, Home + Interiors' },
  { code: 'PANTONE 16-1548 TCX', name: 'Peach Amber', hex: '#FB8B6A', category: 'Fashion, Home + Interiors' },
  { code: 'PANTONE 19-1555 TCX', name: 'Red Pear', hex: '#7B3539', category: 'Fashion, Home + Interiors' },
  { code: 'PANTONE 18-5020 TCX', name: 'Quetzal Green', hex: '#006865', category: 'Fashion, Home + Interiors' },
  { code: 'PANTONE 15-0850 TCX', name: 'Ceylon Yellow', hex: '#D4AE40', category: 'Fashion, Home + Interiors' },
  { code: 'PANTONE 18-0625 TCX', name: 'Martini Green', hex: '#6E6F4B', category: 'Fashion, Home + Interiors' },
  { code: 'PANTONE 18-1549 TCX', name: 'Valiant Poppy', hex: '#BC2A36', category: 'Fashion, Home + Interiors' },
  { code: 'PANTONE 19-4110 TCX', name: 'Blue Depths', hex: '#263044', category: 'Fashion, Home + Interiors' },
  { code: 'PANTONE 19-0303 TCX', name: 'Jet Black', hex: '#2B2929', category: 'Fashion, Home + Interiors' },
];

/**
 * Pre-compute Lab for all colors once on init for lightning-fast CIEDE2000 calculations (<1ms)
 */
export const pantoneLibrary: PantoneColor[] = rawPantoneColors.map((item) => ({
  ...item,
  lab: hexToLab(item.hex),
}));

/**
 * Find the top closest Pantone matches for any given Hex color using CIEDE2000
 */
export function findClosestPantone(inputHex: string, limit = 6): PantoneMatch[] {
  const targetLab = hexToLab(inputHex);
  const scored = pantoneLibrary.map((pantone) => {
    const pLab = pantone.lab || hexToLab(pantone.hex);
    const dE = deltaE2000(targetLab, pLab);
    const rgbVal = hexToRgb(pantone.hex);
    const cmykVal = rgbToCmyk(rgbVal.r, rgbVal.g, rgbVal.b);

    return {
      ...pantone,
      deltaE: dE,
      assessment: getDeltaEAssessment(dE),
      rgb: `rgb(${rgbVal.r}, ${rgbVal.g}, ${rgbVal.b})`,
      cmyk: `cmyk(${cmykVal.c}%, ${cmykVal.m}%, ${cmykVal.y}%, ${cmykVal.k}%)`,
    } as PantoneMatch;
  });

  scored.sort((a, b) => a.deltaE - b.deltaE);
  return scored.slice(0, limit);
}

/**
 * Search Pantone Library by keyword (code, name, year, or hex)
 */
export function searchPantoneColors(query: string, limit = 20): PantoneColor[] {
  const q = query.trim().toLowerCase();
  if (!q) {
    return pantoneLibrary.slice(0, limit);
  }

  return pantoneLibrary
    .filter((item) => {
      const matchCode = item.code.toLowerCase().includes(q);
      const matchName = item.name.toLowerCase().includes(q);
      const matchHex = item.hex.toLowerCase().includes(q);
      const matchYear = item.year?.toString() === q;
      return matchCode || matchName || matchHex || matchYear;
    })
    .slice(0, limit);
}
