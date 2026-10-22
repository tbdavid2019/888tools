import { defineStore } from 'pinia';
import _ from 'lodash';
import type { PaletteOption } from './command-palette.types';
import { useToolStore } from '@/tools/tools.store';
import { useFuzzySearch } from '@/composable/fuzzySearch';
import { useStyleStore } from '@/stores/style.store';

import SunIcon from '~icons/mdi/white-balance-sunny';
import GithubIcon from '~icons/mdi/github';
import BugIcon from '~icons/mdi/bug-outline';
import DiceIcon from '~icons/mdi/dice-5';
import InfoIcon from '~icons/mdi/information-outline';

export const useCommandPaletteStore = defineStore('command-palette', () => {
  const toolStore = useToolStore();
  const styleStore = useStyleStore();
  const router = useRouter();
  const searchPrompt = ref('');

  const toolsOptions = computed(() => toolStore.tools.map(tool => ({
    ...tool,
    to: tool.path,
    toolCategory: tool.category,
    category: 'Tools',
  })));

  const searchOptions = computed<PaletteOption[]>(() => [
    ...toolsOptions.value,
    {
      name: 'Random tool',
      description: 'Get a random tool from the list.',
      action: () => {
        const { path } = _.sample(toolStore.tools)!;
        router.push(path);
      },
      icon: DiceIcon,
      category: 'Tools',
      keywords: ['random', 'tool', 'pick', 'choose', 'select'],
      closeOnSelect: true,
    },
    {
      name: 'Toggle dark mode',
      description: 'Toggle dark mode on or off.',
      action: () => styleStore.toggleDark(),
      icon: SunIcon,
      category: 'Actions',
      keywords: ['dark', 'theme', 'toggle', 'mode', 'light', 'system'],
    },
    {
      name: 'Github repository',
      href: 'https://github.com/tbdavid2019/888tools',
      category: 'External',
      description: 'View the source code of 888tools on Github.',
      keywords: ['github', 'repo', 'repository', 'source', 'code'],
      icon: GithubIcon,
    },
    {
      name: 'Report a bug or an issue',
      description: 'Report a bug or an issue to help improve 888tools.',
      href: 'https://github.com/tbdavid2019/888tools/issues/new/choose',
      category: 'Actions',
      keywords: ['report', 'issue', 'bug', 'problem', 'error'],
      icon: BugIcon,
    },
    {
      name: 'About',
      description: 'Learn more about IT-Tools.',
      to: '/about',
      category: 'Pages',
      keywords: ['about', 'learn', 'more', 'info', 'information'],
      icon: InfoIcon,
    },
  ]);

  const { searchResult } = useFuzzySearch({
    search: searchPrompt,
    data: searchOptions,
    options: {
      keys: [
        { name: 'name', weight: 3 },
        { name: 'keywords', weight: 2.5 },
        { name: 'to', weight: 2 },
        { name: 'description', weight: 1 },
        { name: 'category', weight: 0.5 },
      ],
      threshold: 0.3,
      ignoreLocation: true,
    },
  });

  const filteredSearchResult = computed(() => {
    const rawResults = searchResult.value;
    const query = searchPrompt.value.trim().toLowerCase();

    const sortedResults = !query
      ? rawResults
      : [...rawResults].sort((a, b) => {
          const getMatchTier = (opt: PaletteOption) => {
            const name = (opt.name || '').toLowerCase();
            const toRaw = opt.to;
            const toStr = typeof toRaw === 'string'
              ? toRaw
              : (typeof toRaw === 'object' && toRaw !== null && 'path' in toRaw ? String((toRaw as { path?: string }).path || '') : '');
            const to = toStr.replace(/^\//, '').toLowerCase();
            const keywords = (opt.keywords || []).map(k => k.toLowerCase());

            if (name === query || to === query || keywords.includes(query)) {
              return 0; // exact
            }
            if (name.startsWith(query) || to.startsWith(query) || keywords.some(k => k.startsWith(query))) {
              return 1; // prefix
            }
            if (name.includes(query) || to.includes(query) || keywords.some(k => k.includes(query))) {
              return 2; // contains
            }
            return 3; // fuzzy
          };

          return getMatchTier(a) - getMatchTier(b);
        });

    return _.chain(sortedResults)
      .groupBy('category')
      .mapValues(categoryOptions => _.take(categoryOptions, 12))
      .value();
  });

  return {
    filteredSearchResult,
    searchPrompt,
  };
});
