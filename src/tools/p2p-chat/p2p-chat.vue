<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, nextTick, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
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
  DownloadOutlined as IconDownload,
  CasinoOutlined as IconDice,
  ArrowBackOutlined as IconBack,
  SecurityOutlined as IconShield
} from '@vicons/material';
import { config } from '@/config';
import { useStyleStore } from '@/stores/style.store';
import { kanagawaDarkPalette, kanagawaLightPalette } from '@/theme/palette';

// Types
type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error';
type UIState = 'setup' | 'waiting' | 'chat';

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
const uiState = ref<UIState>('setup');
const role = ref<'host' | 'guest'>('host');
const myUsername = ref('');
const peerId = ref('');
const targetPeerId = ref('');
const password = ref('');
const connectionState = ref<ConnectionState>('disconnected');
const messages = ref<MessageItem[]>([]);
const messageInput = ref('');
const fileInput = ref<HTMLInputElement | null>(null);

const peer = ref<Peer | null>(null);
const connections = ref<DataConnection[]>([]);
const partnerNames = ref<Record<string, string>>({}); // peerId -> nickname
const derivedKey = ref<CryptoKey | null>(null);
const chatContainer = ref<HTMLElement | null>(null);

const route = useRoute();
const router = useRouter();
const toast = useMessage();
const styleStore = useStyleStore();

// Random Crop & Fruit Nickname Generator based on language
function getRandomNickname() {
  const isZh = route.name?.toString().includes('zh') || navigator.language.startsWith('zh');
  
  if (isZh) {
    const adjs = ['快樂的', '幸運的', '聰明的', '勇敢的', '俏皮的', '活潑的', '溫慢的', '元氣的', '淘氣的', '呆萌的', '帥氣的', '開朗的', '元氣滿滿的', '冒險的'];
    const nouns = ['西瓜', '糙米', '紅豆', '燕麥', '芒果', '馬鈴薯', '芝麻', '綠豆', '草莓', '小麥', '花生', '玉米', '地瓜', '藍莓', '櫻桃', '水蜜桃', '小米', '薏仁', '荔枝', '鳳梨', '香蕉', '蘋果'];
    const adj = adjs[Math.floor(Math.random() * adjs.length)];
    const noun = nouns[Math.floor(Math.random() * nouns.length)];
    return adj + noun;
  } else {
    const adjs = ['Happy', 'Lucky', 'Clever', 'Brave', 'Playful', 'Active', 'Warm', 'Energetic', 'Naughty', 'Cute', 'Cool', 'Cheerful', 'Jolly'];
    const nouns = ['Watermelon', 'Rice', 'RedBean', 'Oat', 'Mango', 'Potato', 'Sesame', 'MungBean', 'Strawberry', 'Wheat', 'Peanut', 'Corn', 'SweetPotato', 'Blueberry', 'Cherry', 'Peach', 'Millet', 'Barley', 'Lychee', 'Pineapple', 'Banana', 'Apple'];
    const adj = adjs[Math.floor(Math.random() * adjs.length)];
    const noun = nouns[Math.floor(Math.random() * nouns.length)];
    return adj + ' ' + noun;
  }
}

function randomizeName() {
  myUsername.value = getRandomNickname();
}

// Theme styling computed properties
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

const chatHistoryStyle = computed(() => {
  const isDark = styleStore.isDarkTheme;
  return {
    backgroundColor: isDark ? 'rgba(0, 0, 0, 0.2)' : 'rgba(255, 255, 255, 0.45)',
    border: `1px solid ${activePalette.value.border}20`,
  };
});

const meBubbleStyle = computed(() => ({
  backgroundColor: activePalette.value.button,
  color: '#ffffff',
  borderRadius: '16px 16px 0px 16px',
}));

const partnerBubbleStyle = computed(() => {
  const isDark = styleStore.isDarkTheme;
  return {
    backgroundColor: isDark ? '#2A2A37' : '#FFFFFF',
    color: activePalette.value.text,
    border: `1px solid ${activePalette.value.border}25`,
    borderRadius: '16px 16px 16px 0px',
  };
});

