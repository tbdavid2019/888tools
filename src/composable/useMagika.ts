import { ref } from 'vue';
import type { MagikaDetection } from '@/services/magika/types';
import { detectFile } from '@/services/magika/magika.service';

export function useMagika() {
  const isLoading = ref(false);
  const error = ref<string | null>(null);
  const detection = ref<MagikaDetection | null>(null);

  async function identify(file: File | Blob, customFileName?: string): Promise<MagikaDetection | null> {
    isLoading.value = true;
    error.value = null;

    try {
      const res = await detectFile(file, customFileName);
      detection.value = res;
      return res;
    } catch (err: any) {
      console.error('Magika identification error:', err);
      error.value = err?.message || '檔案類型辨識失敗';
      return null;
    } finally {
      isLoading.value = false;
    }
  }

  function reset() {
    detection.value = null;
    error.value = null;
    isLoading.value = false;
  }

  return {
    isLoading,
    error,
    detection,
    identify,
    reset,
  };
}
