<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, nextTick, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useClipboard } from '@vueuse/core';
import { useMessage, NIcon, NInput, NButton, NCard, NAlert, NTag, NTooltip, NProgress, NModal } from 'naive-ui';
import Peer, { type DataConnection } from 'peerjs';
import {
  LaptopMacOutlined as IconLaptop,
  SmartphoneOutlined as IconPhone,
  UploadFileOutlined as IconUpload,
  DownloadOutlined as IconDownload,
  ArrowBackOutlined as IconBack,
  CasinoOutlined as IconDice,
  CheckCircleOutlined as IconCheck,
  ContentCopyOutlined as IconCopy,
  CloudUploadOutlined as IconCloudUpload,
  PeopleOutlined as IconPeople,
  PublicOutlined as IconWorld
} from '@vicons/material';
import { useStyleStore } from '@/stores/style.store';
import { kanagawaDarkPalette, kanagawaLightPalette } from '@/theme/palette';

// Types
type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error';
type TransferState = 'idle' | 'waiting-consent' | 'transferring' | 'complete';

// State
const myDeviceName = ref('');
const partnerDeviceName = ref('');
const peerId = ref('');
const targetPeerId = ref('');
const connectionState = ref<ConnectionState>('disconnected');
const role = ref<'sender' | 'receiver'>('sender');

const peer = ref<Peer | null>(null);
const connection = ref<DataConnection | null>(null);

const route = useRoute();
const router = useRouter();
const toast = useMessage();
const styleStore = useStyleStore();

// File Transfer States
const transferState = ref<TransferState>('idle');
const fileInput = ref<HTMLInputElement | null>(null);
const activeFile = ref<File | null>(null);

// Transfer progress variables
const transferProgress = ref(0);
const expectedFileName = ref('');
const expectedFileSize = ref(0);
const expectedFileType = ref('');
const receivedSize = ref(0);
let receivedChunks: ArrayBuffer[] = [];

// Chunk Sizing Constants
const CHUNK_SIZE = 16384; // 16 KB
const MAX_BUFFER = 65536; // 64 KB
let currentChunkIndex = 0;

// Random Device Name Generator
function getRandomDeviceName() {
  const isZh = route.name?.toString().includes('zh') || navigator.language.startsWith('zh');
  if (isZh) {
    const adjs = ['金黃的', '香甜的', '圓滾滾的', '脆脆的', '水嫩的', '成熟的', '幸運的', '快樂的', '呆萌的', '淘氣的', '蓬鬆的', '香濃的'];
    const nouns = ['芒果', '蘋果', '草莓', '西瓜', '水蜜桃', '鳳梨', '香蕉', '藍莓', '櫻桃', '葡萄', '荔枝', '哈密瓜', '紅豆', '玉米'];
    return adjs[Math.floor(Math.random() * adjs.length)] + nouns[Math.floor(Math.random() * nouns.length)] + ' 的裝置';
  } else {
    const adjs = ['Golden', 'Sweet', 'Round', 'Crispy', 'Juicy', 'Ripe', 'Lucky', 'Happy', 'Cute', 'Playful', 'Fluffy', 'Creamy'];
    const nouns = ['Mango', 'Apple', 'Strawberry', 'Watermelon', 'Peach', 'Pineapple', 'Banana', 'Blueberry', 'Cherry', 'Grape', 'Lychee', 'Melon', 'Corn', 'Berry'];
    return adjs[Math.floor(Math.random() * adjs.length)] + ' ' + nouns[Math.floor(Math.random() * nouns.length)] + ' Device';
  }
}

function randomizeName() {
  myDeviceName.value = getRandomDeviceName();
}

// Theme Sizing Computed Properties
const activePalette = computed(() => (styleStore.isDarkTheme ? kanagawaDarkPalette : kanagawaLightPalette));

const bentoCardStyle = computed(() => {
  const opacity = styleStore.isDarkTheme ? styleStore.cardOpacity : Math.max(styleStore.cardOpacity, 0.9);
  const border = activePalette.value.overlayBorder;
  const text = activePalette.value.text;
  return {
    backgroundColor: `rgba(${activePalette.value.glassBackgroundRgb}, ${opacity})`,
    border: `1px solid ${border}`,
    color: text,
  };
});

// Device Icon Type (Determines Laptop vs Mobile)
const isMobileDevice = computed(() => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
});

