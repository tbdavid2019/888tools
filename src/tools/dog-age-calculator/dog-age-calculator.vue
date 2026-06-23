<script setup lang="ts">
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { calculateHumanMonthsFromPetAge, normalizePetMonths, toYearsAndMonths } from '../pet-age-calculator/pet-age';
import type { PetSize } from '../pet-age-calculator/pet-age';

const { t } = useI18n();
const size = ref<PetSize>('small');
const years = ref<number | null>(0);
const months = ref<number | null>(0);

const sizeOptions = computed(() => [
  { label: t('tools.dog-age-calculator.sizes.small'), value: 'small' },
  { label: t('tools.dog-age-calculator.sizes.medium'), value: 'medium' },
  { label: t('tools.dog-age-calculator.sizes.large'), value: 'large' },
]);

const factorMap: Record<PetSize, number> = {
  small: 4,
  medium: 5,
  large: 6,
};

const result = computed(() => {
  const totalMonths = normalizePetMonths(years.value, months.value);
  const humanMonths = calculateHumanMonthsFromPetAge(totalMonths, factorMap[size.value]);
  const breakdown = toYearsAndMonths(humanMonths);

  return {
    humanYears: breakdown.years,
    humanMonths: breakdown.months,
    humanMonthsRaw: humanMonths,
  };
});

function reset() {
  size.value = 'small';
  years.value = 0;
  months.value = 0;
}

function recalculate() {
  years.value = years.value ?? 0;
  months.value = months.value ?? 0;
}
</script>

<template>
  <c-card>
    <n-space vertical size="large">
      <n-form label-placement="top" label-width="auto">
        <n-grid cols="1 640:2" x-gap="16" y-gap="8">
          <n-form-item-gi :span="1" :label="t('tools.dog-age-calculator.fields.size')" path="size">
            <n-select v-model:value="size" :options="sizeOptions" />
          </n-form-item-gi>
          <n-form-item-gi :span="1" :label="t('tools.dog-age-calculator.fields.age')" path="age">
            <n-space>
              <n-input-number v-model:value="years" :min="0" :max="40" :precision="0" />
              <span>{{ t('tools.dog-age-calculator.units.years') }}</span>
              <n-input-number v-model:value="months" :min="0" :max="11" :precision="0" />
              <span>{{ t('tools.dog-age-calculator.units.months') }}</span>
            </n-space>
          </n-form-item-gi>
        </n-grid>
        <n-form-item>
          <n-space>
            <c-button type="primary" @click="recalculate">{{ t('tools.dog-age-calculator.actions.calculate') }}</c-button>
            <c-button quaternary @click="reset">{{ t('tools.dog-age-calculator.actions.reset') }}</c-button>
          </n-space>
        </n-form-item>
      </n-form>

      <n-card size="small" :title="t('tools.dog-age-calculator.resultTitle')">
        <div class="result-row">
          <div class="result-value">
            {{ result.humanYears }}
            <span class="unit">{{ t('tools.dog-age-calculator.units.years') }}</span>
          </div>
          <div class="result-value">
            {{ result.humanMonths }}
            <span class="unit">{{ t('tools.dog-age-calculator.units.months') }}</span>
          </div>
        </div>
        <div class="hint">
          {{ t('tools.dog-age-calculator.subtitle', { months: result.humanMonthsRaw.toFixed(1) }) }}
        </div>
      </n-card>
    </n-space>
  </c-card>
</template>

<style scoped>
.result-row {
  display: flex;
  gap: 24px;
  align-items: baseline;
  flex-wrap: wrap;
  margin-bottom: 4px;
}

.result-value {
  font-size: 28px;
  font-weight: 700;
  color: var(--primary-color);
  display: flex;
  align-items: baseline;
  gap: 6px;
}

.unit {
  font-size: 14px;
  color: var(--text-color-2);
  font-weight: 500;
}

.hint {
  color: var(--text-color-3);
}
</style>
