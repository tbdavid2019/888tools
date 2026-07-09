<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, nextTick, computed } from 'vue';
import { useRoute } from 'vue-router';
import { useClipboard } from '@vueuse/core';
import { useMessage, NIcon, NInput, NButton, NCard, NAlert, NTag, NTooltip } from 'naive-ui';
import Peer, { type DataConnection } from 'peerjs';
import {
  SendOutlined as IconSend,
  ContentCopyOutlined as IconCopy,
  LockOutlined as IconLock,
  LockOpenOutlined as IconUnlock,
  AttachFileOutlined as IconAttach,
  ChatBubbleOutlineOutlined as IconChat,
  PeopleOutlined as IconPeople,
  PublicOutlined as IconWorld,
  CheckCircleOutlined as IconCheck,
  ErrorOutlineOutlined as IconError,
  DownloadOutlined as IconDownload
} from '@vicons/material';
import { config } from '@/config';

// Types
type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error';

interface MessageItem {
  id: string;
  sender: 'me' | 'partner';
  senderName: string;
  timestamp: number;
  type: 'text' | 'file';
  text?: string;
  isEncrypted: boolean;
  decryptionFailed?: boolean;
  file?: {
    name: string;
    size: number;
    type: string;
    data: string; // Base64 data url
  };
}

// State
const myUsername = ref('User_' + Math.floor(1000 + Math.random() * 9000));
const peerId = ref('');
const targetPeerId = ref('');
const password = ref('');
const connectionState = ref<ConnectionState>('disconnected');
const messages = ref<MessageItem[]>([]);
const messageInput = ref('');
const fileInput = ref<HTMLInputElement | null>(null);

const peer = ref<Peer | null>(null);
const connection = ref<DataConnection | null>(null);
const derivedKey = ref<CryptoKey | null>(null);
const chatContainer = ref<HTMLElement | null>(null);

const route = useRoute();
const toast = useMessage();

// Clipboard helpers
const shareUrl = computed(() => {
  if (!peerId.value) return '';
  return `${window.location.origin}${route.path}?connect=${peerId.value}`;
});
const { copy: copyId, copied: copiedId } = useClipboard({ source: peerId });
const { copy: copyShareUrl, copied: copiedShareUrl } = useClipboard({ source: shareUrl });

// Derive Cryptographic Key from Password
async function deriveKey(pwd: string): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const data = encoder.encode(pwd);
  const hash = await window.crypto.subtle.digest('SHA-256', data);
  return window.crypto.subtle.importKey(
    'raw',
    hash,
    { name: 'AES-GCM' },
    false,
    ['encrypt', 'decrypt']
  );
}

watch(password, async (newVal) => {
  if (newVal) {
    try {
      derivedKey.value = await deriveKey(newVal);
      // Attempt to re-decrypt failed messages with the new password
      await reDecryptMessages();
    } catch (e) {
      console.error('Failed to derive key:', e);
    }
  } else {
    derivedKey.value = null;
  }
});

// Binary converters
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = window.atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

// Audio Alert on New Message
function playAlertSound() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc.frequency.setValueAtTime(880, ctx.currentTime + 0.08); // A5
    
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
    
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.2);
  } catch (e) {
    // Context might be blocked
  }
}

// PeerJS Initialization
function initPeer() {
  connectionState.value = 'connecting';
  peer.value = new Peer();

  peer.value.on('open', (id) => {
    peerId.value = id;
    connectionState.value = 'disconnected'; // Ready to accept/initiate connections
  });

  peer.value.on('connection', (conn) => {
    // Accept incoming connection
    if (connection.value) {
      connection.value.close();
    }
    setupConnection(conn);
  });

  peer.value.on('error', (err) => {
    console.error('Peer error:', err);
    connectionState.value = 'error';
    toast.error('連線伺服器出錯：' + err.message);
  });
}

function connectToPeer() {
  if (!targetPeerId.value) {
    toast.warning('請輸入對象的 Peer ID');
    return;
  }
  if (!peer.value) return;

  connectionState.value = 'connecting';
  const conn = peer.value.connect(targetPeerId.value);
  setupConnection(conn);
}

