<script setup lang="ts">
import {
  chineseSimplifiedWordList,
  chineseTraditionalWordList,
  czechWordList,
  englishWordList,
  entropyToMnemonic,
  frenchWordList,
  generateEntropy,
  italianWordList,
  japaneseWordList,
  koreanWordList,
  mnemonicToEntropy,
  portugueseWordList,
  spanishWordList,
} from '@it-tools/bip39';
import { Copy, Refresh } from '@vicons/tabler';

import { useCopy } from '@/composable/copy';
import { useValidation } from '@/composable/validation';
import { translate } from '@/plugins/i18n.plugin';
import { isNotThrowing } from '@/utils/boolean';
import { withDefaultOnError } from '@/utils/defaults';

const languages = {
  'English': englishWordList,
  'Chinese simplified': chineseSimplifiedWordList,
  'Chinese traditional': chineseTraditionalWordList,
  'Czech': czechWordList,
  'French': frenchWordList,
  'Italian': italianWordList,
  'Japanese': japaneseWordList,
  'Korean': koreanWordList,
  'Portuguese': portugueseWordList,
  'Spanish': spanishWordList,
};

const entropy = ref(generateEntropy());
const passphraseInput = ref('');

const language = ref<keyof typeof languages>('English');
const isChinese = computed(() => language.value === 'Chinese traditional' || language.value === 'Chinese simplified');
const isNonEnglish = computed(() => language.value !== 'English');

const passphrase = computed({
  get() {
    return withDefaultOnError(() => entropyToMnemonic(entropy.value, languages[language.value]), passphraseInput.value);
  },
  set(value: string) {
    passphraseInput.value = value;
    entropy.value = withDefaultOnError(() => mnemonicToEntropy(value, languages[language.value]), '');
  },
});

const entropyValidation = useValidation({
  source: entropy,
  rules: [
    {
      validator: value => value === '' || (value.length <= 32 && value.length >= 16 && value.length % 4 === 0),
      message: 'Entropy length should be >= 16, <= 32 and be a multiple of 4',
    },
    {
      validator: value => /^[a-fA-F0-9]*$/.test(value),
      message: 'Entropy should be an hexadecimal string',
    },
  ],
});

const mnemonicValidation = useValidation({
  source: passphrase,
  rules: [
    {
      validator: value => isNotThrowing(() => mnemonicToEntropy(value, languages[language.value])),
      message: 'Invalid mnemonic',
    },
  ],
});

function refreshEntropy() {
  entropy.value = generateEntropy();
}

const { copy: copyEntropy } = useCopy({ source: entropy, text: translate('tools.bip39-generator.entropyCopied') });
const { copy: copyPassphrase } = useCopy({ source: passphrase, text: translate('tools.bip39-generator.passphraseCopied') });
</script>

<template>
  <div>
    <n-grid cols="3" x-gap="12">
      <n-gi span="1">
        <c-select
          v-model:value="language"
          searchable
          :label="$t('tools.bip39-generator.languageLabel')"
          :options="Object.keys(languages)"
        />
      </n-gi>
      <n-gi span="2">
        <n-form-item
          :label="$t('tools.bip39-generator.entropyLabel')"
          :feedback="entropyValidation.message"
          :validation-status="entropyValidation.status"
        >
          <n-input-group>
            <c-input-text v-model:value="entropy" placeholder="Your string..." />

            <c-button @click="refreshEntropy()">
              <n-icon size="22">
                <Refresh />
              </n-icon>
            </c-button>
            <c-button @click="copyEntropy()">
              <n-icon size="22">
                <Copy />
              </n-icon>
            </c-button>
          </n-input-group>
        </n-form-item>
      </n-gi>
    </n-grid>
    <n-form-item
      :label="$t('tools.bip39-generator.passphraseLabel')"
      :feedback="mnemonicValidation.message"
      :validation-status="mnemonicValidation.status"
    >
      <n-input-group>
        <c-input-text v-model:value="passphrase" placeholder="Your mnemonic..." raw-text />

        <c-button @click="copyPassphrase()">
          <n-icon size="22" :component="Copy" />
        </c-button>
      </n-input-group>
    </n-form-item>

    <n-alert
      v-if="isChinese"
      type="warning"
      class="mt-4 shadow-sm"
      :title="$t('tools.bip39-generator.chineseNoticeTitle')"
    >
      <div class="space-y-2 text-xs leading-relaxed">
        <div>
          <span class="font-bold text-amber-800 dark:text-amber-400">
            • {{ $t('tools.bip39-generator.chineseCharRuleLabel') }}：
          </span>
          <span>{{ $t('tools.bip39-generator.chineseCharRuleText') }}</span>
        </div>
        <div>
          <span class="font-bold text-amber-800 dark:text-amber-400">
            • {{ $t('tools.bip39-generator.compatLabel') }}：
          </span>
          <span>{{ $t('tools.bip39-generator.chineseCompatText') }}</span>
        </div>
      </div>
    </n-alert>

    <n-alert
      v-else-if="isNonEnglish"
      type="warning"
      class="mt-4 shadow-sm"
      :title="$t('tools.bip39-generator.nonEnglishNoticeTitle')"
    >
      <div class="text-xs leading-relaxed">
        <span class="font-bold text-amber-800 dark:text-amber-400">
          • {{ $t('tools.bip39-generator.compatLabel') }}：
        </span>
        <span>{{ $t('tools.bip39-generator.nonEnglishCompatText') }}</span>
      </div>
    </n-alert>
  </div>
</template>
