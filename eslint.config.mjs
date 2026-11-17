import fs from 'node:fs';
import antfu from '@antfu/eslint-config';
import unocss from '@unocss/eslint-config/flat';

const autoImportGlobals = JSON.parse(
  fs.readFileSync(new URL('./.eslintrc-auto-import.json', import.meta.url), 'utf8'),
);

export default antfu(
  {
    vue: true,
    typescript: true,
    stylistic: {
      semi: true,
    },
    gitignore: true,
  },
  unocss,
  {
    languageOptions: {
      globals: autoImportGlobals.globals,
    },
    rules: {
      'curly': ['error', 'all'],
      'ts/no-use-before-define': ['error', { allowNamedExports: true, functions: false }],
      'vue/no-empty-component-block': ['error'],
      'no-restricted-imports': ['error', {
        paths: [{
          name: '@vueuse/core',
          importNames: ['useClipboard'],
          message: 'Please use local useCopy from src/composable/copy.ts instead of useClipboard.',
        }],
      }],
    },
  },
);