function setupConnection(conn: DataConnection) {
  connection.value = conn;
  
  conn.on('open', () => {
    connectionState.value = 'connected';
    targetPeerId.value = conn.peer;
    toast.success('P2P 連線建立成功！');
  });

  conn.on('data', async (data: any) => {
    if (data && typeof data === 'object') {
      const msgId = 'partner_' + Math.random().toString(36).substr(2, 9);
      let isEncrypted = !!data.encrypted;
      let text = data.text || '';
      let fileData = data.file;
      let decryptionFailed = false;

      // Handle decryption if encrypted
      if (isEncrypted && data.encrypted) {
        if (!derivedKey.value) {
          text = '[🔐 訊息已加密，請在上方設定房間密碼以解密]';
          decryptionFailed = true;
        } else {
          try {
            const ctBuffer = base64ToArrayBuffer(data.encrypted.ciphertext);
            const ivBuffer = base64ToArrayBuffer(data.encrypted.iv);
            text = await decryptMessage(ctBuffer, ivBuffer, derivedKey.value);
            
            // If encrypted file
            if (fileData && fileData.isEncryptedData) {
              const fileCt = base64ToArrayBuffer(fileData.data);
              const fileIv = base64ToArrayBuffer(fileData.iv);
              const decFileBase64 = await decryptMessage(fileCt, fileIv, derivedKey.value);
              fileData = {
                name: fileData.name,
                size: fileData.size,
                type: fileData.type,
                data: decFileBase64
              };
            }
          } catch (e) {
            text = '[⚠️ 解密失敗：金鑰不匹配或密碼錯誤]';
            decryptionFailed = true;
            fileData = undefined;
          }
        }
      }

      messages.value.push({
        id: msgId,
        sender: 'partner',
        senderName: data.senderName || 'Partner',
        timestamp: data.timestamp || Date.now(),
        type: data.type || 'text',
        text,
        isEncrypted,
        decryptionFailed,
        file: fileData,
        // Store raw encrypted payload in case password is set later
        rawEncrypted: data.encrypted,
        rawEncryptedFile: data.file?.isEncryptedData ? data.file : null
      } as any);
      
      playAlertSound();
      scrollToBottom();
    }
  });

  conn.on('close', () => {
    connectionState.value = 'disconnected';
    connection.value = null;
    toast.info('連線已中斷。');
  });

  conn.on('error', (err) => {
    console.error('Connection error:', err);
    connectionState.value = 'error';
    toast.error('連線過程中出錯：' + err.message);
  });
}

// Decrypt and Encrypt Helpers
async function encryptText(text: string, key: CryptoKey): Promise<{ ciphertext: ArrayBuffer, iv: Uint8Array }> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    data
  );
  return { ciphertext, iv };
}

async function decryptMessage(ciphertext: ArrayBuffer, iv: Uint8Array, key: CryptoKey): Promise<string> {
  const decrypted = await window.crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    ciphertext
  );
  const decoder = new TextDecoder();
  return decoder.decode(decrypted);
}

// Re-decrypt messages when password is updated
async function reDecryptMessages() {
  if (!derivedKey.value) return;

  for (const msg of messages.value) {
    if (msg.isEncrypted && (msg.decryptionFailed || !msg.text || msg.text.startsWith('['))) {
      const rawEnc = (msg as any).rawEncrypted;
      if (rawEnc) {
        try {
          const ctBuffer = base64ToArrayBuffer(rawEnc.ciphertext);
          const ivBuffer = base64ToArrayBuffer(rawEnc.iv);
          msg.text = await decryptMessage(ctBuffer, ivBuffer, derivedKey.value);
          msg.decryptionFailed = false;

          // Re-decrypt file if present
          const rawFile = (msg as any).rawEncryptedFile;
          if (rawFile) {
            const fileCt = base64ToArrayBuffer(rawFile.data);
            const fileIv = base64ToArrayBuffer(rawFile.iv);
            const decFile = await decryptMessage(fileCt, fileIv, derivedKey.value);
            msg.file = {
              name: rawFile.name,
              size: rawFile.size,
              type: rawFile.type,
              data: decFile
            };
          }
        } catch (e) {
          msg.text = '[⚠️ 解密失敗：金鑰不匹配或密碼錯誤]';
          msg.decryptionFailed = true;
          msg.file = undefined;
        }
      }
    }
  }
}

// Send Message
async function sendMessage() {
  if (!messageInput.value.trim()) return;
  if (!connection.value || connectionState.value !== 'connected') {
    toast.warning('未建立 P2P 連線');
    return;
  }

  const textToSend = messageInput.value;
  const timestamp = Date.now();
  const msgId = 'me_' + Math.random().toString(36).substr(2, 9);
  
  let payload: any = {
    type: 'text',
    senderName: myUsername.value,
    timestamp,
  };

  if (derivedKey.value) {
    try {
      const { ciphertext, iv } = await encryptText(textToSend, derivedKey.value);
      payload.encrypted = {
        ciphertext: arrayBufferToBase64(ciphertext),
        iv: arrayBufferToBase64(iv)
      };
    } catch (e) {
      toast.error('加密失敗');
      return;
    }
  } else {
    payload.text = textToSend;
  }

  // Send over data channel
  connection.value.send(payload);

  // Add locally
  messages.value.push({
    id: msgId,
    sender: 'me',
    senderName: myUsername.value,
    timestamp,
    type: 'text',
    text: textToSend,
    isEncrypted: !!derivedKey.value,
  });

  messageInput.value = '';
  scrollToBottom();
}

