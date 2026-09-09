<script setup lang="ts">
import { createToken } from './token-generator.service';
import { useCopy } from '@/composable/copy';
import { useQueryParam } from '@/composable/queryParams';
import { computedRefreshable } from '@/composable/computedRefreshable';

const length = useQueryParam({ name: 'length', defaultValue: 64 });
const withUppercase = useQueryParam({ name: 'uppercase', defaultValue: true });
const withLowercase = useQueryParam({ name: 'lowercase', defaultValue: true });
const withNumbers = useQueryParam({ name: 'numbers', defaultValue: true });
const withSymbols = useQueryParam({ name: 'symbols', defaultValue: false });
const { t } = useI18n();

const [token, refreshToken] = computedRefreshable(() =>
  createToken({
    length: length.value,
    withUppercase: withUppercase.value,
    withLowercase: withLowercase.value,
    withNumbers: withNumbers.value,
    withSymbols: withSymbols.value,
  }),
);

const { copy } = useCopy({ source: token, text: t('tools.token-generator.copied') });
</script>

<template>
  <div>
    <c-card>
      <!-- Link to Password Generator -->
      <div class="mb-5 p-3 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-between gap-3 text-xs">
        <span class="text-gray-700 dark:text-gray-200">
          💡 需要產生多種格式的安全密碼（包含符號、英數、分組、PIN、口令與破解時間預估）？
        </span>
        <router-link to="/password-generator" class="font-bold text-primary hover:underline whitespace-nowrap">
          前往密碼產生器 →
        </router-link>
      </div>

      <n-form label-placement="left" label-width="140">
        <div flex justify-center>
          <div>
            <n-form-item :label="t('tools.token-generator.uppercase')">
              <n-switch v-model:value="withUppercase" />
            </n-form-item>

            <n-form-item :label="t('tools.token-generator.lowercase')">
              <n-switch v-model:value="withLowercase" />
            </n-form-item>
          </div>

          <div>
            <n-form-item :label="t('tools.token-generator.numbers')">
              <n-switch v-model:value="withNumbers" />
            </n-form-item>

            <n-form-item :label="t('tools.token-generator.symbols')">
              <n-switch v-model:value="withSymbols" />
            </n-form-item>
          </div>
        </div>
      </n-form>

      <n-form-item :label="`${t('tools.token-generator.length')} (${length})`" label-placement="left">
        <n-slider v-model:value="length" :step="1" :min="1" :max="512" />
      </n-form-item>

      <c-input-text
        v-model:value="token"
        multiline
        :placeholder="t('tools.token-generator.tokenPlaceholder')"
        readonly
        rows="3"
        autosize
        class="token-display"
      />

      <div mt-5 flex justify-center gap-3>
        <c-button @click="copy()">
          {{ t('tools.token-generator.button.copy') }}
        </c-button>
        <c-button @click="refreshToken">
          {{ t('tools.token-generator.button.refresh') }}
        </c-button>
      </div>
    </c-card>
  </div>
</template>

<style scoped lang="less">
::v-deep(.token-display) {
  textarea {
    text-align: center;
  }
}
</style>
