<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  mode: string
  parts: { year: number; month: number; day: number; hours: number; minutes: number; seconds: number; hh: string; hh12: string; mm: string; ss: string }
  date: Date
  timezone: string
  locale: string
  showSeconds: boolean
  showDate: boolean
  use12HourFormat: boolean
  timeText: string
  hourAngle: number
  minuteAngle: number
  secondAngle: number
}>();
// Original Vue/CSS interpretations of the six designs selected from FreeFrontend.
const masks = ['111101101101111', '010110010010111', '111001111100111', '111001111001111', '101101111001001', '111100111001111', '111100111101111', '111001001001001', '111101111101111', '111101111001111'];
const digits = computed(() => `${props.use12HourFormat ? props.parts.hh12 : props.parts.hh}:${props.parts.mm}${props.showSeconds ? `:${props.parts.ss}` : ''}`.split(''));
const period = computed(() => props.parts.hours < 12 ? 'AM' : 'PM');
const lunarLocale = computed(() => `${props.locale.split('-u-')[0]}-u-ca-chinese`);
const radialRings = computed(() => [
  { count: 12, radius: 174, value: props.parts.hours % 12, color: '#1675a8', width: 12, height: 35 },
  { count: 60, radius: 140, value: props.parts.minutes, color: '#00bce7', width: 5, height: 16 },
  ...(props.showSeconds ? [{ count: 60, radius: 113, value: props.parts.seconds, color: '#ed4d5d', width: 5, height: 5 }] : []),
]);
const lunarDate = computed(() => {
  try {
    return new Intl.DateTimeFormat(lunarLocale.value, { year: 'numeric', month: 'long', day: 'numeric', timeZone: props.timezone }).format(props.date);
  }
  catch { return ''; }
});
const calendarHeading = computed(() => new Intl.DateTimeFormat(props.locale, { year: 'numeric', month: 'long', timeZone: props.timezone }).format(props.date));
const weekday = computed(() => new Intl.DateTimeFormat(props.locale, { weekday: 'long', timeZone: props.timezone }).format(props.date));
const wheelRings = computed(() => {
  const p = props.parts;
  const century = Math.floor(p.year / 100) * 100;
  const monthName = (n: number) => new Intl.DateTimeFormat(props.locale, { month: 'short', timeZone: 'UTC' }).format(new Date(Date.UTC(2000, n, 1)));
  const dayName = (n: number) => new Intl.DateTimeFormat(props.locale, { weekday: 'short', timeZone: 'UTC' }).format(new Date(Date.UTC(2023, 0, n + 1)));
  const dayIndex = new Date(Date.UTC(p.year, p.month - 1, p.day)).getUTCDay();
  return [
    ...(props.showDate ? [{ radius: 276, values: Array.from({ length: 100 }, (_, i) => String(century + i)), current: p.year - century }] : []),
    ...(props.showSeconds ? [{ radius: 240, values: Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0')), current: p.seconds }] : []),
    { radius: 204, values: Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0')), current: p.minutes },
    { radius: 168, values: Array.from({ length: props.use12HourFormat ? 12 : 24 }, (_, i) => props.use12HourFormat ? (i === 0 ? '12' : String(i).padStart(2, '0')) : String(i).padStart(2, '0')), current: props.use12HourFormat ? p.hours % 12 : p.hours, ringClass: 'wheel-hours' },
    ...(props.showDate
      ? [
          { radius: 132, values: Array.from({ length: new Date(Date.UTC(p.year, p.month, 0)).getUTCDate() }, (_, i) => String(i + 1)), current: p.day - 1 },
          { radius: 96, values: Array.from({ length: 12 }, (_, i) => monthName(i)), current: p.month - 1 },
          { radius: 56, values: Array.from({ length: 7 }, (_, i) => dayName(i)), current: dayIndex },
        ]
      : []),
  ];
});
const point = (angle: number, radius: number) => ({ x: Math.cos(angle * Math.PI / 180) * radius, y: Math.sin(angle * Math.PI / 180) * radius });
const stripeColors = ['#f088ac', '#8f62a2', '#369bc6', '#52b6aa', '#d5d43e', '#f8b431', '#e7633c'];
</script>

<template>
  <div class="clock-art" :class="`style-${mode}`">
    <time class="accessible-time" :datetime="date.toISOString()">{{ timeText }}</time>

    <svg v-if="mode === 'radial'" class="round-art radial-art" viewBox="-205 -205 410 410" aria-hidden="true">
      <g v-for="(ring, r) in radialRings" :key="r">
        <rect
          v-for="n in ring.count" :key="n" :x="-ring.width / 2" :y="-ring.radius - ring.height / 2" :style="{ width: `${ring.width}px`, height: `${ring.height}px`, opacity: ring.value === n - 1 ? 1 : .18 }" :rx="ring.width / 2"
          :transform="`rotate(${(n - 1) * 360 / ring.count})`" :fill="ring.value === n - 1 ? ring.color : 'var(--clock-muted)'"
        />
      </g>
      <text text-anchor="middle" dominant-baseline="middle" class="radial-time">{{ timeText }}</text>
    </svg>

    <div v-else-if="mode === 'lunar'" class="calendar-stage">
      <div class="desk-calendar" aria-hidden="true">
        <div class="calendar-binding">
          <i /><i />
        </div>
        <header>{{ showDate ? calendarHeading : (locale.startsWith('zh') ? '現在時間' : 'Current time') }}</header>
        <template v-if="showDate">
          <div class="calendar-day">
            {{ parts.day }}
          </div>
          <div class="calendar-weekday">
            {{ weekday }}
          </div>
          <div class="calendar-lunar">
            {{ lunarDate }}
          </div>
        </template>
        <div v-else class="calendar-blank">
          {{ timezone }}
        </div>
        <time class="calendar-time">{{ timeText }}</time>
      </div>
    </div>

    <div v-else-if="mode === 'blocky' || mode === 'pixel'" class="block-stage" :class="{ voxel: mode === 'blocky' }" :data-hour="use12HourFormat ? parts.hh12 : parts.hh" aria-hidden="true">
      <span v-if="use12HourFormat" class="clock-period">{{ period }}</span>
      <div class="block-display">
        <template v-for="(digit, i) in digits" :key="i">
          <div v-if="digit === ':'" class="pixel-colon">
            <i /><i />
          </div>
          <div v-else class="pixel-digit">
            <span v-for="n in 15" :key="n" class="pixel" :class="{ lit: masks[Number(digit)][n - 1] === '1' }" :style="{ '--delay': `${n * 9}ms` }"><i /></span>
          </div>
        </template>
      </div>
    </div>

    <svg v-else-if="mode === 'wheel'" class="round-art wheel-art" viewBox="-310 -310 620 620" aria-hidden="true">
      <circle r="302" fill="#102c3d" />
      <path d="M 28 -16 H 302 V 16 H 28 Z" fill="#ffc35a" style="opacity: .15" />
      <g v-for="ring in wheelRings" :key="ring.radius" :class="ring.ringClass" :data-count="ring.values.length" :data-current="ring.current">
        <circle :r="ring.radius + 18" fill="none" stroke="#4a6d80" stroke-width=".5" />
        <g v-for="(value, i) in ring.values" :key="i" :transform="`rotate(${(i - ring.current) * 360 / ring.values.length})`">
          <text :x="ring.radius" y="0" dominant-baseline="middle" text-anchor="middle" :fill="i === ring.current ? '#ffcf78' : '#b9cfd9'" :style="{ fontSize: ring.values.length === 100 ? '9px' : '12px', opacity: i === ring.current ? 1 : .24 }">{{ value }}</text>
        </g>
      </g>
      <circle r="23" fill="#102c3d" stroke="#4a6d80" />
      <circle r="4" fill="#ffcf78" />
      <path d="M 304 -7 L 295 0 L 304 7" fill="none" stroke="#ffcf78" stroke-width="2" />
    </svg>

    <svg v-else-if="mode === 'braun'" class="round-art braun-art" viewBox="-205 -205 410 410" aria-hidden="true">
      <defs>
        <linearGradient id="braun-case" x2="1" y2="1"><stop stop-color="#555057" /><stop offset="1" stop-color="#101010" /></linearGradient>
      </defs>
      <circle r="200" fill="url(#braun-case)" stroke="#1a171a" stroke-width="5" />
      <circle r="194" fill="none" stroke="#737075" stroke-width=".5" />
      <circle r="152" fill="none" stroke="#686369" stroke-width=".5" />
      <g v-for="n in 60" :key="n" :transform="`rotate(${n * 6})`">
        <path :d="`M 0 -185 V ${n % 5 === 0 ? -175 : -180}`" stroke="#dce0e3" :stroke-width="n % 5 === 0 ? 2 : 1" />
      </g>
      <text v-for="n in 12" :key="n" :x="point(n * 30 - 90, 162).x" :y="point(n * 30 - 90, 162).y" text-anchor="middle" dominant-baseline="middle" fill="#e5e7e8" style="font-size: 22px">{{ n }}</text>
      <text y="-77" text-anchor="middle" fill="#e5e7e8" style="font-size: 15px" font-weight="700">BRAUN</text>
      <text y="90" text-anchor="middle" fill="#c9c3c6" style="font-size: 12px" font-style="italic">Paul Smith</text>
      <g :transform="`rotate(${hourAngle})`"><path d="M -5 15 L -4 -108 L 4 -108 L 5 15 Z" fill="#eceeed" /><path d="M -2 8 V -98" stroke="#333" stroke-width="3" /></g>
      <g :transform="`rotate(${minuteAngle})`"><path d="M -3 18 L -2 -145 L 2 -145 L 3 18 Z" fill="#eceeed" /></g>
      <g v-if="showSeconds" :transform="`rotate(${secondAngle})`">
        <path d="M 0 40 V -184" stroke="#f3b329" stroke-width="2" />
        <rect v-for="(color, i) in stripeColors" :key="color" x="-4" :y="-75 + i * 11" style="width: 8px; height: 11px" :fill="color" />
      </g>
      <circle r="9" fill="#e2e0db" stroke="#262126" stroke-width="4" />
    </svg>
  </div>
</template>

<style scoped>
.clock-art { width: 100%; min-width: 0; display: grid; place-items: center; margin: 24px auto 16px; }
.accessible-time { position: absolute; width: 1px; height: 1px; padding: 0; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
.round-art { display: block; width: min(100%, 430px); height: auto; overflow: visible; }
.radial-time { fill: var(--clock-text); font: 23px 'Maple Mono', monospace; font-variant-numeric: tabular-nums; }
.wheel-art { width: min(100%, 620px); font-family: 'Maple Mono', monospace; }
.braun-art { filter: drop-shadow(0 12px 14px rgb(0 0 0 / 22%)); }
.calendar-stage { padding: 28px 12px 30px; perspective: 1000px; }
.desk-calendar { position: relative; width: min(310px, 68vw); color: #bf352a; text-align: center; background: #fffaf0; transform: rotateX(7deg) rotateZ(-3deg); box-shadow: 0 2px 0 #ded6c5, 0 5px 0 #fffaf0, 0 8px 0 #d5cdbd, 0 11px 0 #fffaf0, 6px 24px 24px rgb(0 0 0 / 24%); border-radius: 3px; }
.calendar-binding { position: absolute; inset: -17px 0 auto; display: flex; justify-content: space-around; z-index: 1; }
.calendar-binding i { width: 12px; height: 32px; border-radius: 8px; background: linear-gradient(90deg, #383838, #b9b9b9 45%, #454545); box-shadow: 2px 3px 4px rgb(0 0 0 / 25%); }
.desk-calendar header { background: #b52e24; color: #fffaf0; padding: 25px 12px 12px; font-size: 21px; font-weight: 700; }
.calendar-day { font: 700 clamp(90px, 22vw, 145px)/1.15 Georgia, serif; padding-top: 12px; color: #25231e; }
.calendar-weekday { font-size: 21px; font-weight: 700; }
.calendar-lunar { margin: 14px 18px; padding-top: 12px; border-top: 1px solid #cfba9e; font-size: 18px; }
.calendar-time { display: block; padding: 14px; background: #efe4ce; color: #4f4031; font: 20px 'Maple Mono', monospace; font-variant-numeric: tabular-nums; }
.calendar-blank { padding: 60px 10px; font-size: 24px; }
.block-stage { box-sizing: border-box; width: min(100%, 820px); padding: clamp(16px, 5vw, 50px) clamp(10px, 3vw, 28px); background: #333; border-radius: 6px; }
.block-display { display: flex; justify-content: center; gap: 2%; width: 100%; }
.clock-period { position: absolute; top: 8px; right: 12px; color: #fdfb42; font: 700 clamp(12px, 1.4vw, 18px)/1.2 'Maple Mono', monospace; }
.pixel-digit { display: grid; grid-template-columns: repeat(3, 1fr); gap: 3px; flex: 3; }
.pixel { position: relative; display: block; aspect-ratio: 1; background: #3e3e3e; }
.pixel.lit { background: linear-gradient(135deg, #fdfb42 50%, #98fcfc 50%); }
.pixel-colon { display: flex; flex: .8; flex-direction: column; justify-content: space-evenly; align-items: center; }
.pixel-colon i { display: block; width: 60%; aspect-ratio: 1; background: #fdfb42; }
.voxel { padding-top: 65px; padding-bottom: 45px; background: #202420; perspective: 800px; }
.voxel .block-display { transform: rotateX(24deg) rotateZ(-4deg); transform-style: preserve-3d; }
.voxel .pixel { background: #292f29; transform: translateY(3px); transition: transform .55s cubic-bezier(.16, 1, .3, 1), background-color .4s; transition-delay: var(--delay); }
.voxel .pixel.lit { background: #82d759; transform: translateY(-8px); box-shadow: 3px 8px 8px rgb(0 0 0 / 30%); }
.voxel .pixel::after { content: ''; position: absolute; width: 100%; height: 7px; top: 100%; background: #396c23; transform: skewX(32deg); transform-origin: top left; }
.voxel .pixel::before { content: ''; position: absolute; width: 5px; height: 100%; left: 100%; top: 0; background: #589639; transform: skewY(58deg); transform-origin: top left; }
.voxel .pixel:not(.lit)::after, .voxel .pixel:not(.lit)::before { opacity: 0; }
.voxel .pixel-colon i { background: #82d759; }
:global(.clock-page.fullscreen) .round-art { width: min(62vmin, 560px); }
:global(.clock-page.fullscreen) .block-stage { width: min(85vw, 1100px); }
@media (max-width: 480px) { .pixel-digit { gap: 2px; } .voxel .pixel.lit { transform: translateY(-5px); } .voxel .pixel::after { height: 4px; } .voxel .pixel::before { width: 3px; } }
@media (prefers-reduced-motion: reduce) { .voxel .pixel { transition: none; } }
</style>
