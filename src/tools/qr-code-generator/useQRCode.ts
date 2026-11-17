import { get } from '@vueuse/core';
import QRCodeStyling from 'qr-code-styling';
import { type MaybeRef, isRef, onMounted, ref, watch } from 'vue';

type StyledQrStyle = 'square' | 'dots' | 'rounded' | 'classy' | 'classy-rounded' | 'extra-rounded';
type StyledErrorCorrection = 'low' | 'medium' | 'quartile' | 'high';
type CornerSquare = 'dot' | 'square' | 'extra-rounded' | 'classy';
type CornerDot = 'dot' | 'square';

export function useQRCode({
  text,
  color: { background, foreground },
  errorCorrectionLevel,
  style,
  container,
  size,
  margin,
  cornerSquareType,
  cornerDotType,
  image,
}: {
  text: MaybeRef<string>
  color: { foreground: MaybeRef<string>; background: MaybeRef<string> }
  errorCorrectionLevel?: MaybeRef<StyledErrorCorrection>
  style?: MaybeRef<StyledQrStyle>
  container: MaybeRef<HTMLElement | null>
  size?: MaybeRef<number>
  margin?: MaybeRef<number>
  cornerSquareType?: MaybeRef<CornerSquare>
  cornerDotType?: MaybeRef<CornerDot>
  image?: MaybeRef<string | undefined>
}) {
  const instance = ref<QRCodeStyling>();

  const levelMap: Record<StyledErrorCorrection, 'L' | 'M' | 'Q' | 'H'> = {
    low: 'L',
    medium: 'M',
    quartile: 'Q',
    high: 'H',
  };

  const ensureInstance = () => {
    if (instance.value) return;

    const node = get(container);
    if (!node) return;

    instance.value = new QRCodeStyling({
      width: get(size) ?? 256,
      height: get(size) ?? 256,
      data: get(text),
      qrOptions: { errorCorrectionLevel: levelMap[get(errorCorrectionLevel) ?? 'medium'] },
      dotsOptions: { color: get(foreground), type: get(style) ?? 'square' },
      backgroundOptions: { color: get(background) },
      cornersSquareOptions: { type: get(cornerSquareType) ?? 'extra-rounded', color: get(foreground) },
      cornersDotOptions: { type: get(cornerDotType) ?? 'dot', color: get(foreground) },
      image: get(image),
    });

    instance.value.append(node);
  };

  const update = () => {
    if (!get(text)) return;
    ensureInstance();
    if (!instance.value) return;

    instance.value.update({
      data: get(text)?.trim(),
      width: get(size) ?? 256,
      height: get(size) ?? 256,
      qrOptions: { errorCorrectionLevel: levelMap[get(errorCorrectionLevel) ?? 'medium'] },
      dotsOptions: { color: get(foreground), type: get(style) ?? 'square' },
      backgroundOptions: { color: get(background) },
      cornersSquareOptions: { type: get(cornerSquareType) ?? 'extra-rounded', color: get(foreground) },
      cornersDotOptions: { type: get(cornerDotType) ?? 'dot', color: get(foreground) },
      image: get(image),
      imageOptions: { margin: get(margin) ?? 8, hideBackgroundDots: true, imageSize: 0.3, crossOrigin: 'anonymous' },
    });
  };

  onMounted(update);

  watch(
    [text, background, foreground, errorCorrectionLevel, style, size, margin, cornerSquareType, cornerDotType, image].filter(isRef),
    update,
    { immediate: true },
  );

  const download = () => instance.value?.download({ name: 'qr-code', extension: 'png' });

  return { download };
}
