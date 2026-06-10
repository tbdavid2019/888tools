<script setup lang="ts">
import { ref, onUnmounted } from 'vue';
import { NProgress, NIcon } from 'naive-ui';
import { P2PService, type Role } from './p2p-file-transfer.service';
import {
  PublicOutlined as IconWorld,
  AssignmentOutlined as IconClipboard,
  CloudOutlined as IconCloud,
  SendOutlined as IconSend,
  DownloadOutlined as IconDownload,
  PlayArrowOutlined as IconPlay,
  UploadFileOutlined as IconUploadFile,
  CloseOutlined as IconClose
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
      <h1 class="text-4xl font-bold mb-2 text-heading">
        P2P 點對點傳檔
      </h1>
      <p class="text-textColor2 max-w-3xl">
        透過 WebRTC 在兩台裝置間直接傳送任意檔案，端對端加密，資料不經過伺服器。支援手動信令與 PeerJS 兩種連線方式。
      </p>
    </div>

    <!-- Configuration Step -->
    <c-card v-if="!isRoomCreated" class="setup-card !p-8 shadow-xl relative">
      <div class="mb-8">
        <h3 class="font-bold mb-4 text-base text-textColor1">請選擇連線方式</h3>
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
        <h3 class="font-bold mb-4 text-base text-textColor1">請選擇您的角色</h3>
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

      <c-button type="primary" size="large" class="w-full text-lg h-14 font-bold tracking-widest" @click="startConnection">
        <template #icon><n-icon><IconPlay /></n-icon></template>
        建立房間
      </c-button>
    </c-card>

    <!-- Active Room Step -->
    <c-card v-else class="active-room-card !p-8 shadow-xl">
      <div class="flex justify-between items-center mb-6 border-b pb-4 border-dividerColor">
        <div class="flex items-center gap-2">
          <div class="w-3 h-3 rounded-full" :class="{
            'bg-gray-400': state === 'disconnected',
            'bg-yellow-400': state === 'connecting',
            'bg-[#98BB6C]': state === 'connected',
            'bg-red-500': state === 'error'
          }"></div>
          <div class="font-bold text-sm" :class="{ 'text-[#98BB6C]': state === 'connected', 'text-textColor1': state !== 'connected' }">
            {{ state === 'connected' ? '已連線 (端對端加密)' : `狀態: ${state.toUpperCase()}` }}
          </div>
        </div>
        <div class="cursor-pointer text-xs op-60 hover:op-100 transition flex items-center gap-1 text-textColor2" @click="resetConnection">
          <n-icon><IconClose /></n-icon> 中斷連線
        </div>
      </div>

      <div v-if="state !== 'connected'" class="flex flex-col gap-6">
        <!-- PeerJS Signaling -->
        <div v-if="connectionMode === 'peerjs'">
          <div v-if="role === 'receiver'" class="bg-actionColor p-8 rounded-xl text-center border border-dividerColor">
            <div class="text-sm op-80 mb-4">請將以下代碼分享給傳送端</div>
            <div class="text-4xl font-mono font-bold select-all tracking-wider text-primary">{{ peerId || '生成中...' }}</div>
          </div>
          <div v-if="role === 'sender'" class="flex flex-col gap-3">
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
            <c-input-text v-model:value="manualOffer" multiline rows="3" readonly class="font-mono text-xs" />
            <c-label label="接收端的回條 (貼上至此)"></c-label>
            <c-input-text v-model:value="manualAnswer" multiline rows="3" class="font-mono text-xs" />
            <c-button type="primary" @click="acceptManualAnswer" class="w-full">2. 確認連線</c-button>
          </div>

          <div v-if="role === 'receiver'" class="flex flex-col gap-4">
            <c-label label="傳送端的邀請碼 (貼上至此)"></c-label>
            <c-input-text v-model:value="manualOffer" multiline rows="3" class="font-mono text-xs" />
            <c-button type="primary" @click="acceptManualOffer" class="w-full">1. 接受邀請並產生回條</c-button>
            <c-label label="您的回條 (複製給傳送端)"></c-label>
            <c-input-text v-model:value="manualAnswer" multiline rows="3" readonly class="font-mono text-xs" />
          </div>
        </div>
      </div>

      <!-- File Transfer UI -->
      <template v-if="state === 'connected'">
        
        <div v-if="role === 'sender'" class="mt-4">
          <div class="border-2 border-dashed border-[#7E9CD8] bg-[rgba(126,156,216,0.05)] rounded-2xl p-12 flex flex-col items-center justify-center text-center transition hover:bg-[rgba(126,156,216,0.1)] relative">
            <c-file-upload v-if="!selectedFile" @file-upload="handleFileUpload" class="absolute inset-0 w-full h-full opacity-0 z-10 cursor-pointer" />
            <n-icon size="42" class="text-[#7E9CD8] mb-3"><IconUploadFile /></n-icon>
            <div class="text-[#7E9CD8] font-bold tracking-wider">點擊或拖曳檔案至此</div>
            
            <div v-if="selectedFile" class="absolute inset-0 bg-surface rounded-2xl flex flex-col items-center justify-center z-20">
               <div class="font-bold text-lg text-heading truncate max-w-sm">{{ selectedFile.name }}</div>
               <div class="text-sm op-70 mt-1 mb-4">{{ (selectedFile.size / 1024 / 1024).toFixed(2) }} MB</div>
               <c-button size="small" type="danger" @click="selectedFile = null; transferProgress = 0" class="!absolute top-4 right-4">移除</c-button>
            </div>
          </div>
          <c-button v-if="selectedFile" type="primary" class="w-full mt-6 h-12 text-lg font-bold tracking-wider" @click="sendFile">
            <template #icon><n-icon><IconPlay /></n-icon></template>
            傳送檔案
          </c-button>
        </div>

        <div v-if="role === 'receiver'" class="mt-4">
          <div class="border-2 border-dashed border-[#98BB6C] bg-[rgba(152,187,108,0.05)] rounded-2xl p-16 flex flex-col items-center justify-center text-center">
            <n-icon size="56" class="text-[#98BB6C] mb-4"><IconDownload /></n-icon>
            <div class="text-2xl font-bold text-heading">等待接收檔案...</div>
            <div class="text-sm op-70 mt-2">連線已就緒，請傳送端選擇檔案並發送。</div>
          </div>
        </div>

        <div v-if="transferProgress > 0" class="mt-8">
          <c-label label="傳輸進度">
            <div class="flex justify-between text-xs font-mono op-70 mb-1">
              <span>Transferring...</span>
              <span>{{ transferProgress }}%</span>
            </div>
            <n-progress type="line" :percentage="transferProgress" :show-indicator="false" :height="8" color="#7FB4CA" />
          </c-label>
        </div>
      </template>
    </c-card>
  </div>
</template>

<style lang="less" scoped>
.setup-card, .active-room-card {
  border-radius: 20px;
}

.mode-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
  border: 2px solid var(--border-color, rgba(255, 255, 255, 0.1));
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