// Clipboard Helpers
const shareUrl = computed(() => {
  if (!peerId.value) return '';
  return `${window.location.origin}${route.path}?connect=${peerId.value}`;
});
const { copy: copyShareUrl, copied: copiedShareUrl } = useClipboard({ source: shareUrl });

// PeerJS Initialization
function initPeer() {
  connectionState.value = 'connecting';
  peer.value = new Peer();

  peer.value.on('open', (id) => {
    peerId.value = id;
    connectionState.value = 'disconnected'; // Ready to accept connections
    
    // Auto-connect if connect parameter is present
    if (route.query.connect) {
      targetPeerId.value = String(route.query.connect);
      connectToPartner();
    }
  });

  peer.value.on('connection', (conn) => {
    // Accept incoming connection
    if (connection.value) {
      connection.value.close();
    }
    role.value = 'receiver';
    setupConnection(conn);
  });

  peer.value.on('error', (err) => {
    console.error('Peer error:', err);
    connectionState.value = 'error';
    toast.error('信令伺服器錯誤：' + err.message);
  });
}

function connectToPartner() {
  if (!targetPeerId.value) return;
  if (!peer.value) return;

  role.value = 'sender';
  connectionState.value = 'connecting';
  const conn = peer.value.connect(targetPeerId.value);
  setupConnection(conn);
}

function setupConnection(conn: DataConnection) {
  connection.value = conn;

  conn.on('open', () => {
    connectionState.value = 'connected';
    targetPeerId.value = conn.peer;
    
    // Send initial handshake exchange
    conn.send({
      type: 'handshake',
      name: myDeviceName.value
    });
  });

  conn.on('data', (data: any) => {
    // 1. Handle Handshake
    if (data && data.type === 'handshake') {
      partnerDeviceName.value = data.name;
      if (role.value === 'receiver') {
        // Reply with our handshake
        conn.send({
          type: 'handshake',
          name: myDeviceName.value
        });
      }
      toast.success(`已成功連線至 ${partnerDeviceName.value}！`);
      return;
    }

    // 2. Handle File Consent Request (Receiver Side)
    if (data && data.type === 'file-request') {
      expectedFileName.value = data.name;
      expectedFileSize.value = data.size;
      expectedFileType.value = data.mimeType;
      receivedSize.value = 0;
      receivedChunks = [];
      
      transferState.value = 'waiting-consent';
      return;
    }

    // 3. Handle File Consent Response (Sender Side)
    if (data && data.type === 'file-response') {
      if (data.accepted) {
        toast.info('對方已同意接收，開始傳送檔案...');
        transferState.value = 'transferring';
        currentChunkIndex = 0;
        sendNextChunk();
      } else {
        toast.warning('對方拒絕接收此檔案。');
        transferState.value = 'idle';
        activeFile.value = null;
      }
      return;
    }

    // 4. Handle Completion
    if (data && data.type === 'transfer-complete') {
      saveReceivedFile();
      return;
    }

    // 5. Handle raw chunk data (Binary transfer)
    if (data instanceof ArrayBuffer || data instanceof Uint8Array) {
      const buffer = data instanceof Uint8Array ? data.buffer : data;
      receivedChunks.push(buffer);
      receivedSize.value += buffer.byteLength;
      
      // Calculate progress
      transferProgress.value = Math.floor((receivedSize.value / expectedFileSize.value) * 100);
      return;
    }
  });

  conn.on('close', () => {
    toast.info('連線已中斷');
    resetAll();
  });

  conn.on('error', (err) => {
    console.error('Conn error:', err);
    toast.error('傳輸錯誤：' + err.message);
    resetAll();
  });
}

// File Chunk Sender logic
function sendNextChunk() {
  if (!connection.value || !activeFile.value || transferState.value !== 'transferring') return;

  // Check buffer limit to prevent packet loss
  if (connection.value.dataChannel && connection.value.dataChannel.bufferedAmount > MAX_BUFFER) {
    setTimeout(sendNextChunk, 30);
    return;
  }

  const start = currentChunkIndex * CHUNK_SIZE;
  const end = Math.min(activeFile.value.size, start + CHUNK_SIZE);
  const slice = activeFile.value.slice(start, end);

  const reader = new FileReader();
  reader.onload = (e) => {
    if (e.target?.result && connection.value) {
      connection.value.send(e.target.result);
      currentChunkIndex++;
      
      // Update progress
      transferProgress.value = Math.floor((end / activeFile.value.size) * 100);

      if (end < activeFile.value.size) {
        sendNextChunk();
      } else {
        // Done
        connection.value.send({ type: 'transfer-complete' });
        toast.success('檔案傳送完成！');
        transferState.value = 'complete';
        setTimeout(() => {
          transferState.value = 'idle';
          activeFile.value = null;
        }, 1500);
      }
    }
  };
  reader.readAsArrayBuffer(slice);
}

