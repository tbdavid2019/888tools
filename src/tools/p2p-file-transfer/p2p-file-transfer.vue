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
  <div class="p2p-wrapper w-full flex justify-center">
    <!-- Configuration Step -->
    <c-card v-if="!isRoomCreated" class="setup-card w-full max-w-2xl !p-6 md:!p-10">
      <div class="mb-8">
        <h3 class="font-bold mb-4 text-base" style="color: var(--text-color-1)">請選擇連線方式</h3>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          
          <div 
            class="mode-card"
            :class="{ 'active': connectionMode === 'peerjs' }"
            @click="connectionMode = 'peerjs'"
          >
            <n-icon size="32" class="mb-3"><IconWorld /></n-icon>
            <div class="font-bold mb-1">PeerJS (簡單)</div>
            <div class="text-xs" style="color: var(--text-color-3)">分享房間代碼，自動完成 WebRTC 信令</div>
          </div>

          <div 
            class="mode-card"
            :class="{ 'active': connectionMode === 'manual' }"
            @click="connectionMode = 'manual'"
          >
            <n-icon size="32" class="mb-3"><IconClipboard /></n-icon>
            <div class="font-bold mb-1">手動信令</div>
            <div class="text-xs" style="color: var(--text-color-3)">手動交換 SDP，完全不依賴中介伺服器</div>
          </div>

          <div class="mode-card disabled border-dashed relative" style="opacity: 0.5;">
            <div class="absolute top-2 right-2 text-[10px] px-2 py-1 rounded" style="background-color: var(--action-color); color: var(--text-color-2)">即將推出</div>
            <n-icon size="32" class="mb-3"><IconCloud /></n-icon>
            <div class="font-bold mb-1">Firebase</div>
            <div class="text-xs" style="color: var(--text-color-3)">透過 Firebase 自動信令</div>
          </div>

        </div>
      </div>

      <div class="mb-8">
        <h3 class="font-bold mb-4 text-base" style="color: var(--text-color-1)">請選擇您的角色</h3>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          <div 
            class="mode-card"
            :class="{ 'active': role === 'sender' }"
            @click="role = 'sender'"
          >
            <n-icon size="32" class="mb-3"><IconSend /></n-icon>
            <div class="font-bold mb-1">傳送端</div>
            <div class="text-xs" style="color: var(--text-color-3)">選擇並傳送檔案</div>
          </div>

          <div 
            class="mode-card"
            :class="{ 'active': role === 'receiver' }"
            @click="role = 'receiver'"
          >
            <n-icon size="32" class="mb-3"><IconDownload /></n-icon>
            <div class="font-bold mb-1">接收端</div>
            <div class="text-xs" style="color: var(--text-color-3)">等待並下載檔案</div>
          </div>

        </div>
      </div>

      <c-button type="primary" size="large" class="w-full text-lg h-14 font-bold tracking-widest" @click="startConnection">
        <template #icon><n-icon><IconPlay /></n-icon></template>
        建立房間
      </c-button>
    </c-card>

    <!-- Active Room Step -->
    <c-card v-else class="active-room-card w-full max-w-4xl !p-6 md:!p-10">
      <div class="flex justify-between items-center mb-6 border-b pb-4" style="border-color: var(--divider-color)">
        <div class="flex items-center gap-2">
          <div class="w-3 h-3 rounded-full" :class="{
            'bg-gray-400': state === 'disconnected',
            'bg-yellow-500': state === 'connecting',
            'bg-green-500': state === 'connected',
            'bg-red-500': state === 'error'
          }"></div>
          <div class="font-bold text-sm" :style="{ color: state === 'connected' ? 'var(--success-color)' : 'var(--text-color-1)' }">
            {{ state === 'connected' ? '已連線 (端對端加密)' : `狀態: ${state.toUpperCase()}` }}
          </div>
        </div>
        <div class="cursor-pointer text-xs transition flex items-center gap-1 hover:opacity-80" style="color: var(--text-color-3)" @click="resetConnection">
          <n-icon><IconClose /></n-icon> 中斷連線
        </div>
      </div>

      <div v-if="state !== 'connected'" class="flex flex-col gap-6">
        <div class="p-4 rounded-xl text-center font-mono font-bold tracking-widest border" style="background-color: var(--warning-color-faded); color: var(--warning-color); border-color: var(--warning-color-pressed)">
          Status: CONNECTING
        </div>

        <!-- PeerJS Signaling -->
        <div v-if="connectionMode === 'peerjs'" class="mt-2">
          <div v-if="role === 'receiver'" class="p-8 rounded-xl text-center border" style="background-color: var(--action-color); border-color: var(--divider-color)">
            <div class="text-sm mb-4" style="color: var(--text-color-2)">請將以下代碼分享給傳送端</div>
            <div class="text-3xl md:text-4xl font-mono font-bold select-all tracking-wider" style="color: var(--primary-color)">{{ peerId || '生成中...' }}</div>
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
          <div class="border-2 border-dashed rounded-2xl p-12 flex flex-col items-center justify-center text-center transition relative overflow-hidden group" style="border-color: var(--primary-color); background-color: var(--primary-color-faded)">
            <c-file-upload v-if="!selectedFile" @file-upload="handleFileUpload" class="absolute inset-0 w-full h-full opacity-0 z-10 cursor-pointer" />
            
            <!-- Hover effect overlay -->
            <div class="absolute inset-0 bg-[var(--primary-color)] opacity-0 group-hover:opacity-10 transition-opacity duration-300 pointer-events-none"></div>

            <n-icon size="42" class="mb-3" style="color: var(--primary-color)"><IconUploadFile /></n-icon>
            <div class="font-bold tracking-wider" style="color: var(--primary-color)">點擊或拖曳檔案至此</div>
            
            <div v-if="selectedFile" class="absolute inset-0 rounded-2xl flex flex-col items-center justify-center z-20" style="background-color: var(--card-color)">
               <div class="font-bold text-lg truncate max-w-sm" style="color: var(--text-color-1)">{{ selectedFile.name }}</div>
               <div class="text-sm mt-1 mb-4" style="color: var(--text-color-3)">{{ (selectedFile.size / 1024 / 1024).toFixed(2) }} MB</div>
               <c-button size="small" type="danger" @click="selectedFile = null; transferProgress = 0" class="!absolute top-4 right-4">移除</c-button>
            </div>
          </div>
          <c-button v-if="selectedFile" type="primary" class="w-full mt-6 h-12 text-lg font-bold tracking-wider" @click="sendFile">
            <template #icon><n-icon><IconPlay /></n-icon></template>
            傳送檔案
          </c-button>
        </div>

        <div v-if="role === 'receiver'" class="mt-4">
          <div class="border-2 border-dashed rounded-2xl p-16 flex flex-col items-center justify-center text-center" style="border-color: var(--success-color); background-color: var(--success-color-faded)">
            <n-icon size="56" class="mb-4" style="color: var(--success-color)"><IconDownload /></n-icon>
            <div class="text-2xl font-bold" style="color: var(--text-color-1)">等待接收檔案...</div>
            <div class="text-sm mt-2" style="color: var(--text-color-3)">連線已就緒，請傳送端選擇檔案並發送。</div>
          </div>
        </div>

        <div v-if="transferProgress > 0" class="mt-8">
          <c-label label="傳輸進度">
            <div class="flex justify-between text-xs font-mono mb-1" style="color: var(--text-color-2)">
              <span>Transferring...</span>
              <span>{{ transferProgress }}%</span>
            </div>
            <n-progress type="line" :percentage="transferProgress" :show-indicator="false" :height="8" />
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
  border: 2px solid var(--border-color);
  border-radius: 0.75rem;
  cursor: pointer;
  transition: all 0.2s ease-in-out;
  text-align: center;
  background-color: transparent;

  &:hover:not(.disabled) {
    border-color: var(--primary-color-hover);
    transform: translateY(-2px);
  }

  &.active {
    border-color: var(--primary-color);
    background-color: var(--action-color-hover);
    color: var(--primary-color);

    .font-bold {
      color: var(--primary-color);
    }
  }

  &.disabled {
    cursor: not-allowed;
  }
}
</style>