const partnerBubbleFailedStyle = computed(() => {
  const isDark = styleStore.isDarkTheme;
  return {
    backgroundColor: isDark ? 'rgba(245, 158, 11, 0.15)' : 'rgba(245, 158, 11, 0.08)',
    color: isDark ? '#F59E0B' : '#B45309',
    border: `1px solid rgba(245, 158, 11, 0.35)`,
    borderRadius: '16px 16px 16px 0px',
  };
});

// List of connected partners
const partnersListString = computed(() => {
  const names = Object.values(partnerNames.value);
  if (names.length === 0) return '無';
  return names.join(', ');
});

// Clipboard helpers (Invite URL always points to the Host to support mesh entry)
const shareUrl = computed(() => {
  const hostId = role.value === 'host' ? peerId.value : targetPeerId.value;
  if (!hostId) return '';
  return `${window.location.origin}${route.path}?connect=${hostId}`;
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
    // Audio Context might be blocked
  }
}

// Host initiates and waits
function startHost() {
  role.value = 'host';
  uiState.value = 'waiting';
  initPeer();
}

// Guest connects
function startGuest() {
  role.value = 'guest';
  connectionState.value = 'connecting';
  initPeer();
}

// PeerJS Initialization
function initPeer() {
  peer.value = new Peer();

  peer.value.on('open', (id) => {
    peerId.value = id;
    
    if (role.value === 'guest') {
      // Connect to host immediately
      const conn = peer.value!.connect(targetPeerId.value);
      setupConnection(conn);
    }
  });

  peer.value.on('connection', (conn) => {
    setupConnection(conn);
  });

  peer.value.on('error', (err) => {
    console.error('Peer error:', err);
    toast.error('連線伺服器失敗：' + err.message);
    resetAll();
  });
}

function addConnection(conn: DataConnection) {
  if (!connections.value.some(c => c.peer === conn.peer)) {
    connections.value.push(conn);
  }
}

function removeConnection(pId: string) {
  connections.value = connections.value.filter(c => c.peer !== pId);
  delete partnerNames.value[pId];
  if (connections.value.length === 0) {
    connectionState.value = 'disconnected';
  }
}