// Consent Handlers
function acceptFileRequest() {
  if (!connection.value) return;
  
  connection.value.send({
    type: 'file-response',
    accepted: true
  });
  
  transferState.value = 'transferring';
  transferProgress.value = 0;
}

function declineFileRequest() {
  if (!connection.value) return;

  connection.value.send({
    type: 'file-response',
    accepted: false
  });

  transferState.value = 'idle';
}

// Assemble chunks and download
function saveReceivedFile() {
  const blob = new Blob(receivedChunks, { type: expectedFileType.value });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = expectedFileName.value;
  a.click();
  
  URL.revokeObjectURL(url);
  toast.success('檔案接收並下載完成！');
  transferState.value = 'complete';
  
  setTimeout(() => {
    transferState.value = 'idle';
  }, 1500);
}

// Drag & Drop / File Select Helpers
function triggerFileSelect() {
  fileInput.value?.click();
}

function handleFileSelection(e: Event) {
  const target = e.target as HTMLInputElement;
  if (!target.files || target.files.length === 0) return;
  initiateFileSend(target.files[0]);
}

function handleFileDrop(e: DragEvent) {
  e.preventDefault();
  if (connectionState.value !== 'connected') {
    toast.warning('請先連線裝置再傳送檔案');
    return;
  }
  if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
    initiateFileSend(e.dataTransfer.files[0]);
  }
}

function initiateFileSend(file: File) {
  if (!connection.value || connectionState.value !== 'connected') {
    toast.warning('尚未建立連線');
    return;
  }
  
  activeFile.value = file;
  expectedFileName.value = file.name;
  expectedFileSize.value = file.size;
  transferProgress.value = 0;
  
  transferState.value = 'waiting-consent';

  // Request consent
  connection.value.send({
    type: 'file-request',
    name: file.name,
    size: file.size,
    mimeType: file.type
  });
}

// Helpers
function formatBytes(bytes: number, decimals = 2) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

function resetAll() {
  if (connection.value) {
    connection.value.close();
  }
  if (peer.value) {
    peer.value.destroy();
    peer.value = null;
  }
  peerId.value = '';
  connectionState.value = 'disconnected';
  transferState.value = 'idle';
  activeFile.value = null;
  partnerDeviceName.value = '';
  
  if (route.query.connect) {
    router.replace({ query: {} });
  }
  
  // Re-init so the device is ready to listen again
  initPeer();
}

onMounted(() => {
  randomizeName();
  initPeer();
});

onUnmounted(() => {
  if (connection.value) connection.value.close();
  if (peer.value) peer.value.destroy();
});
</script>

