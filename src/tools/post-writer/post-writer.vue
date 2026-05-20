<script setup lang="ts">
import { ref, computed } from 'vue';
import { useClipboard } from '@vueuse/core';
import { useMessage, useThemeVars } from 'naive-ui';
import { Copy, Trash, InfoCircle } from '@vicons/tabler';

const themeVars = useThemeVars();
const { copy } = useClipboard();
const message = useMessage();

const inputText = ref('');
const layoutMode = ref<'magazine' | 'broetry'>('magazine');

// Settings
const enableMonochromeEmoji = ref(false);
const enableColonAlignment = ref(true);
const enableSentenceBreaks = ref(true); // Broetry comma splitting
const enableAccentBars = ref(true);     // Broetry side bar prefixing

const activeTab = ref<'facebook' | 'instagram' | 'threads'>('facebook');

const formattedText = computed(() => {
  let text = inputText.value || '';
  if (!text) return '';

  if (layoutMode.value === 'magazine') {
    // 1. Full-width Punctuation Replacement
    const puncMap: Record<string, string> = {
      ',': '，',
      '.': '。',
      '!': '！',
      '?': '？',
      ':': '：',
      ';': '；',
      '(': '（',
      ')': '）',
    };
    text = text.replace(/[,.!?:;()]/g, m => puncMap[m] || m);

    // 2. Emoji Monochrome (Appends Variation Selector-15 \uFE0E)
    if (enableMonochromeEmoji.value) {
      text = text.replace(/([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDC00-\uDFFF])/g, '$1\uFE0E');
    }

    // 3. Colon Alignment using Ideographic spaces
    if (enableColonAlignment.value) {
      const lines = text.split('\n');
      let startIdx = -1;
      let maxLen = 0;
      const alignedLines = [...lines];

      for (let i = 0; i <= lines.length; i++) {
        const line = lines[i];
        const isMatch = line && (line.includes(':') || line.includes('：'));
        
        if (isMatch) {
          if (startIdx === -1) startIdx = i;
          const separator = line.includes('：') ? '：' : ':';
          const parts = line.split(separator);
          const leftPart = parts[0].trim();
          if (leftPart.length > maxLen) {
            maxLen = leftPart.length;
          }
        } else {
          if (startIdx !== -1) {
            for (let j = startIdx; j < i; j++) {
              const curLine = lines[j];
              const separator = curLine.includes('：') ? '：' : ':';
              const parts = curLine.split(separator);
              const leftPart = parts[0].trim();
              const rightPart = parts.slice(1).join(separator).trim();
              const paddingCount = maxLen - leftPart.length;
              const padding = '\u3000'.repeat(paddingCount);
              alignedLines[j] = `${leftPart}${padding}：${rightPart}`;
            }
            startIdx = -1;
            maxLen = 0;
          }
        }
      }
      text = alignedLines.join('\n');
    }
  } else if (layoutMode.value === 'broetry') {
    let lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length > 0) {
      // 1. Title Heuristics
      let firstLine = lines[0];
      if (!firstLine.startsWith('【')) {
        firstLine = firstLine.replace(/^[【\[\(]|[】\]\)]$/g, '').trim();
        lines[0] = `【 ${firstLine} 】`;
      }

      // 2. Subtitle Heuristics (prefix with em dashes)
      if (lines.length > 1) {
        let secondLine = lines[1];
        if (!secondLine.startsWith('──')) {
          secondLine = secondLine.replace(/^[-—–]+/, '').trim();
          lines[1] = `── ${secondLine}`;
        }
      }

      // 3. Markdown headings conversion to ■■
      lines = lines.map((line, idx) => {
        if (idx === 0 || idx === 1) return line;
        if (line.startsWith('# ') || line.startsWith('## ') || line.startsWith('### ')) {
          return line.replace(/^#+\s+/, '■■ ');
        }
        return line;
      });

      // 4. Normalizing list bullets to ◆
      lines = lines.map((line, idx) => {
        if (idx === 0 || idx === 1) return line;
        if (/^[-*•▪◆✦]\s+/.test(line)) {
          return line.replace(/^[-*•▪◆✦]\s+/, '◆ ');
        }
        return line;
      });

      // 5. Comma splitting & Double spacing
      if (enableSentenceBreaks.value) {
        let resultLines: string[] = [];
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          if (i === 0 || i === 1 || line.startsWith('◆') || line.startsWith('■■')) {
            resultLines.push(line);
          } else {
            const subparts = line.split(/[，,]/g).map(s => s.trim()).filter(Boolean);
            resultLines.push(...subparts);
          }
        }
        lines = resultLines;
      }

      // 6. Side-line accent bar for lines under 15 characters
      if (enableAccentBars.value) {
        lines = lines.map((line, idx) => {
          if (idx === 0 || idx === 1 || line.startsWith('◆') || line.startsWith('■■') || line.startsWith('【')) {
            return line;
          }
          if (line.length > 0 && line.length < 15 && !line.startsWith('▋')) {
            return `▋ ${line}`;
          }
          return line;
        });
      }

      text = lines.join('\n\n');
    }
  }

  return text;
});

