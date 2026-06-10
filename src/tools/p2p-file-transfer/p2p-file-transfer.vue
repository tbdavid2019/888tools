<script setup lang="ts">
import { ref, watch, onUnmounted } from 'vue';
import { NProgress } from 'naive-ui';
import { P2PService, type Role } from './p2p-file-transfer.service';

const connectionMode = ref<'peerjs' | 'manual'>('peerjs');
const role = ref<Role>('sender');

const connectionModeOptions = [
  { label: 'PeerJS (Simple)', value: 'peerjs' },
  { label: 'Manual Signaling', value: 'manual' },
];

const roleOptions = [
  { label: 'Sender', value: 'sender' },
  { label: 'Receiver', value: 'receiver' },
];

const selectedFile = ref<File | null>(null);
const transferProgress = ref(0); // 0 to 100

const p2pService = new P2PService(ref);
const { state, peerId, remotePeerId } = p2pService;

const targetPeerId = ref('');
const manualOffer = ref('');
const manualAnswer = ref('');

const CHUNK_SIZE = 64 * 1024; // 64KB
const MAX_BUFFER = 16 * 1024 * 1024; // 16MB

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
  transferProgress.value = 100; // Force 100% just in case
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

  // Backpressure check
  if (p2pService.bufferedAmount > MAX_BUFFER) {
    setTimeout(() => readNextChunk(file), 50);
    return;
  }

  const chunk = file.slice(currentFileOffset, currentFileOffset + CHUNK_SIZE);
  fileReader?.readAsArrayBuffer(chunk);
}

watch([connectionMode, role], ([newMode, newRole]) => {
  p2pService.destroy();
  if (newMode === 'peerjs') {
    p2pService.initPeerJS(newRole);
  } else {
    p2pService.initManual(newRole);
  }
}, { immediate: true });

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
  <div>
    <c-card title="P2P File Transfer">
      <div class="flex flex-col gap-6">
        
        <!-- Connection Mode Selection -->
        <c-buttons-select
          v-model:value="connectionMode"
          label="Connection Mode"
          :options="connectionModeOptions"
        />

        <!-- Role Selection -->
        <c-buttons-select
          v-model:value="role"
          label="Your Role"
          :options="roleOptions"
        />

        <!-- Connection Status -->
        <div class="p-3 rounded font-semibold text-center" :class="{
          'bg-gray-100 text-gray-700': state === 'disconnected',
          'bg-yellow-100 text-yellow-700': state === 'connecting',
          'bg-green-100 text-green-700': state === 'connected',
          'bg-red-100 text-red-700': state === 'error'
        }">
          Status: {{ state.toUpperCase() }}
        </div>

        <div v-if="state !== 'connected'" class="border border-gray-200 rounded p-4 flex flex-col gap-4">
          <!-- PeerJS Signaling -->
          <div v-if="connectionMode === 'peerjs'">
            <div v-if="role === 'receiver'" class="flex flex-col gap-2">
              <c-label label="Your Peer ID (Share this with the Sender)"></c-label>
              <c-input-text :value="peerId" readonly />
              <div class="text-sm text-gray-500">Waiting for sender to connect...</div>
            </div>
            <div v-if="role === 'sender'" class="flex flex-col gap-2">
              <c-label label="Target Peer ID (Receiver's ID)"></c-label>
              <div class="flex gap-2">
                <c-input-text v-model:value="targetPeerId" placeholder="Enter ID here" class="flex-1" />
                <c-button type="primary" @click="connectPeerJS">Connect</c-button>
              </div>
            </div>
          </div>

          <!-- Manual Signaling -->
          <div v-if="connectionMode === 'manual'">
            <div v-if="role === 'sender'" class="flex flex-col gap-4">
              <c-button type="primary" @click="generateManualOffer">1. Generate Offer</c-button>
              <c-label label="Your Offer (Send this to Receiver)"></c-label>
              <c-input-text v-model:value="manualOffer" multiline rows="3" readonly />
              <c-label label="Receiver's Answer (Paste here)"></c-label>
              <c-input-text v-model:value="manualAnswer" multiline rows="3" />
              <c-button type="primary" @click="acceptManualAnswer">2. Connect using Answer</c-button>
            </div>

            <div v-if="role === 'receiver'" class="flex flex-col gap-4">
              <c-label label="Sender's Offer (Paste here)"></c-label>
              <c-input-text v-model:value="manualOffer" multiline rows="3" />
              <c-button type="primary" @click="acceptManualOffer">1. Accept Offer & Generate Answer</c-button>
              <c-label label="Your Answer (Send this to Sender)"></c-label>
              <c-input-text v-model:value="manualAnswer" multiline rows="3" readonly />
            </div>
          </div>
        </div>

        <template v-if="state === 'connected'">
          <!-- Sender: File Selection -->
          <div v-if="role === 'sender'" class="sender-section">
            <c-label label="Select File to Send">
              <c-file-upload
                v-if="!selectedFile"
                @file-upload="handleFileUpload"
              />
              <div v-else class="flex items-center gap-4">
                <span class="font-bold">{{ selectedFile.name }}</span>
                <span class="text-gray-500">({{ (selectedFile.size / 1024 / 1024).toFixed(2) }} MB)</span>
                <c-button type="danger" size="small" @click="selectedFile = null">Remove</c-button>
                <c-button type="primary" @click="sendFile">Send File</c-button>
              </div>
            </c-label>
          </div>

          <!-- Receiver: Waiting Section -->
          <div v-if="role === 'receiver'" class="receiver-section">
            <c-label label="Receive File">
              <div class="text-center p-4 border border-dashed border-gray-300 rounded">
                Connected! Waiting for file from sender...
              </div>
            </c-label>
          </div>

          <!-- Progress Bar -->
          <div v-if="transferProgress > 0" class="progress-section mt-4">
            <c-label label="Transfer Progress">
              <n-progress type="line" :percentage="transferProgress" />
            </c-label>
          </div>
        </template>

      </div>
    </c-card>
  </div>
</template>

<style lang="less" scoped>
</style>
