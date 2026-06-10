<script setup lang="ts">
import { useThemeVars } from 'naive-ui';
import { useCopy } from '@/composable/copy';

type Mapping = Record<string, string>;

const text = ref('');
const { copy } = useCopy({ source: text });
const themeVars = useThemeVars();

function toChars(value: string) {
  return Array.from(value);
}

function transformWithMapping(value: string, mapping: Mapping) {
  return toChars(value)
    .map(ch => mapping[ch] ?? ch)
    .join('');
}

function strike(value: string, mark: string) {
  return value.split('').map(ch => ch + mark).join('');
}

const base = {
  latinLower: 'abcdefghijklmnopqrstuvwxyz',
  latinUpper: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  digits: '0123456789',
};

function makeMap(lower: string, upper: string, digits?: string): Mapping {
  const map: Mapping = {};
  const lowerChars = toChars(lower);
  const upperChars = toChars(upper);
  const digitChars = digits ? toChars(digits) : null;

  toChars(base.latinLower).forEach((ch, i) => (map[ch] = lowerChars[i] ?? ch));
  toChars(base.latinUpper).forEach((ch, i) => (map[ch] = upperChars[i] ?? ch));
  if (digits) {
    toChars(base.digits).forEach((ch, i) => (map[ch] = digitChars?.[i] ?? ch));
  }
  return map;
}