// Handle File Selection
function triggerFileSelect() {
  fileInput.value?.click();
}

async function onFileSelected(e: Event) {
  const target = e.target as HTMLInputElement;
  if (!target.files || target.files.length === 0) return;

  const file = target.files[0];
  if (file.size > 2 * 1024 * 1024) {
    toast.error('檔案太大！P2P 聊天目前僅支援傳送 2MB 以下的圖片或檔案，大檔案傳輸請使用 P2P 傳檔工具。');
    return;
  }

  const reader = new FileReader();
  reader.onload = async (event) => {
    if (!event.target?.result || !connection.value) return;
    
    const base64Data = event.target.result as string;
    const timestamp = Date.now();
    const msgId = 'me_' + Math.random().toString(36).substr(2, 9);

    let payload: any = {
      type: 'file',
      senderName: myUsername.value,
      timestamp,
      file: {
        name: file.name,
        size: file.size,
        type: file.type,
      }
    };

    if (derivedKey.value) {
      try {
        // Encrypt the text content (base64 string) of the file
        const { ciphertext: textCt, iv: textIv } = await encryptText(`[傳送了檔案: ${file.name}]`, derivedKey.value);
        payload.encrypted = {
          ciphertext: arrayBufferToBase64(textCt),
          iv: arrayBufferToBase64(textIv)
        };

        // Encrypt the file payload itself
        const { ciphertext: fileCt, iv: fileIv } = await encryptText(base64Data, derivedKey.value);
        payload.file.isEncryptedData = true;
        payload.file.data = arrayBufferToBase64(fileCt);
        payload.file.iv = arrayBufferToBase64(fileIv);
      } catch (e) {
        toast.error('加密檔案失敗');
        return;
      }
    } else {
      payload.text = `[傳送了檔案: ${file.name}]`;
      payload.file.data = base64Data;
    }

    // Send payload
    connection.value.send(payload);

    // Save locally
    messages.value.push({
      id: msgId,
      sender: 'me',
      senderName: myUsername.value,
      timestamp,
      type: 'file',
      text: `[傳送了檔案: ${file.name}]`,
      isEncrypted: !!derivedKey.value,
      file: {
        name: file.name,
        size: file.size,
        type: file.type,
        data: base64Data
      }
    });

    scrollToBottom();
  };

  reader.readAsDataURL(file);
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

function formatTime(timestamp: number) {
  return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function scrollToBottom() {
  nextTick(() => {
    if (chatContainer.value) {
      chatContainer.value.scrollTop = chatContainer.value.scrollHeight;
    }
  });
}

function disconnect() {
  if (connection.value) {
    connection.value.close();
  }
}

// Lifecycle
onMounted(() => {
  initPeer();
  // Auto-connect if ID is in URL
  if (route.query.connect) {
    targetPeerId.value = String(route.query.connect);
    toast.info('已自動填入連接對象 ID');
  }
});

onUnmounted(() => {
  disconnect();
  if (peer.value) {
    peer.value.destroy();
  }
});
</script>

<template>
  <div class="p2p-chat-wrapper w-full">
    <!-- Main Bento Grid Container -->
    <div class="grid grid-cols-1 gap-4 lg:grid-cols-4">
      
      <!-- Connection Settings Sidebar (Left) -->
      <div class="lg:col-span-1 flex flex-col gap-4">
        
        <!-- Peer Info Card -->
        <n-card :bordered="false" size="small" class="bento-card">
          <template #header>
            <div class="flex items-center gap-2">
              <n-icon size="20" :component="IconPeople" class="text-emerald-500" />
              <span class="font-bold">連線控制</span>
            </div>
          </template>

          <div class="flex flex-col gap-3">
            <div>
              <span class="text-xs opacity-75">您的暱稱</span>
              <n-input v-model:value="myUsername" size="small" placeholder="輸入暱稱" />
            </div>

            <div>
              <span class="text-xs opacity-75">您的 Peer ID</span>
              <div class="flex gap-2 items-center mt-1">
                <n-input :value="peerId" size="small" readonly placeholder="取得中..." />
                <n-tooltip trigger="hover">
                  <template #trigger>
                    <n-button size="small" circle @click="copyId()">
                      <n-icon :component="copiedId ? IconCheck : IconCopy" />
                    </n-button>
                  </template>
                  {{ copiedId ? '已複製' : '複製 ID' }}
                </n-tooltip>
              </div>
            </div>

            <div>
              <n-tooltip trigger="hover">
                <template #trigger>
                  <n-button block size="small" type="primary" secondary @click="copyShareUrl" :disabled="!peerId">
                    <n-icon :component="IconWorld" class="mr-1" />
                    複製邀請連結
                  </n-button>
                </template>
                {{ copiedShareUrl ? '連結已複製！' : '複製帶有連線 ID 的聊天網址，傳送給好友可以直接點擊建立連線。' }}
              </n-tooltip>
            </div>
          </div>
        </n-card>

        <!-- Connect to Partner Card -->
        <n-card :bordered="false" size="small" class="bento-card">
          <template #header>
            <div class="flex items-center gap-2">
              <n-icon size="20" :component="IconWorld" class="text-blue-500" />
              <span class="font-bold">建立連線</span>
            </div>
          </template>

          <div class="flex flex-col gap-3">
            <div>
              <span class="text-xs opacity-75">連接對象 Peer ID</span>
              <n-input v-model:value="targetPeerId" size="small" placeholder="貼上好友的 Peer ID" :disabled="connectionState === 'connected'" />
            </div>

            <div class="flex gap-2">
              <n-button 
                v-if="connectionState !== 'connected'"
                block 
                size="medium" 
                type="primary" 
                :loading="connectionState === 'connecting'"
                @click="connectToPeer"
              >
                開始連接
              </n-button>
              <n-button 
                v-else
                block 
                size="medium" 
                type="error" 
                ghost
                @click="disconnect"
              >
                中斷連線
              </n-button>
            </div>
          </div>
        </n-card>

        <!-- End-to-End Encryption Settings -->
        <n-card :bordered="false" size="small" class="bento-card">
          <template #header>
            <div class="flex items-center gap-2">
              <n-icon size="20" :component="derivedKey ? IconLock : IconUnlock" :class="derivedKey ? 'text-amber-500' : 'text-gray-400'" />
              <span class="font-bold">E2EE 端到端加密</span>
            </div>
          </template>

          <div class="flex flex-col gap-2">
            <span class="text-xs opacity-75">房間密碼 (金鑰)</span>
            <n-input 
              v-model:value="password" 
              type="password" 
              show-password-on="click" 
              size="small" 
              placeholder="雙方設定一致的密碼" 
            />
            <div class="text-[11px] opacity-70 mt-1 leading-relaxed">
              🔑 設定密碼後，訊息會在發送前於**本地瀏覽器加密**，接收方使用相同密碼解密。伺服器或中轉環節完全無法讀取明文（零知識）。
            </div>
          </div>
        </n-card>
      </div>

      <!-- Chat Interface Card (Right) -->
      <div class="lg:col-span-3">
        <n-card :bordered="false" class="bento-card flex flex-col h-[600px] content-card">
          
          <!-- Chat Header -->
          <div class="flex items-center justify-between border-b border-gray-200/10 pb-3 mb-3">
            <div class="flex items-center gap-2">
              <div 
                class="w-3 h-3 rounded-full" 
                :class="{
                  'bg-emerald-500': connectionState === 'connected',
                  'bg-amber-500': connectionState === 'connecting',
                  'bg-gray-400': connectionState === 'disconnected',
                  'bg-rose-500': connectionState === 'error'
                }" 
              />
              <span class="font-bold">
                <template v-if="connectionState === 'connected'">與對象連線中 ({{ targetPeerId.slice(0, 8) }}...)</template>
                <template v-else-if="connectionState === 'connecting'">建立連線中...</template>
                <template v-else-if="connectionState === 'error'">連線發生錯誤</template>
                <template v-else>未連線</template>
              </span>
            </div>

            <n-tag v-if="derivedKey" type="warning" size="small" round>
              <n-icon :component="IconLock" class="mr-1" />
              E2EE 已啟用
            </n-tag>
            <n-tag v-else type="default" size="small" round>
              <n-icon :component="IconUnlock" class="mr-1" />
              未啟用密碼加密
            </n-tag>
          </div>

          <!-- Chat Messages Container -->
          <div 
            ref="chatContainer"
            class="flex-1 overflow-y-auto px-2 py-4 flex flex-col gap-3 min-h-[380px] max-h-[380px] bg-slate-950/20 rounded-xl"
          >
            <div v-if="messages.length === 0" class="h-full flex flex-col items-center justify-center text-center opacity-50 py-10">
              <n-icon size="40" :component="IconChat" class="mb-2" />
              <p class="text-sm">尚未開始對話</p>
              <p class="text-xs mt-1">連線成功後，雙方發送的訊息會即時顯示在此處。</p>
            </div>

            <div 
              v-for="msg in messages" 
              :key="msg.id" 
              class="flex flex-col max-w-[80%]"
              :class="msg.sender === 'me' ? 'self-end items-end' : 'self-start items-start'"
            >
              <!-- Sender Name -->
              <span class="text-[11px] opacity-75 mb-1 px-1">
                {{ msg.senderName }} ({{ formatTime(msg.timestamp) }})
              </span>

              <!-- Bubble Wrapper -->
              <div 
                class="rounded-2xl px-4 py-2.5 text-[14.5px] leading-relaxed shadow-sm relative group"
                :class="[
                  msg.sender === 'me' 
                    ? 'bg-emerald-600/80 text-white rounded-tr-none' 
                    : 'bg-slate-800 text-gray-100 rounded-tl-none',
                  msg.decryptionFailed ? 'border border-amber-500/40 bg-amber-950/20 text-amber-200' : ''
                ]"
              >
                <!-- File Attachment Bubble -->
                <div v-if="msg.type === 'file' && msg.file" class="flex flex-col gap-2">
                  <!-- Image Inline Preview -->
                  <div v-if="msg.file.type.startsWith('image/')" class="max-w-[250px] overflow-hidden rounded-lg">
                    <img :src="msg.file.data" class="w-full h-auto object-cover max-h-[200px]" alt="Shared image" />
                  </div>
                  <!-- Other File Attachment Card -->
                  <div class="flex items-center gap-3 bg-black/20 p-2 rounded-lg text-xs">
                    <n-icon size="24" :component="IconAttach" />
                    <div class="flex-1 min-w-0">
                      <div class="truncate font-medium">{{ msg.file.name }}</div>
                      <div class="opacity-75">{{ formatBytes(msg.file.size) }}</div>
                    </div>
                    <a :href="msg.file.data" :download="msg.file.name" class="text-white hover:text-emerald-300">
                      <n-icon size="20" :component="IconDownload" />
                    </a>
                  </div>
                </div>

                <!-- Text content -->
                <div v-else class="whitespace-pre-wrap select-text break-words">
                  {{ msg.text }}
                </div>

                <!-- Encrypted lock badge -->
                <div v-if="msg.isEncrypted" class="absolute -bottom-2 -right-1.5 bg-amber-500 text-black text-[9px] font-bold px-1 rounded flex items-center gap-0.5 scale-90 shadow-sm">
                  <n-icon size="10" :component="IconLock" />
                  E2EE
                </div>
              </div>
            </div>
          </div>

          <!-- Chat Input Bar -->
          <div class="mt-4 flex gap-2 items-center">
            <!-- Hidden File Input -->
            <input 
              ref="fileInput"
              type="file" 
              class="hidden" 
              accept="image/*,.pdf,.zip,.txt,.json,.xml"
              @change="onFileSelected"
            />
            
            <n-button 
              circle 
              secondary 
              size="medium"
              :disabled="connectionState !== 'connected'"
              @click="triggerFileSelect"
            >
              <n-icon size="20" :component="IconAttach" />
            </n-button>

            <n-input 
              v-model:value="messageInput" 
              type="text" 
              size="medium"
              placeholder="輸入訊息..." 
              :disabled="connectionState !== 'connected'"
              @keyup.enter="sendMessage"
            />

            <n-button 
              type="primary" 
              size="medium"
              :disabled="connectionState !== 'connected' || !messageInput.trim()"
              @click="sendMessage"
            >
              <template #icon>
                <n-icon :component="IconSend" />
              </template>
            </n-button>
          </div>

          <!-- Alert for connection state -->
          <div class="mt-3">
            <n-alert 
              v-if="connectionState === 'disconnected' && peerId" 
              type="info" 
              :show-icon="true"
              class="text-xs"
            >
              連線伺服器就緒。將您的 Peer ID 傳送給對方，或在左側貼上對方的 Peer ID 點擊「開始連接」即可建立 E2EE 直連通道。
            </n-alert>
          </div>

        </n-card>
      </div>

    </div>
  </div>
</template>

<style scoped lang="less">
.p2p-chat-wrapper {
  margin: 0 auto;
}

.bento-card {
  border-radius: 20px;
  background-color: rgba(24, 24, 37, 0.45);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.content-card {
  display: flex;
  flex-direction: column;
}

::v-deep(.n-card__content) {
  display: flex;
  flex-direction: column;
  height: 100%;
}
</style>
