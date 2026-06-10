<script setup lang="ts">
import { ref, watch, onUnmounted, computed } from 'vue';
import { NProgress, NIcon } from 'naive-ui';
import { P2PService, type Role } from './p2p-file-transfer.service';
import {
  PublicOutlined as IconWorld,
  AssignmentOutlined as IconClipboard,
  CloudOutlined as IconCloud,
  SendOutlined as IconSend,
  DownloadOutlined as IconDownload,
  PlayArrowOutlined as IconPlay,
} from '@vicons/material';

const connectionMode = ref<'peerjs' | 'manual'>('peerjs');
const role = ref<Role>('sender');
const isRoomCreated = ref(false);

const selectedFile = ref<File | null>(null);
const transferProgress = ref(0);

const p2pService = new P2PService(ref);
const { state, peerId, remotePeerId } = p2pService;

const targetPeerId = ref('');
const manualOffer = ref('');
const manualAnswer = ref('');

const CHUNK_SIZE = 64 * 1024;
const MAX_BUFFER = 16 * 1024 * 1024;

let currentFileOffset = 0;
let fileReader: FileReader | null = null;
let receivedChunks: ArrayBuffer[] = [];
let incomingFileMetadata: { name: string, size: number, type: string } | null = null;
let receivedSize = 0;

p2pService.onFileMetadata = (metadata) => {
  incomingFileMetadata = metadata;
  receivedChunks = [];
  receivedSize = 0;
  transferProgress.value = 0;
};

p2pService.onDataReceived = (data: ArrayBuffer) => {
  if (!incomingFileMetadata) return;
  receivedChunks.push(data);
  receivedSize += data.byteLength;
  transferProgress.value = Math.round((receivedSize / incomingFileMetadata.size) * 100);
};

