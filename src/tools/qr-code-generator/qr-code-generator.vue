<script setup lang="ts">
import { useQRCode } from './useQRCode';

const foreground = ref('#000000ff');
const background = ref('#ffffffff');
const errorCorrectionLevel = ref<'low' | 'medium' | 'quartile' | 'high'>('medium');
const style = ref<'square' | 'dots' | 'rounded' | 'classy' | 'classy-rounded' | 'extra-rounded'>('square');
const cornerSquareType = ref<'dot' | 'square' | 'extra-rounded' | 'classy'>('extra-rounded');
const cornerDotType = ref<'dot' | 'square'>('dot');
const size = ref(256);
const logoDataUrl = ref<string>();
const logoMargin = ref(8);
const qrContainer = ref<HTMLElement | null>(null);

const errorCorrectionLevels = ['low', 'medium', 'quartile', 'high'];
const styles = [
  { label: 'Square', value: 'square' as const },
  { label: 'Dots', value: 'dots' as const },
  { label: 'Rounded', value: 'rounded' as const },
  { label: 'Classy', value: 'classy' as const },
  { label: 'Classy Rounded', value: 'classy-rounded' as const },
  { label: 'Extra Rounded', value: 'extra-rounded' as const },
];
const cornerSquares = [
  { label: 'Extra Rounded', value: 'extra-rounded' as const },
  { label: 'Dot', value: 'dot' as const },
  { label: 'Square', value: 'square' as const },
  { label: 'Classy', value: 'classy' as const },
];
const cornerDots = [
  { label: 'Dot', value: 'dot' as const },
  { label: 'Square', value: 'square' as const },
];

const text = ref('https://tool.david888.com');
const { download } = useQRCode({
  text,
  color: {
    background,
    foreground,
  },
  errorCorrectionLevel,
  style,
  container: qrContainer,
  size,
  margin: logoMargin,
  cornerSquareType,
  cornerDotType,
  image: logoDataUrl,
});

function resetToBasic() {
  text.value = 'https://tool.david888.com';
  foreground.value = '#000000ff';
  background.value = '#ffffffff';
  style.value = 'square';
  cornerSquareType.value = 'square';
  cornerDotType.value = 'square';
  size.value = 256;
  logoDataUrl.value = undefined;
  logoMargin.value = 0;
  errorCorrectionLevel.value = 'medium';
}

function onLogoChange(event: Event) {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  if (!file) {
    logoDataUrl.value = undefined;
    return;
  }
  const reader = new FileReader();
  reader.onload = (e) => {
    logoDataUrl.value = e.target?.result as string;
  };
  reader.readAsDataURL(file);
}
</script>

<template>
  <c-card class="qr-generator-card">
    <n-grid class="qr-generator-grid" x-gap="18" y-gap="18" cols="1">
      <n-gi>
        <div class="preview-panel" mt-2 flex flex-col items-center gap-3>
          <div ref="qrContainer" flex items-center justify-center rd-8px bg-white p-4 shadow-sm />
          <c-button @click="download">
            Download qr-code
          </c-button>
        </div>
      </n-gi>
      <n-gi>
        <c-input-text
          v-model:value="text"
          label-position="left"
          label-width="130px"
          label-align="right"
          label="Text:"

          rows="1"

          placeholder="Your link or text..."
          autosize multiline mb-6
        />
        <n-form label-width="130" label-placement="left">
          <div flex justify-end>
            <c-button size="small" tertiary @click="resetToBasic">
              重置為基礎樣式
            </c-button>
          </div>
          <n-form-item label="Foreground color:">
            <n-color-picker v-model:value="foreground" :modes="['hex']" />
          </n-form-item>
          <n-form-item label="Background color:">
            <n-color-picker v-model:value="background" :modes="['hex']" />
          </n-form-item>
          <n-form-item label="Style:">
            <n-radio-group v-model:value="style">
              <n-space wrap>
                <n-radio-button v-for="opt in styles" :key="opt.value" :value="opt.value" :label="opt.label" />
              </n-space>
            </n-radio-group>
          </n-form-item>
          <n-form-item label="Corner squares:">
            <n-radio-group v-model:value="cornerSquareType">
              <n-space wrap>
                <n-radio-button v-for="opt in cornerSquares" :key="opt.value" :value="opt.value" :label="opt.label" />
              </n-space>
            </n-radio-group>
          </n-form-item>
          <n-form-item label="Corner dots:">
            <n-radio-group v-model:value="cornerDotType">
              <n-space wrap>
                <n-radio-button v-for="opt in cornerDots" :key="opt.value" :value="opt.value" :label="opt.label" />
              </n-space>
            </n-radio-group>
          </n-form-item>
          <n-form-item label="Size:">
            <n-input-number v-model:value="size" :min="180" :max="640" />
          </n-form-item>
          <n-form-item label="Logo image:">
            <input type="file" accept="image/*" @change="onLogoChange">
          </n-form-item>
          <n-form-item label="Logo margin:">
            <n-input-number v-model:value="logoMargin" :min="0" :max="30" />
          </n-form-item>
          <c-select
            v-model:value="errorCorrectionLevel"
            label="Error resistance:"
            label-position="left"
            label-width="130px"
            label-align="right"
            :options="errorCorrectionLevels.map((value) => ({ label: value, value }))"
          />
        </n-form>
      </n-gi>
    </n-grid>
  </c-card>
</template>

<style scoped>
.qr-generator-card {
  width: 100%;
  max-width: none;
  flex: 1 1 100%;
}

.preview-panel {
  position: sticky;
  top: 8px;
}

@media (min-width: 980px) {
  .qr-generator-grid {
    grid-template-columns: minmax(320px, 0.7fr) minmax(0, 1.3fr) !important;
    align-items: start;
  }
}
</style>