<template>
  <div class="p2p-transfer-wrapper w-full flex justify-center">
    <div class="w-full max-w-2xl flex flex-col gap-6">

      <!-- Device Configuration Card -->
      <n-card :bordered="false" size="large" :style="bentoCardStyle" class="bento-card !p-2 md:!p-4">
        <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          
          <!-- Name Display -->
          <div class="flex flex-col">
            <span class="text-xs uppercase font-bold opacity-60 tracking-wider">您的本機名稱</span>
            <div class="flex gap-2 items-center mt-1">
              <span class="text-lg font-bold" :style="{ color: activePalette.accent }">{{ myDeviceName }}</span>
              <n-tooltip trigger="hover">
                <template #trigger>
                  <n-button circle secondary size="small" @click="randomizeName" :disabled="connectionState === 'connected'">
                    <template #icon><n-icon :component="IconDice" /></template>
                  </n-button>
                </template>
                更換隨機名稱 🎲
              </n-tooltip>
            </div>
            <span class="text-xs opacity-75 mt-1 flex items-center gap-1">
              <span class="w-2 h-2 rounded-full" :class="connectionState === 'connected' ? 'bg-emerald-500' : 'bg-amber-500'" />
              狀態：{{ connectionState === 'connected' ? '已連接好友裝置' : '等待連線中' }}
            </span>
          </div>

          <!-- Share Link Action -->
          <div class="w-full md:w-auto flex flex-col gap-2">
            <span class="text-xs uppercase font-bold opacity-60 tracking-wider">一鍵分享連結給好友</span>
            <div class="flex gap-2">
              <n-input :value="shareUrl" readonly size="small" placeholder="產生中..." class="w-full md:w-48" />
              <n-tooltip trigger="hover">
                <template #trigger>
                  <n-button size="small" type="primary" secondary @click="() => copyShareUrl()">
                    <n-icon :component="copiedShareUrl ? IconCheck : IconCopy" />
                  </n-button>
                </template>
                {{ copiedShareUrl ? '已複製！' : '複製邀請網址' }}
              </n-tooltip>
            </div>
          </div>

        </div>
      </n-card>

      <!-- Drag & Drop upload & Devices list -->
      <div 
        class="border-2 border-dashed rounded-3xl p-8 flex flex-col items-center justify-center min-h-[350px] transition relative overflow-hidden group"
        :style="{
          borderColor: connectionState === 'connected' ? 'var(--primary-color)' : 'rgba(255,255,255,0.12)',
          backgroundColor: connectionState === 'connected' ? 'rgba(16,185,129,0.04)' : 'rgba(255,255,255,0.01)'
        }"
        @dragover.prevent
        @drop="handleFileDrop"
      >
        <input 
          ref="fileInput"
          type="file" 
          class="hidden" 
          @change="handleFileSelection"
        />

        <!-- CASE 1: No devices connected (Show pulsing radar / waiting indicator) -->
        <div v-if="connectionState !== 'connected'" class="text-center flex flex-col items-center gap-4 py-8">
          <div class="w-20 h-20 rounded-full bg-emerald-500 flex items-center justify-center pulse-circle text-white mb-2">
            <n-icon size="40" :component="isMobileDevice ? IconPhone : IconLaptop" />
          </div>
          <h3 class="text-lg font-bold">正在等待其它裝置加入...</h3>
          <p class="text-sm opacity-75 max-w-sm leading-relaxed px-4">
            請將上方的邀請網址傳送給另一部裝置（例如手機或同事的電腦），對方點擊後即可自動在此互相看見並開始傳檔。
          </p>
        </div>

        <!-- CASE 2: Device Connected (Show Snapdrop device node) -->
        <div v-else class="flex flex-col items-center justify-center gap-6 py-6 w-full">
          
          <div 
            class="flex flex-col items-center justify-center cursor-pointer transition-transform duration-300 hover:scale-105"
            @click="triggerFileSelect"
          >
            <!-- Device Node Icon -->
            <div class="w-28 h-28 rounded-full border-4 border-emerald-500 bg-black/10 dark:bg-black/30 flex items-center justify-center shadow-lg relative group-hover:border-emerald-400 transition-colors">
              <n-icon size="56" :component="isMobileDevice ? IconPhone : IconLaptop" class="text-emerald-500 group-hover:text-emerald-400" />
              <!-- Upload badge -->
              <div class="absolute -bottom-2 bg-emerald-500 text-white rounded-full p-1.5 shadow-md flex items-center justify-center">
                <n-icon size="18" :component="IconCloudUpload" />
              </div>
            </div>
            
            <span class="text-base font-bold mt-4" style="color: var(--heading)">{{ partnerDeviceName || '好友裝置' }}</span>
            <span class="text-sm opacity-70 mt-1">點擊裝置發送檔案，或直接將檔案拖曳至此</span>
          </div>

          <div class="mt-4 pt-4 border-t border-gray-200/10 w-full max-w-xs flex justify-center">
            <n-button size="small" type="error" ghost @click="resetAll">
              <template #icon><n-icon :component="IconBack" /></template>
              中斷連線
            </n-button>
          </div>

        </div>

      </div>

    </div>

    <!-- 4. MODALS & POPUPS FOR FILE TRANSFERS -->
    
    <!-- Consent Popup: Receive Side -->
    <n-modal :show="transferState === 'waiting-consent' && role === 'receiver'" transform-origin="center">
      <n-card
        style="width: 380px"
        title="收到檔案傳送請求"
        :bordered="false"
        size="medium"
        role="dialog"
        aria-modal="true"
        :style="bentoCardStyle"
      >
        <div class="flex flex-col gap-3 py-2">
          <p class="text-base">
            來自 <span class="font-bold" :style="{ color: activePalette.accent }">「{{ partnerDeviceName }}」</span> 的檔案傳送請求：
          </p>
          <div class="bg-black/10 dark:bg-black/30 p-3 rounded-xl flex items-center gap-3">
            <n-icon size="32" :component="IconUpload" class="text-emerald-500" />
            <div class="flex-1 min-w-0">
              <div class="truncate font-bold text-base">{{ expectedFileName }}</div>
              <div class="text-sm opacity-75">{{ formatBytes(expectedFileSize) }}</div>
            </div>
          </div>
          <p class="text-sm opacity-70 mt-1 leading-normal">
            點擊「同意」將使用點對點安全直連建立傳輸，傳送完成後會自動儲存至您的下載資料夾。
          </p>
          <div class="flex gap-3 mt-4">
            <n-button block type="primary" @click="acceptFileRequest">同意接收</n-button>
            <n-button block ghost type="error" @click="declineFileRequest">拒絕</n-button>
          </div>
        </div>
      </n-card>
    </n-modal>

    <!-- Consent Loading: Sender Side -->
    <n-modal :show="transferState === 'waiting-consent' && role === 'sender'" transform-origin="center">
      <n-card
        style="width: 320px"
        :bordered="false"
        size="medium"
        role="dialog"
        aria-modal="true"
        :style="bentoCardStyle"
        class="text-center"
      >
        <div class="flex flex-col items-center gap-4 py-4">
          <div class="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-500"></div>
          <h4 class="font-bold text-base">等待對方確認...</h4>
          <p class="text-sm opacity-75 leading-relaxed">
            正在向「{{ partnerDeviceName }}」發送傳送要求，請等待對方點擊接受。
          </p>
          <div class="bg-black/10 dark:bg-black/30 p-2.5 rounded-lg text-sm w-full truncate font-medium mt-2">
            {{ expectedFileName }} ({{ formatBytes(expectedFileSize) }})
          </div>
        </div>
      </n-card>
    </n-modal>

    <!-- Transferring Progress Modal (Both Sides) -->
    <n-modal :show="transferState === 'transferring'" :closable="false" mask-closable="false" transform-origin="center">
      <n-card
        style="width: 360px"
        :bordered="false"
        size="medium"
        role="dialog"
        aria-modal="true"
        :style="bentoCardStyle"
      >
        <div class="flex flex-col gap-4 py-2">
          <h4 class="font-bold text-base text-center">
            {{ role === 'sender' ? '正在傳送檔案...' : '正在接收檔案...' }}
          </h4>
          <div class="bg-black/10 dark:bg-black/30 p-3 rounded-xl flex items-center gap-3">
            <n-icon size="32" :component="role === 'sender' ? IconUpload : IconDownload" class="text-emerald-500" />
            <div class="flex-1 min-w-0">
              <div class="truncate font-bold text-base">{{ expectedFileName }}</div>
              <div class="text-sm opacity-75">
                {{ role === 'sender' ? '傳送進度：' : '接收進度：' }}{{ formatBytes(receivedSize || (transferProgress * expectedFileSize) / 100) }} / {{ formatBytes(expectedFileSize) }}
              </div>
            </div>
          </div>
          
          <div class="flex flex-col gap-1 mt-2">
            <div class="flex justify-between text-sm font-mono opacity-85">
              <span>{{ transferProgress }}%</span>
              <span>{{ transferProgress === 100 ? '組裝檔案中...' : '直連傳輸中' }}</span>
            </div>
            <n-progress type="line" :percentage="transferProgress" :show-indicator="false" status="success" :height="10" />
          </div>
        </div>
      </n-card>
    </n-modal>

  </div>
</template>

<style scoped lang="less">
.p2p-transfer-wrapper {
  margin: 0 auto;
  flex: 1 1 100% !important;
  max-width: 100% !important;
}

.bento-card {
  border-radius: 20px;
  transition: background-color 0.3s, border-color 0.3s, color 0.3s;
}

@keyframes pulse {
  0% {
    transform: scale(0.95);
    box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7);
  }
  70% {
    transform: scale(1);
    box-shadow: 0 0 0 16px rgba(16, 185, 129, 0);
  }
  100% {
    transform: scale(0.95);
    box-shadow: 0 0 0 0 rgba(16, 185, 129, 0);
  }
}

.pulse-circle {
  animation: pulse 2s infinite;
}
</style>