const styles = [
  {
    name: 'Bold Sans',
    transform: (v: string) =>
      transformWithMapping(
        v,
        makeMap(
          '𝗮𝗯𝗰𝗱𝗲𝗳𝗴𝗵𝗶𝗷𝗸𝗹𝗺𝗻𝗼𝗽𝗾𝗿𝘀𝘁𝘂𝘃𝘄𝘅𝘆𝘇',
          '𝗔𝗕𝗖𝗗𝗘𝗙𝗚𝗛𝗜𝗝𝗞𝗟𝗠𝗡𝗢𝗣𝗤𝗥𝗦𝗧𝗨𝗩𝗪𝗫𝗬𝗭',
          '𝟬𝟭𝟮𝟯𝟰𝟱𝟲𝟳𝟴𝟵',
        ),
      ),
  },
  {
    name: 'Italic Sans',
    transform: (v: string) =>
      transformWithMapping(
        v,
        makeMap(
          '𝘢𝘣𝘤𝘥𝘦𝘧𝘨𝘩𝘪𝘫𝘬𝘭𝘮𝘯𝘰𝘱𝘲𝘳𝘴𝘵𝘶𝘷𝘸𝘹𝘺𝘻',
          '𝘈𝘉𝘊𝘋𝘌𝘍𝘎𝘏𝘐𝘑𝘒𝘓𝘔𝘕𝘖𝘗𝘘𝘙𝘚𝘛𝘜𝘝𝘞𝘟𝘠𝘡',
        ),
      ),
  },
  {
    name: 'Bold Italic',
    transform: (v: string) =>
      transformWithMapping(
        v,
        makeMap(
          '𝙖𝙗𝙘𝙙𝙚𝙛𝙜𝙝𝙞𝙟𝙠𝙡𝙢𝙣𝙤𝙥𝙦𝙧𝙨𝙩𝙪𝙫𝙬𝙭𝙮𝙯',
          '𝘼𝘽𝘾𝘿𝙀𝙁𝙂𝙃𝙄𝙅𝙆𝙇𝙈𝙉𝙊𝙋𝙌𝙍𝙎𝙏𝙐𝙑𝙒𝙓𝙔𝙕',
        ),
      ),
  },
  {
    name: 'Monospace',
    transform: (v: string) =>
      transformWithMapping(
        v,
        makeMap(
          '𝚊𝚋𝚌𝚍𝚎𝚏𝚐𝚑𝚒𝚓𝚔𝚕𝚖𝚗𝚘𝚙𝚚𝚛𝚜𝚝𝚞𝚟𝚠𝚡𝚢𝚣',
          '𝙰𝙱𝙲𝙳𝙴𝙵𝙶𝙷𝙸𝙹𝙺𝙻𝙼𝙽𝙾𝙿𝚀𝚁𝚂𝚃𝚄𝚅𝚆𝚇𝚈𝚉',
          '𝟶𝟷𝟸𝟹𝟺𝟻𝟼𝟽𝟾𝟿',
        ),
      ),
  },
  {
    name: 'Double-struck',
    transform: (v: string) =>
      transformWithMapping(
        v,
        makeMap(
          '𝕒𝕓𝕔𝕕𝕖𝕗𝕘𝕙𝕚𝕛𝕜𝕝𝕞𝕟𝕠𝕡𝕢𝕣𝕤𝕥𝕦𝕧𝕨𝕩𝕪𝕫',
          '𝔸𝔹ℂ𝔻𝔼𝔽𝔾ℍ𝕀𝕁𝕂𝕃𝕄ℕ𝕆ℙℚℝ𝕊𝕋𝕌𝕍𝕎𝕏𝕐ℤ',
          '𝟘𝟙𝟚𝟛𝟜𝟝𝟞𝟟𝟠𝟡',
        ),
      ),
  },
  {
    name: 'Script',
    transform: (v: string) =>
      transformWithMapping(
        v,
        makeMap(
          '𝒶𝒷𝒸𝒹ℯ𝒻ℊ𝒽𝒾𝒿𝓀𝓁𝓂𝓃ℴ𝓅𝓆𝓇𝓈𝓉𝓊𝓋𝓌𝓍𝓎𝓏',
          '𝒜𝐵𝒞𝒟𝐸𝐹𝒢𝐻𝐼𝒥𝒦𝐿𝑀𝒩𝒪𝒫𝒬𝑅𝒮𝒯𝒰𝒱𝒲𝒳𝒴𝒵',
        ),
      ),
  },
  {
    name: 'Fraktur',
    transform: (v: string) =>
      transformWithMapping(
        v,
        makeMap(
          '𝔞𝔟𝔠𝔡𝔢𝔣𝔤𝔥𝔦𝔧𝔨𝔩𝔪𝔫𝔬𝔭𝔮𝔯𝔰𝔱𝔲𝔳𝔴𝔵𝔶𝔷',
          '𝔄𝔅ℭ𝔇𝔈𝔉𝔊ℌℑ𝔍𝔎𝔏𝔐𝔑𝔒𝔓𝔔ℜ𝔖𝔗𝔘𝔙𝔚𝔛𝔜ℨ',
        ),
      ),
  },
  {
    name: 'Bubble',
    transform: (v: string) =>
      transformWithMapping(
        v,
        makeMap(
          'ⓐⓑⓒⓓⓔⓕⓖⓗⓘⓙⓚⓛⓜⓝⓞⓟⓠⓡⓢⓣⓤⓥⓦⓧⓨⓩ',
          'ⒶⒷⒸⒹⒺⒻⒼⒽⒾⒿⓀⓁⓂⓃⓄⓅⓆⓇⓈⓉⓊⓋⓌⓍⓎⓏ',
          '⓪①②③④⑤⑥⑦⑧⑨',
        ),
      ),
  },
  {
    name: 'Square',
    transform: (v: string) =>
      transformWithMapping(
        v,
        makeMap(
          '🄰🄱🄲🄳🄴🄵🄶🄷🄸🄹🄺🄻🄼🄽🄾🄿🅀🅁🅂🅃🅄🅅🅆🅇🅈🅉'.toLowerCase(),
          '🄰🄱🄲🄳🄴🄵🄶🄷🄸🄹🄺🄻🄼🄽🄾🄿🅀🅁🅂🅃🅄🅅🅆🅇🅈🅉',
          '🄌①②③④⑤⑥⑦⑧⑨',
        ),
      ),
  },
  {
    name: 'Negative Circled',
    transform: (v: string) =>
      transformWithMapping(
        v,
        makeMap(
          '🅐🅑🅒🅓🅔🅕🅖🅗🅘🅙🅚🅛🅜🅝🅞🅟🅠🅡🅢🅣🅤🅥🅦🅧🅨🅩'.toLowerCase(),
          '🅐🅑🅒🅓🅔🅕🅖🅗🅘🅙🅚🅛🅜🅝🅞🅟🅠🅡🅢🅣🅤🅥🅦🅧🅨🅩',
        ),
      ),
  },
  {
    name: 'Negative Square',
    transform: (v: string) =>
      transformWithMapping(
        v,
        makeMap(
          '🅰🅱🅲🅳🅴🅵🅶🅷🅸🅹🅺🅻🅼🅽🅾🅿🆀🆁🆂🆃🆄🆅🆆🆇🆈🆉'.toLowerCase(),
          '🅰🅱🅲🅳🅴🅵🅶🅷🅸🅹🅺🅻🅼🅽🅾🅿🆀🆁🆂🆃🆄🆅🆆🆇🆈🆉',
        ),
      ),
  },
  {
    name: 'Full width',
    transform: (v: string) =>
      transformWithMapping(
        v,
        makeMap(
          'ａｂｃｄｅｆｇｈｉｊｋｌｍｎｏｐｑｒｓｔｕｖｗｘｙｚ',
          'ＡＢＣＤＥＦＧＨＩＪＫＬＭＮＯＰＱＲＳＴＵＶＷＸＹＺ',
          '０１２３４５６７８９',
        ),
      ),
  },
  {
    name: 'Small caps',
    transform: (v: string) =>
      transformWithMapping(
        v,
        makeMap(
          'ᴀʙᴄᴅᴇꜰɢʜɪᴊᴋʟᴍɴᴏᴘǫʀsᴛᴜᴠᴡxʏᴢ',
          'ᴀʙᴄᴅᴇꜰɢʜɪᴊᴋʟᴍɴᴏᴘǫʀsᴛᴜᴠᴡxʏᴢ',
        ),
      ),
  },
  {
    name: 'Underline',
    transform: (v: string) => strike(v, '\u0332'),
  },
  {
    name: 'Double Overline',
    transform: (v: string) => strike(v, '\u035E\u035F'),
  },
  {
    name: 'Double Underline',
    transform: (v: string) => strike(v, '\u0347'),
  },
  {
    name: 'Strikethrough',
    transform: (v: string) => strike(v, '\u0336'),
  },
];

