<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue';
import './styles.css';
import { el, installTooltips } from './ui/components';
import { createProcessView, hasUnsavedResults, syncPatternChanges } from './ui/process-view';
import { createPatternsView } from './ui/patterns-view';
import { createRestoreView } from './ui/restore-view';

type TabId = 'process' | 'patterns' | 'restore';

const activeTab = ref<TabId>('process');
const containerRef = ref<HTMLDivElement | null>(null);
const panelsRef = ref<HTMLElement | null>(null);

const views = new Map<TabId, HTMLElement>();

function activateTab(id: TabId) {
  activeTab.value = id;
  // Remove any lingering selection popups from other tabs
  document.querySelector('.add-popup')?.remove();
  window.getSelection()?.removeAllRanges();

  for (const t of ['process', 'patterns', 'restore'] as TabId[]) {
    let v = views.get(t);
    if (!v && t === id && panelsRef.value) {
      if (t === 'process') v = createProcessView();
      else if (t === 'patterns') v = createPatternsView();
      else if (t === 'restore') v = createRestoreView();
      if (v) {
        views.set(t, v);
        panelsRef.value.append(v);
      }
    }
    if (v) v.hidden = t !== id;
  }

  // Refresh patterns view when switching to it
  if (id === 'patterns') {
    const fresh = createPatternsView();
    views.get('patterns')?.replaceWith(fresh);
    views.set('patterns', fresh);
  }
  // Sync patterns if coming back to process view
  if (id === 'process') {
    syncPatternChanges();
  }
}

function handleBeforeUnload(e: BeforeUnloadEvent) {
  if (hasUnsavedResults()) {
    e.preventDefault();
    e.returnValue = '';
  }
}

onMounted(() => {
  installTooltips();
  window.addEventListener('beforeunload', handleBeforeUnload);

  // Initialize first view
  if (panelsRef.value) {
    const processView = createProcessView();
    views.set('process', processView);
    panelsRef.value.append(processView);
  }
});

onBeforeUnmount(() => {
  window.removeEventListener('beforeunload', handleBeforeUnload);
  document.querySelector('.add-popup')?.remove();
  document.querySelector('.busy-overlay')?.remove();
});
</script>

<template>
  <div class="deid-app-container" ref="containerRef">
    <header class="header">
      <div class="brand">
        <div class="flex items-center gap-2">
          <h1>文件個資去識別化工具</h1>
          <span class="text-xs px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 font-medium">純前端 100% 離線</span>
        </div>
        <span class="muted text-xs">PDF（含掃描 OCR）/ Word / Excel / TXT / Markdown 自動偵測個資、遮罩預覽、人工覆核、CSV 編碼表可還原</span>
      </div>

      <nav class="tabs">
        <button
          type="button"
          class="tab"
          :class="{ active: activeTab === 'process' }"
          @click="activateTab('process')"
        >
          去識別化
        </button>
        <button
          type="button"
          class="tab"
          :class="{ active: activeTab === 'patterns' }"
          @click="activateTab('patterns')"
        >
          偵測規則
        </button>
        <button
          type="button"
          class="tab"
          :class="{ active: activeTab === 'restore' }"
          @click="activateTab('restore')"
        >
          用編碼表還原
        </button>
        <a
          class="tab tab-link text-xs flex items-center gap-1"
          href="https://github.com/dean9703111/data-deidentification#操作流程"
          target="_blank"
          rel="noopener"
          title="開啟原專案 GitHub 操作說明"
        >
          說明文件 ↗
        </a>
      </nav>
    </header>

    <main class="panels" ref="panelsRef">
      <!-- Views are dynamically mounted and switched here -->
    </main>

    <footer class="footer border-t border-[var(--border)] py-3 px-6 text-xs text-[var(--muted)] flex items-center justify-between flex-wrap gap-2">
      <div>
        <strong>文件去識別化工具</strong>
        <span>・改編自開源專案 </span>
        <a href="https://github.com/dean9703111/data-deidentification" target="_blank" rel="noopener" class="text-blue-500 underline">
          dean9703111/data-deidentification
        </a>
        <span> (MIT License by Dean Lin)</span>
      </div>
      <div>
        <span>純本機運算・所有檔案均不離開瀏覽器</span>
      </div>
    </footer>
  </div>
</template>

<style scoped>
.deid-app-container {
  min-height: calc(100vh - 120px);
}
</style>