const stats = computed(() => {
  const text = formattedText.value;
  const len = text.length;
  const hashtagCount = (text.match(/#[^\s#]+/g) || []).length;

  return {
    length: len,
    hashtags: hashtagCount,
    facebook: {
      limit: 63206,
      valid: len <= 63206,
    },
    instagram: {
      limit: 2200,
      valid: len <= 2200 && hashtagCount <= 30,
    },
    threads: {
      limit: 500,
      valid: len <= 500,
    }
  };
});

const handleCopy = async () => {
  if (!formattedText.value) {
    message.warning('請先輸入貼文內容！');
    return;
  }
  await copy(formattedText.value);
  message.success('已複製排版後的貼文內容！');
};

const handleClear = () => {
  inputText.value = '';
  message.info('內容已清除');
};
</script>

<template>
  <div class="post-writer-container">
    <n-grid :cols="2" :x-gap="20" :y-gap="20" responsive="screen" item-responsive>
      <!-- Left side: Form Inputs & Settings -->
      <n-grid-item>
        <n-card class="editor-settings-card" title="✍ 社群貼文排版與編輯">
          <div class="mode-selector">
            <span class="section-title">排版樣式風格：</span>
            <n-space>
              <n-button
                :type="layoutMode === 'magazine' ? 'primary' : 'default'"
                secondary
                @click="layoutMode = 'magazine'"
              >
                📰 雜誌感齊頭樣式
              </n-button>
              <n-button
                :type="layoutMode === 'broetry' ? 'primary' : 'default'"
                secondary
                @click="layoutMode = 'broetry'"
              >
                📜 Broetry 敘事排版
              </n-button>
            </n-space>
          </div>

          <!-- Dynamic Options based on layout style -->
          <div class="options-container">
            <span class="section-title">格式處理參數：</span>
            <n-space vertical>
              <template v-if="layoutMode === 'magazine'">
                <n-checkbox v-model:checked="enableColonAlignment">
                  啟用冒號全形齊頭對齊 (例：時間　　：上午十時)
                </n-checkbox>
                <n-checkbox v-model:checked="enableMonochromeEmoji">
                  啟用表情符號單色化 (Appends VS15)
                </n-checkbox>
              </template>
              <template v-if="layoutMode === 'broetry'">
                <n-checkbox v-model:checked="enableSentenceBreaks">
                  啟用逗號自動折行與雙倍空行 (加強閱讀節奏)
                </n-checkbox>
                <n-checkbox v-model:checked="enableAccentBars">
                  短句前綴視覺焦點條 (▋ 短句)
                </n-checkbox>
              </template>
            </n-space>
          </div>

          <div class="textarea-wrapper">
            <span class="section-title">原始貼文內容：</span>
            <n-input
              v-model:value="inputText"
              type="textarea"
              placeholder="在此輸入或貼上您的社群貼文內容...
第一行將作為標題，第二行作為副標題。
使用逗號、列表符號（如 - 或 *）與冒號體驗自動排版效果。"
              :rows="12"
              show-count
            />
          </div>

          <div class="action-buttons">
            <n-space>
              <n-button type="primary" @click="handleCopy">
                <template #icon>
                  <n-icon><Copy /></n-icon>
                </template>
                複製排版結果
              </n-button>
              <n-button type="default" @click="handleClear">
                <template #icon>
                  <n-icon><Trash /></n-icon>
                </template>
                清除內容
              </n-button>
            </n-space>
          </div>
        </n-card>
      </n-grid-item>

      <!-- Right side: Platform Previews & Warnings -->
      <n-grid-item>
        <div class="previews-sidebar">
          <!-- Platform Tabs -->
          <div class="platform-tabs">
            <n-button
              :type="activeTab === 'facebook' ? 'primary' : 'default'"
              size="medium"
              quaternary
              :class="{ active: activeTab === 'facebook' }"
              @click="activeTab = 'facebook'"
            >
              Facebook
              <n-tag
                size="small"
                round
                :type="stats.facebook.valid ? 'success' : 'error'"
                style="margin-left: 6px;"
              >
                {{ stats.length }}
              </n-tag>
            </n-button>

            <n-button
              :type="activeTab === 'instagram' ? 'primary' : 'default'"
              size="medium"
              quaternary
              :class="{ active: activeTab === 'instagram' }"
              @click="activeTab = 'instagram'"
            >
              Instagram
              <n-tag
                size="small"
                round
                :type="stats.instagram.valid ? 'success' : 'error'"
                style="margin-left: 6px;"
              >
                {{ stats.length }}/2200
              </n-tag>
            </n-button>

            <n-button
              :type="activeTab === 'threads' ? 'primary' : 'default'"
              size="medium"
              quaternary
              :class="{ active: activeTab === 'threads' }"
              @click="activeTab = 'threads'"
            >
              Threads
              <n-tag
                size="small"
                round
                :type="stats.threads.valid ? 'success' : 'error'"
                style="margin-left: 6px;"
              >
                {{ stats.length }}/500
              </n-tag>
            </n-button>
          </div>

          <!-- Alert Notices -->
          <div class="warning-notices">
            <n-space vertical>
              <div v-if="activeTab === 'instagram' && stats.length > stats.instagram.limit" class="alert-box error">
                <n-icon><InfoCircle /></n-icon>
                <span>已超出 Instagram 2,200 字長度限制（目前：{{ stats.length }} 字）。</span>
              </div>
              <div v-if="activeTab === 'instagram' && stats.hashtags > 30" class="alert-box error">
                <n-icon><InfoCircle /></n-icon>
                <span>Hashtag 數量超出限制，請保持在 30 個以內（目前：{{ stats.hashtags }} 個）。</span>
              </div>
              <div v-if="activeTab === 'threads' && stats.length > stats.threads.limit" class="alert-box error">
                <n-icon><InfoCircle /></n-icon>
                <span>已超出 Threads 500 字長度限制（目前：{{ stats.length }} 字）。</span>
              </div>
              <div v-if="!inputText" class="alert-box info">
                <n-icon><InfoCircle /></n-icon>
                <span>請在左側輸入文字以開始產生社群預覽。</span>
              </div>
            </n-space>
          </div>

          <!-- Preview Frame (Feed Post Mockup) -->
          <div class="mockup-post-container">
            <div class="mockup-post-header">
              <div class="avatar">💡</div>
              <div class="user-info">
                <span class="display-name">創新思維設計室</span>
                <span class="user-handle">@creative_mind</span>
              </div>
            </div>

            <div class="mockup-post-content">
              <span v-if="formattedText" class="formatted-text-display">{{ formattedText }}</span>
              <span v-else class="placeholder-text">社群貼文即時排版預覽...</span>
            </div>

            <div class="mockup-post-footer">
              <div class="mock-actions">
                <span>❤️ 1,240</span>
                <span>💬 84</span>
                <span>🔁 212</span>
              </div>
            </div>
          </div>
        </div>
      </n-grid-item>
    </n-grid>
  </div>
</template>

<style scoped>
.post-writer-container {
  width: 100%;
}

.editor-settings-card {
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.section-title {
  display: block;
  font-weight: 600;
  margin-bottom: 8px;
  font-size: 0.95rem;
  opacity: 0.9;
}

.mode-selector,
.options-container,
.textarea-wrapper {
  margin-bottom: 20px;
}

.action-buttons {
  margin-top: 12px;
}

.previews-sidebar {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.platform-tabs {
  display: flex;
  border-bottom: 2px solid rgba(0, 0, 0, 0.05);
  padding-bottom: 6px;
  gap: 8px;
}

.platform-tabs .n-button {
  border-radius: 0;
  border-bottom: 2px solid transparent;
  font-weight: 600;
  padding: 0 12px 6px 12px;
}

.platform-tabs .n-button.active {
  border-bottom: 2px solid var(--n-color-target, #18a058);
}

.warning-notices {
  min-height: 40px;
}

.alert-box {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  border-radius: 6px;
  font-size: 0.85rem;
  line-height: 1.4;
}

.alert-box.info {
  background: rgba(24, 160, 88, 0.1);
  color: #18a058;
}

.alert-box.error {
  background: rgba(208, 48, 80, 0.1);
  color: #d03050;
}

.mockup-post-container {
  background: v-bind('themeVars?.cardColor || "#ffffff"');
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.03);
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.mockup-post-header {
  display: flex;
  align-items: center;
  gap: 10px;
}

.mockup-post-header .avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.05);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.3rem;
}

.mockup-post-header .user-info {
  display: flex;
  flex-direction: column;
}

.mockup-post-header .display-name {
  font-weight: 700;
  font-size: 0.95rem;
}

.mockup-post-header .user-handle {
  font-size: 0.8rem;
  opacity: 0.6;
}

.mockup-post-content {
  font-size: 0.95rem;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;
  min-height: 160px;
  padding: 4px 0;
  border-top: 1px solid rgba(0, 0, 0, 0.03);
  border-bottom: 1px solid rgba(0, 0, 0, 0.03);
}

.placeholder-text {
  opacity: 0.4;
  font-style: italic;
}

.formatted-text-display {
  display: block;
}

.mockup-post-footer {
  font-size: 0.85rem;
  opacity: 0.8;
}

.mock-actions {
  display: flex;
  gap: 20px;
  font-weight: 600;
}
</style>