function setupConnection(conn: DataConnection) {
  conn.on('open', () => {
    connectionState.value = 'connected';
    addConnection(conn);
    
    // Exchange handshakes
    conn.send({ type: 'handshake', nickname: myUsername.value });
  });

  conn.on('data', async (data: any) => {
    if (data && typeof data === 'object') {
      // 1. Handle Handshake
      if (data.type === 'handshake') {
        partnerNames.value[conn.peer] = data.nickname;
        addConnection(conn);
        
        if (role.value === 'host') {
          // Announce this new peer to all OTHER already connected guests to form mesh
          connections.value.forEach(otherConn => {
            if (otherConn.peer !== conn.peer) {
              otherConn.send({ type: 'announce-peer', peerId: conn.peer });
            }
          });
        }
        
        uiState.value = 'chat';
        toast.success(`成員「${data.nickname}」已加入對話！`);
        return;
      }

      // 2. Handle Peer Announcement (Mesh Connection)
      if (data.type === 'announce-peer') {
        const newPeerId = data.peerId;
        if (peer.value && !connections.value.some(c => c.peer === newPeerId)) {
          toast.info('正在連線至聊天室新成員...');
          const newConn = peer.value.connect(newPeerId);
          setupConnection(newConn);
        }
        return;
      }

      // 3. Handle normal message
      const msgId = 'partner_' + Math.random().toString(36).substr(2, 9);
      let isEncrypted = !!data.encrypted;
      let text = data.text || '';
      let fileData = data.file;
      let decryptionFailed = false;

      if (isEncrypted && data.encrypted) {
        if (!derivedKey.value) {
          text = '[🔐 訊息已加密，請在左側設定房間密碼以解密]';
          decryptionFailed = true;
        } else {
          try {
            const ctBuffer = base64ToArrayBuffer(data.encrypted.ciphertext);
            const ivBuffer = base64ToArrayBuffer(data.encrypted.iv);
            text = await decryptMessage(ctBuffer, ivBuffer, derivedKey.value);
            
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
        rawEncrypted: data.encrypted,
        rawEncryptedFile: data.file?.isEncryptedData ? data.file : null
      } as any);
      
      playAlertSound();
      scrollToBottom();
    }
  });

  conn.on('close', () => {
    const name = partnerNames.value[conn.peer] || '成員';
    toast.info(`「${name}」已離開對話。`);
    removeConnection(conn.peer);
  });

  conn.on('error', (err) => {
    console.error('Connection error:', err);
    removeConnection(conn.peer);
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

// Send Message (Broadcast to all connected mesh peers)
async function sendMessage() {
  if (!messageInput.value.trim()) return;
  if (connections.value.length === 0) {
    toast.warning('未建立連線');
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

  // Broadcast to all active mesh peers
  connections.value.forEach(conn => {
    conn.send(payload);
  });

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
    toast.error('檔案太大！P2P 聊天目前僅支援傳送 2MB 以下的圖片或檔案。');
    return;
  }

  const reader = new FileReader();
  reader.onload = async (event) => {
    if (!event.target?.result || connections.value.length === 0) return;
    
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
        const { ciphertext: textCt, iv: textIv } = await encryptText(`[傳送了檔案: ${file.name}]`, derivedKey.value);
        payload.encrypted = {
          ciphertext: arrayBufferToBase64(textCt),
          iv: arrayBufferToBase64(textIv)
        };

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

    // Broadcast to all active mesh peers
    connections.value.forEach(conn => {
      conn.send(payload);
    });

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

function disconnectAll() {
  connections.value.forEach(conn => conn.close());
  connections.value = [];
  partnerNames.value = {};
}

function resetAll() {
  disconnectAll();
  if (peer.value) {
    peer.value.destroy();
    peer.value = null;
  }
  peerId.value = '';
  connectionState.value = 'disconnected';
  uiState.value = 'setup';
  messages.value = [];
  
  if (route.query.connect) {
    router.replace({ query: {} });
  }
}

function cancelInvitation() {
  resetAll();
}

// Lifecycle
onMounted(() => {
  randomizeName();
  if (route.query.connect) {
    targetPeerId.value = String(route.query.connect);
    role.value = 'guest';
    toast.info('已偵測到好友邀請，請輸入暱稱後連線！');
  }
});

onUnmounted(() => {
  disconnectAll();
  if (peer.value) {
    peer.value.destroy();
  }
});
</script>

<template>
  <div class="p2p-chat-wrapper w-full flex justify-center">
    
    <!-- 1. SETUP / JOIN SCREEN -->
    <div v-if="uiState === 'setup'" class="w-full max-w-xl">
      <n-card :bordered="false" size="large" :style="bentoCardStyle" class="bento-card !p-2 md:!p-4">
        <div class="text-center mb-6">
          <h2 class="text-xl font-bold mb-2 flex items-center justify-center gap-2" style="color: var(--heading)">
            <n-icon size="26" :component="IconChat" class="text-emerald-500" />
            P2P 網頁即時密聊
          </h2>
          <p class="text-xs opacity-75 leading-relaxed">
            基於 WebRTC 協定的多人家直連技術。訊息與檔案完全不經由任何伺服器儲存，且支援多人同時加入。
          </p>
        </div>

        <div class="flex flex-col gap-5 mt-2">
          <!-- Username Block -->
          <div>
            <label class="block text-xs font-semibold mb-2 opacity-80">您的暱稱</label>
            <div class="flex gap-2">
              <n-input v-model:value="myUsername" placeholder="輸入暱稱或點擊右側骰子隨機產生" />
              <n-tooltip trigger="hover">
                <template #trigger>
                  <n-button secondary @click="randomizeName">
                    <template #icon><n-icon :component="IconDice" /></template>
                  </n-button>
                </template>
                骰出一個農作物暱稱 🎲
              </n-tooltip>
            </div>
          </div>

          <!-- Password (E2EE) Block -->
          <div>
            <label class="block text-xs font-semibold mb-2 opacity-80 flex items-center gap-1">
              房間密碼 (E2EE 端到端加密) <n-tag size="mini" type="warning" round>選填</n-tag>
            </label>
            <n-input 
              v-model:value="password" 
              type="password" 
              show-password-on="click" 
              placeholder="所有人設定相同密碼後，訊息會在瀏覽器自動加密" 
            />
            <p class="text-[10.5px] opacity-60 mt-1.5 leading-relaxed">
              🔐 設定後會自動透過 AES-GCM-256 加密傳輸。未設定則以明文直連通道傳送。
            </p>
          </div>

          <!-- Action Buttons -->
          <div class="mt-4 pt-4 border-t border-gray-200/10 flex flex-col gap-4">
            
            <!-- CASE A: User is Guest (Invited via URL) -->
            <div v-if="targetPeerId" class="flex flex-col gap-3">
              <n-alert type="warning" :show-icon="true" size="small" class="text-xs">
                您的好友邀請您加入聊天室！已自動鎖定連線 ID。
              </n-alert>
              
              <n-button 
                type="primary" 
                block 
                size="large" 
                :loading="connectionState === 'connecting'"
                @click="startGuest"
              >
                👥 立即連線聊天
              </n-button>

              <n-button 
                secondary 
                block 
                size="medium" 
                @click="targetPeerId = ''; router.replace({ query: {} })"
              >
                改為建立全新聊天室
              </n-button>
            </div>

            <!-- CASE B: User is Creator (No URL Inv) -->
            <div v-else class="flex flex-col gap-4">
              <n-button 
                type="primary" 
                block 
                size="large"
                @click="startHost"
              >
                ✨ 建立聊天室並等待好友
              </n-button>

              <div class="flex items-center my-1 text-xs opacity-50 justify-center gap-2">
                <span class="w-8 h-[1px] bg-current opacity-30"></span>
                <span>或手動加入現有房間</span>
                <span class="w-8 h-[1px] bg-current opacity-30"></span>
              </div>

              <div class="flex gap-2">
                <n-input v-model:value="targetPeerId" placeholder="貼上好友的 Peer ID" />
                <n-button 
                  type="primary" 
                  secondary
                  :disabled="!targetPeerId"
                  @click="startGuest"
                >
                  連線
                </n-button>
              </div>
            </div>

          </div>
        </div>
      </n-card>
    </div>

    <!-- 2. WAITING FOR PARTNER SCREEN -->
    <div v-if="uiState === 'waiting'" class="w-full max-w-md">
      <n-card :bordered="false" size="large" :style="bentoCardStyle" class="bento-card text-center">
        <!-- Pulsing radar animation -->
        <div class="flex justify-center my-6">
          <div class="w-16 h-16 rounded-full bg-emerald-500 flex items-center justify-center pulse-circle text-white">
            <n-icon size="32" :component="IconPeople" />
          </div>
        </div>

        <h3 class="text-lg font-bold mb-2">等待好友加入...</h3>
        <p class="text-xs opacity-75 mb-6 px-4 leading-relaxed">
          請複製下方的邀請連結傳送給好友，好友點開連結後即可自動連線到您的聊天室。支援多人同時加入！
        </p>

        <!-- Share Box -->
        <div class="flex flex-col gap-3 bg-black/10 dark:bg-black/30 p-4 rounded-2xl mb-6">
          <span class="text-[10px] uppercase font-bold opacity-60 tracking-wider">您的專屬邀請連結</span>
          <div class="flex gap-2">
            <n-input :value="shareUrl" readonly size="small" placeholder="產生中..." />
            <n-tooltip trigger="hover">
              <template #trigger>
                <n-button size="small" secondary @click="() => copyShareUrl()">
                  <n-icon :component="copiedShareUrl ? IconCheck : IconCopy" />
                </n-button>
              </template>
              {{ copiedShareUrl ? '已複製' : '複製連結' }}
            </n-tooltip>
          </div>
        </div>

        <!-- Peer ID manually just in case -->
        <div class="text-[11px] opacity-70 mb-6">
          您的 Peer ID: <span class="font-mono bg-white/5 px-1.5 py-0.5 rounded">{{ peerId || '取得中...' }}</span>
        </div>

        <div class="flex gap-3">
          <n-button block size="medium" @click="cancelInvitation" type="error" ghost>
            <n-icon :component="IconBack" class="mr-1" />
            取消等待
          </n-button>
        </div>
      </n-card>
    </div>

    <!-- 3. CHAT ROOM SCREEN -->
    <div v-if="uiState === 'chat'" class="w-full grid grid-cols-1 gap-4 lg:grid-cols-4">
      
      <!-- Chat Settings / Status Panel (Left) -->
      <div class="lg:col-span-1 flex flex-col gap-4">
        
        <!-- Status Card -->
        <n-card :bordered="false" size="small" :style="bentoCardStyle" class="bento-card">
          <template #header>
            <div class="flex items-center gap-2">
              <n-icon size="20" :component="IconShield" class="text-emerald-500" />
              <span class="font-bold">對話設定</span>
            </div>
          </template>

          <div class="flex flex-col gap-3.5">
            <!-- User Status Info -->
            <div class="text-xs flex flex-col gap-1.5 bg-black/10 dark:bg-black/20 p-2.5 rounded-xl border border-gray-200/5">
              <div class="flex justify-between">
                <span class="opacity-70">您的暱稱：</span>
                <span class="font-bold">{{ myUsername }}</span>
              </div>
              <div class="flex justify-between border-t border-gray-200/5 pt-1.5 mt-0.5">
                <span class="opacity-70">連線成員：</span>
                <span class="font-bold" :style="{ color: activePalette.accent }">{{ partnersListString }}</span>
              </div>
            </div>

            <!-- E2EE Password Box -->
            <div>
              <span class="text-xs font-semibold opacity-85 block mb-1">E2EE 加密密碼</span>
              <n-input 
                v-model:value="password" 
                type="password" 
                show-password-on="click" 
                size="small" 
                placeholder="所有人設定一致以加密明文" 
              />
              <p class="text-[10px] opacity-60 mt-1 leading-normal">
                密碼不同會導致解密失敗。可隨時在此修改或更正密碼。
              </p>
            </div>

            <!-- Invite More Button -->
            <div>
              <n-tooltip trigger="hover">
                <template #trigger>
                  <n-button block size="small" type="primary" secondary @click="() => copyShareUrl()">
                    <n-icon :component="IconWorld" class="mr-1" />
                    邀請更多人加入
                  </n-button>
                </template>
                {{ copiedShareUrl ? '連結已複製！' : '複製邀請網址發送給其它好友。' }}
              </n-tooltip>
            </div>

            <!-- Disconnect Button -->
            <n-button block size="small" type="error" ghost @click="resetAll" class="mt-1">
              <template #icon><n-icon :component="IconBack" /></template>
              中斷並離開對話
            </n-button>
          </div>
        </n-card>
      </div>

      <!-- Main Chat Conversation Panel (Right) -->
      <div class="lg:col-span-3">
        <n-card :bordered="false" :style="bentoCardStyle" class="bento-card flex flex-col h-[600px] content-card">
          
          <!-- Chat Header -->
          <div class="flex items-center justify-between border-b border-gray-200/10 pb-3 mb-3">
            <div class="flex items-center gap-2">
              <div class="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span class="font-bold text-sm">
                正在與 {{ partnersListString }} 對話
              </span>
            </div>

            <n-tag v-if="derivedKey" type="warning" size="small" round>
              <n-icon :component="IconLock" class="mr-1" />
              AES-256 E2EE 已啟用
            </n-tag>
            <n-tag v-else type="default" size="small" round>
              <n-icon :component="IconUnlock" class="mr-1" />
              直連未加密
            </n-tag>
          </div>

          <!-- Chat History -->
          <div 
            ref="chatContainer"
            class="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3 min-h-[380px] max-h-[380px] rounded-xl"
            :style="chatHistoryStyle"
          >
            <div 
              v-for="msg in messages" 
              :key="msg.id" 
              class="flex flex-col max-w-[80%]"
              :class="msg.sender === 'me' ? 'self-end items-end' : 'self-start items-start'"
            >
              <!-- Time and Sender name -->
              <span class="text-[10.5px] opacity-75 mb-0.5 px-1.5">
                {{ msg.senderName }} • {{ formatTime(msg.timestamp) }}
              </span>

              <!-- Bubble Box -->
              <div 
                class="rounded-2xl px-4 py-2.5 text-[14px] leading-relaxed shadow-sm relative group"
                :style="msg.sender === 'me' ? meBubbleStyle : (msg.decryptionFailed ? partnerBubbleFailedStyle : partnerBubbleStyle)"
              >
                <!-- Image/File Payload -->
                <div v-if="msg.type === 'file' && msg.file" class="flex flex-col gap-2">
                  <div v-if="msg.file.type.startsWith('image/')" class="max-w-[250px] overflow-hidden rounded-lg">
                    <img :src="msg.file.data" class="w-full h-auto object-cover max-h-[200px]" alt="Shared image" />
                  </div>
                  <div class="flex items-center gap-3 bg-black/10 dark:bg-black/30 p-2 rounded-lg text-xs">
                    <n-icon size="24" :component="IconAttach" />
                    <div class="flex-1 min-w-0">
                      <div class="truncate font-medium">{{ msg.file.name }}</div>
                      <div class="opacity-75">{{ formatBytes(msg.file.size) }}</div>
                    </div>
                    <a :href="msg.file.data" :download="msg.file.name" class="hover:text-emerald-500">
                      <n-icon size="20" :component="IconDownload" />
                    </a>
                  </div>
                </div>

                <!-- Text payload -->
                <div v-else class="whitespace-pre-wrap select-text break-words">
                  {{ msg.text }}
                </div>

                <!-- Encryption lock icon -->
                <div v-if="msg.isEncrypted" class="absolute -bottom-2 -right-1 bg-amber-500 text-black text-[8px] font-extrabold px-1 rounded flex items-center gap-0.5 scale-90 shadow-sm">
                  <n-icon size="9" :component="IconLock" />
                  E2EE
                </div>
              </div>
            </div>
          </div>

          <!-- Input Bar -->
          <div class="mt-4 flex gap-2 items-center">
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
              :disabled="connections.length === 0"
              @click="triggerFileSelect"
            >
              <n-icon size="20" :component="IconAttach" />
            </n-button>

            <n-input 
              v-model:value="messageInput" 
              type="text" 
              size="medium"
              placeholder="輸入訊息..." 
              :disabled="connections.length === 0"
              @keyup.enter="sendMessage"
            />

            <n-button 
              type="primary" 
              size="medium"
              :disabled="connections.length === 0 || !messageInput.trim()"
              @click="sendMessage"
            >
              <template #icon>
                <n-icon :component="IconSend" />
              </template>
            </n-button>
          </div>

        </n-card>
      </div>

    </div>
  </div>
</template>

<style scoped lang="less">
.p2p-chat-wrapper {
  margin: 0 auto;
  flex: 1 1 100% !important;
  max-width: 100% !important;
}

.bento-card {
  border-radius: 20px;
  transition: background-color 0.3s, border-color 0.3s, color 0.3s;
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