const results = computed(() =>
  styles.map(style => ({
    name: style.name,
    value: style.transform(text.value),
  })),
);

const copyValue = (value: string) => copy(value);
</script>

<template>
  <c-card class="fancy-text-card">
    <div class="title">
      {{ $t('tools.fancy-text-generator.title') }}
    </div>
    <n-input
      v-model:value="text"
      type="textarea"
      rows="2"
      :placeholder="$t('tools.fancy-text-generator.placeholder')"
    />
    <div class="list">
      <div v-for="item in results" :key="item.name" class="row">
        <div class="label">
          {{ item.name }}
        </div>
        <div class="value">
          {{ item.value }}
        </div>
        <c-button tertiary size="tiny" @click="copyValue(item.value)">
          {{ $t('tools.fancy-text-generator.copy') }}
        </c-button>
      </div>
    </div>
  </c-card>
</template>

<style scoped lang="less">
.fancy-text-card {
  /* Apply symbol-friendly fonts to the whole card to avoid tofu for astral-plane glyphs. */
  font-family: 'Segoe UI Symbol', 'Arial Unicode MS', 'Noto Sans Symbols 2', 'Noto Sans',
    'Apple Color Emoji', 'Noto Emoji', 'PingFang TC', 'PingFang SC', 'Microsoft YaHei',
    'Helvetica Neue', Arial, sans-serif;
}
.title {
  font-size: 20px;
  font-weight: 600;
  margin-bottom: 8px;
  color: v-bind('themeVars.textColor1');
}
.list {
  margin-top: 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px;
  border: 1px solid v-bind('themeVars.borderColor');
  border-radius: 8px;
  background: v-bind('themeVars.cardColor');
}
.label {
  min-width: 120px;
  font-weight: 600;
  color: v-bind('themeVars.textColor2');
}
.value {
  flex: 1;
  font-size: 18px;
  word-break: break-all;
  color: v-bind('themeVars.textColor1');
}
@media (max-width: 768px) {
  .row {
    flex-direction: column;
    align-items: flex-start;
  }
  .label {
    min-width: auto;
  }
}
</style>