p2pService.onTransferComplete = () => {
  if (!incomingFileMetadata) return;
  const blob = new Blob(receivedChunks, { type: incomingFileMetadata.type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = incomingFileMetadata.name;
  a.click();
  URL.revokeObjectURL(url);
  transferProgress.value = 100;
};

async function sendFile() {
  if (!selectedFile.value || state.value !== 'connected') return;

  const file = selectedFile.value;
  p2pService.sendData({
    type: 'metadata',
    metadata: {
      name: file.name,
      size: file.size,
      type: file.type,
    }
  });

  currentFileOffset = 0;
  transferProgress.value = 0;
  fileReader = new FileReader();

  fileReader.onload = (e) => {
    if (e.target && e.target.result) {
      p2pService.sendData(e.target.result);
      currentFileOffset += (e.target.result as ArrayBuffer).byteLength;
      transferProgress.value = Math.round((currentFileOffset / file.size) * 100);
      readNextChunk(file);
    }
  };

  readNextChunk(file);
}

function readNextChunk(file: File) {
  if (currentFileOffset >= file.size) {
    p2pService.sendData({ type: 'complete' });
    return;
  }

  if (p2pService.bufferedAmount > MAX_BUFFER) {
    setTimeout(() => readNextChunk(file), 50);
    return;
  }

  const chunk = file.slice(currentFileOffset, currentFileOffset + CHUNK_SIZE);
  fileReader?.readAsArrayBuffer(chunk);
}

function startConnection() {
  isRoomCreated.value = true;
  p2pService.destroy();
  if (connectionMode.value === 'peerjs') {
    p2pService.initPeerJS(role.value);
  } else {
    p2pService.initManual(role.value);
  }
}

function resetConnection() {
  isRoomCreated.value = false;
  p2pService.destroy();
}

onUnmounted(() => {
  p2pService.destroy();
});

function handleFileUpload(file: File) {
  selectedFile.value = file;
}

function connectPeerJS() {
  if (targetPeerId.value) {
    p2pService.connectToPeer(targetPeerId.value);
  }
}

async function generateManualOffer() {
  try {
    manualOffer.value = await p2pService.createOffer();
  } catch (err) {
    console.error(err);
  }
}

async function acceptManualOffer() {
  try {
    if (manualOffer.value) {
      manualAnswer.value = await p2pService.acceptOfferAndCreateAnswer(manualOffer.value);
    }
  } catch (err) {
    console.error(err);
  }
}

async function acceptManualAnswer() {
  try {
    if (manualAnswer.value) {
      await p2pService.acceptAnswer(manualAnswer.value);
    }
  } catch (err) {
    console.error(err);
  }
}

</script>

<template>
  <div class="p2p-wrapper">
    <div class="mb-8 pl-4 border-l-4 border-primary">
      <h1 class="text-4xl font-bold mb-2">
        P2P 點對點傳檔
      </h1>
      <p class="text-textColor2 max-w-3xl">
        透過 WebRTC 在兩台裝置間直接傳送任意檔案，端對端加密，資料不經過伺服器。支援手動信令與 PeerJS 兩種連線方式。
      </p>
    </div>

    <!-- Configuration Step -->
    <c-card v-if="!isRoomCreated" class="setup-card">
      <div class="mb-8">
        <h3 class="font-bold mb-4 text-base">請選擇連線方式</h3>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          
          <div 
            class="mode-card"
            :class="{ 'active': connectionMode === 'peerjs' }"
            @click="connectionMode = 'peerjs'"
          >
            <n-icon size="32" class="mb-3"><IconWorld /></n-icon>
            <div class="font-bold mb-1">PeerJS (簡單)</div>
            <div class="text-xs op-70">分享房間代碼，自動完成 WebRTC 信令</div>
          </div>

          <div 
            class="mode-card"
            :class="{ 'active': connectionMode === 'manual' }"
            @click="connectionMode = 'manual'"
          >
            <n-icon size="32" class="mb-3"><IconClipboard /></n-icon>
            <div class="font-bold mb-1">手動信令</div>
            <div class="text-xs op-70">手動交換 SDP，完全不依賴中介伺服器</div>
          </div>

          <div class="mode-card disabled border-dashed op-50 relative">
            <div class="absolute top-2 right-2 text-[10px] bg-actionColor text-textColor2 px-2 py-1 rounded">即將推出</div>
            <n-icon size="32" class="mb-3"><IconCloud /></n-icon>
            <div class="font-bold mb-1">Firebase</div>
            <div class="text-xs op-70">透過 Firebase 自動信令</div>
          </div>

        </div>
      </div>

      <div class="mb-8">
        <h3 class="font-bold mb-4 text-base">請選擇您的角色</h3>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          <div 
            class="mode-card"
            :class="{ 'active': role === 'sender' }"
            @click="role = 'sender'"
          >
            <n-icon size="32" class="mb-3"><IconSend /></n-icon>
            <div class="font-bold mb-1">傳送端</div>
            <div class="text-xs op-70">選擇並傳送檔案</div>
          </div>

          <div 
            class="mode-card"
            :class="{ 'active': role === 'receiver' }"
            @click="role = 'receiver'"
          >
            <n-icon size="32" class="mb-3"><IconDownload /></n-icon>
            <div class="font-bold mb-1">接收端</div>
            <div class="text-xs op-70">等待並下載檔案</div>
          </div>

        </div>
      </div>

      <c-button type="primary" size="large" class="w-full text-lg h-14 font-bold" @click="startConnection">
        <template #icon><n-icon><IconPlay /></n-icon></template>
        建立房間
      </c-button>
    </c-card>

    <!-- Active Room Step -->
    <c-card v-else class="active-room-card">
      <div class="flex justify-between items-center mb-6 border-b pb-4 border-dividerColor">
        <div>
          <h2 class="text-2xl font-bold">房間已建立</h2>
          <div class="text-sm op-70 mt-1">模式: {{ connectionMode === 'peerjs' ? 'PeerJS' : '手動信令' }} | 角色: {{ role === 'sender' ? '傳送端' : '接收端' }}</div>
        </div>
        <c-button size="small" @click="resetConnection">重新設定</c-button>
      </div>

      <!-- Status Indicator -->
      <div class="p-3 mb-6 rounded font-bold text-center" :class="{
        'bg-actionColor text-textColor1': state === 'disconnected',
        'bg-warningColor text-black': state === 'connecting',
        'bg-successColor text-white': state === 'connected',
        'bg-red-500 text-white': state === 'error'
      }">
        連線狀態: {{ state.toUpperCase() }}
      </div>

      <div v-if="state !== 'connected'" class="flex flex-col gap-6">
        <!-- PeerJS Signaling -->
        <div v-if="connectionMode === 'peerjs'">
          <div v-if="role === 'receiver'" class="bg-actionColor p-6 rounded-xl text-center">
            <div class="text-sm op-70 mb-2">請將以下代碼分享給傳送端</div>
            <div class="text-3xl font-mono font-bold select-all tracking-wider text-primary">{{ peerId || '生成中...' }}</div>
          </div>
          <div v-if="role === 'sender'" class="flex flex-col gap-2">
            <c-label label="輸入接收端的房間代碼"></c-label>
            <div class="flex gap-2">
              <c-input-text v-model:value="targetPeerId" placeholder="例如: 123-abc-456" class="flex-1 text-lg font-mono" />
              <c-button type="primary" size="large" @click="connectPeerJS">連線</c-button>
            </div>
          </div>
        </div>

        <!-- Manual Signaling -->
        <div v-if="connectionMode === 'manual'">
          <div v-if="role === 'sender'" class="flex flex-col gap-4">
            <c-button type="primary" @click="generateManualOffer" class="w-full">1. 產生邀請碼 (Offer)</c-button>
            <c-label label="您的邀請碼 (複製給接收端)"></c-label>
            <c-input-text v-model:value="manualOffer" multiline rows="4" readonly class="font-mono text-xs" />
            <c-label label="接收端的回條 (貼上至此)"></c-label>
            <c-input-text v-model:value="manualAnswer" multiline rows="4" class="font-mono text-xs" />
            <c-button type="primary" @click="acceptManualAnswer" class="w-full">2. 確認連線</c-button>
          </div>

          <div v-if="role === 'receiver'" class="flex flex-col gap-4">
            <c-label label="傳送端的邀請碼 (貼上至此)"></c-label>
            <c-input-text v-model:value="manualOffer" multiline rows="4" class="font-mono text-xs" />
            <c-button type="primary" @click="acceptManualOffer" class="w-full">1. 接受邀請並產生回條</c-button>
            <c-label label="您的回條 (複製給傳送端)"></c-label>
            <c-input-text v-model:value="manualAnswer" multiline rows="4" readonly class="font-mono text-xs" />
          </div>
        </div>
      </div>

      <!-- File Transfer UI -->
      <template v-if="state === 'connected'">
        
        <div v-if="role === 'sender'" class="mt-4">
          <c-file-upload
            v-if="!selectedFile"
            @file-upload="handleFileUpload"
          />
          <div v-else class="bg-actionColor p-4 rounded-xl flex items-center justify-between">
            <div class="flex flex-col">
              <span class="font-bold text-lg truncate max-w-xs">{{ selectedFile.name }}</span>
              <span class="text-sm op-70">{{ (selectedFile.size / 1024 / 1024).toFixed(2) }} MB</span>
            </div>
            <div class="flex gap-2">
              <c-button type="danger" @click="selectedFile = null">移除</c-button>
              <c-button type="primary" @click="sendFile">開始傳送</c-button>
            </div>
          </div>
        </div>

        <div v-if="role === 'receiver'" class="mt-4">
          <div class="border-2 border-dashed border-dividerColor rounded-xl p-10 flex flex-col items-center justify-center text-center">
            <n-icon size="48" class="text-successColor mb-4"><IconDownload /></n-icon>
            <div class="text-xl font-bold">等待接收檔案...</div>
            <div class="text-sm op-70 mt-2">連線已就緒，請請傳送端選擇檔案並發送。</div>
          </div>
        </div>

        <div v-if="transferProgress > 0" class="mt-8">
          <c-label label="傳輸進度">
            <n-progress type="line" :percentage="transferProgress" indicator-placement="inside" />
          </c-label>
        </div>
      </template>
    </c-card>
  </div>
</template>

<style lang="less" scoped>
.mode-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
  border: 2px solid var(--border-color, #e5e7eb);
  border-radius: 0.75rem;
  cursor: pointer;
  transition: all 0.2s ease-in-out;
  text-align: center;
  background-color: var(--card-color);

  &:hover:not(.disabled) {
    border-color: var(--primary-color-hover);
    transform: translateY(-2px);
  }

  &.active {
    border-color: var(--primary-color);
    background-color: var(--action-color-hover);
    color: var(--primary-color);
  }

  &.disabled {
    cursor: not-allowed;
  }
}
</style>