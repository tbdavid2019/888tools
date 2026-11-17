<script setup lang="ts">
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useIntervalFn, useNow } from '@vueuse/core';
import { addYears, differenceInCalendarDays, differenceInYears, format, intervalToDuration, isAfter, startOfDay } from 'date-fns';
import { enUS, zhTW } from 'date-fns/locale';
import { formatLunarDate, getChineseZodiac, getWesternZodiac, solarToLunar } from './lunar';

const { t, locale } = useI18n();
const selectedDate = ref<number | null>(Date.now());
const now = useNow({ scheduler: cb => useIntervalFn(cb, 60_000) });

const dateLocale = computed(() => {
  if (locale.value === 'zh-TW' || locale.value === 'zh') return zhTW;
  return enUS;
});

const result = computed(() => {
  if (!selectedDate.value) return null;

  const birthDate = startOfDay(new Date(selectedDate.value));
  const today = startOfDay(now.value);
  if (Number.isNaN(birthDate.getTime())) return null;

  const isFuture = isAfter(birthDate, today);
  const age = isFuture ? 0 : differenceInYears(today, birthDate);
  const duration = isFuture ? null : intervalToDuration({ start: birthDate, end: today });
  const daysLived = isFuture ? 0 : differenceInCalendarDays(today, birthDate);

  const rocYear = birthDate.getFullYear() - 1911;
  const rocLabel = rocYear > 0 ? `民國 ${rocYear}` : `民國前 ${Math.abs(rocYear)}`;

  let nextBirthday = birthDate;
  if (!isFuture) {
    nextBirthday = addYears(birthDate, today.getFullYear() - birthDate.getFullYear());
    if (!isAfter(nextBirthday, today)) nextBirthday = addYears(nextBirthday, 1);
  }
  const daysUntilNext = differenceInCalendarDays(nextBirthday, today);

  const lunar = solarToLunar(birthDate);
  const todayLunar = solarToLunar(today);
  const lunarInfo = lunar ? formatLunarDate(lunar) : null;
  const westernZodiac = getWesternZodiac(birthDate);
  const chineseZodiac = lunar ? lunarInfo?.zodiac ?? getChineseZodiac(birthDate.getFullYear()) : getChineseZodiac(birthDate.getFullYear());

  const virtualAge =
    isFuture || !todayLunar || !lunar ? age + 1 : Math.max(1, todayLunar.year - lunar.year + 1);

  return {
    birthDate,
    isFuture,
    age,
    virtualAge,
    duration,
    daysLived,
    rocYearLabel:
      locale.value === 'zh-TW' || locale.value === 'zh'
        ? `${rocLabel} ${format(birthDate, 'MM 月 dd 日', { locale: dateLocale.value })}`
        : `${rocYear > 0 ? `ROC ${rocYear}` : `Pre-ROC ${Math.abs(rocYear)}`} ${format(birthDate, 'MM/dd', { locale: dateLocale.value })}`,
    gregorianLabel: format(birthDate, 'yyyy/MM/dd EEEE', { locale: dateLocale.value }),
    nextBirthday,
    daysUntilNext,
    lunarText: lunarInfo ? `${lunarInfo.text} 歲次${lunarInfo.sexagenary}` : t('tools.birthday-calculator.lunarUnavailable'),
    chineseZodiac,
    westernZodiac,
  };
});

const rows = computed(() => {
  if (!result.value) return [];
  const { gregorianLabel, rocYearLabel, lunarText, westernZodiac, chineseZodiac, age, virtualAge, duration, daysLived, nextBirthday, daysUntilNext } =
    result.value;

  const ageDetail = duration
    ? `${duration.years ?? 0}${t('tools.birthday-calculator.units.years')} ${duration.months ?? 0}${t('tools.birthday-calculator.units.months')} ${duration.days ?? 0}${t('tools.birthday-calculator.units.days')}`
    : '';

  const ageInMonths = duration ? Math.floor((duration.years ?? 0) * 12 + (duration.months ?? 0)) : 0;
  const monthsDetail = duration
    ? `${ageInMonths}${t('tools.birthday-calculator.units.months')} ${t('tools.birthday-calculator.and')} ${duration.days ?? 0}${t('tools.birthday-calculator.units.days')}`
    : '';

  return [
    { label: t('tools.birthday-calculator.fields.gregorian'), value: gregorianLabel },
    { label: t('tools.birthday-calculator.fields.roc'), value: rocYearLabel },
    { label: t('tools.birthday-calculator.fields.lunar'), value: lunarText },
    {
      label: t('tools.birthday-calculator.fields.westernZodiac'),
      value: t(`tools.birthday-calculator.zodiac.${westernZodiac}`),
    },
    { label: t('tools.birthday-calculator.fields.chineseZodiac'), value: chineseZodiac },
    { label: t('tools.birthday-calculator.fields.realAge'), value: `${age}${t('tools.birthday-calculator.units.years')}` },
    { label: t('tools.birthday-calculator.fields.virtualAge'), value: `${virtualAge}${t('tools.birthday-calculator.units.years')}` },
    { label: t('tools.birthday-calculator.fields.ageDetail'), value: ageDetail },
    { label: t('tools.birthday-calculator.fields.ageInMonths'), value: monthsDetail },
    { label: t('tools.birthday-calculator.fields.daysLived'), value: `${daysLived} ${t('tools.birthday-calculator.units.days')}` },
    {
      label: t('tools.birthday-calculator.fields.nextBirthday'),
      value: `${format(nextBirthday, 'yyyy/MM/dd EEEE', { locale: dateLocale.value })}（${t('tools.birthday-calculator.inDays', {
        days: daysUntilNext,
      })}）`,
    },
  ];
});
</script>

<template>
  <c-card>
    <n-space vertical size="large">
      <n-form label-placement="top" label-width="auto">
        <n-form-item :label="t('tools.birthday-calculator.fields.birthDate')">
          <n-date-picker v-model:value="selectedDate" type="date" clearable />
        </n-form-item>
      </n-form>

      <n-alert type="info" v-if="result?.isFuture">
        {{ t('tools.birthday-calculator.futureMessage') }}
      </n-alert>

      <n-descriptions v-if="rows.length" bordered size="small" label-placement="left" :column="1">
        <n-descriptions-item v-for="row in rows" :key="row.label" :label="row.label">
          {{ row.value }}
        </n-descriptions-item>
      </n-descriptions>
    </n-space>
  </c-card>
</template>
