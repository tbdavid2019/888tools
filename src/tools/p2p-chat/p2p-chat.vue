<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, nextTick, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useClipboard, useStorage } from '@vueuse/core';
import { useMessage, NIcon, NInput, NButton, NCard, NAlert, NTag, NTooltip, NPopover, NImage } from 'naive-ui';
import { useI18n } from 'vue-i18n';
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
import {
  createMessageId,
  isRecallPacket,
  isWithinRecallWindow,
} from './p2p-chat.protocol';

// Types
type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error';
type UIState = 'setup' | 'waiting' | 'chat';

interface MessageItem {
  id: string;
  sender: 'me' | 'partner';
  senderPeerId?: string;
  senderName: string;
  timestamp: number;
  type: 'text' | 'file';
  text?: string;
  isEncrypted: boolean;
  isRecalled?: boolean;
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
const pendingRecalls = new Set<string>();

function getRecallKey(senderPeerId: string, messageId: string) {
  return JSON.stringify([senderPeerId, messageId]);
}

const peer = ref<Peer | null>(null);
const connections = ref<DataConnection[]>([]);
const partnerNames = ref<Record<string, string>>({}); // peerId -> nickname
const derivedKey = ref<CryptoKey | null>(null);
const chatContainer = ref<HTMLElement | null>(null);

const route = useRoute();
const router = useRouter();
const toast = useMessage();
const styleStore = useStyleStore();
const { t, locale } = useI18n();

// Desktop Notifications State
const notificationPermission = ref(typeof window !== 'undefined' ? Notification.permission : 'default');
const soundEnabled = useStorage('p2p-chat-sound-enabled', true);
const chatBgType = useStorage('p2p-chat-bg-type', 'telegram');
const chatBgCustomUrl = useStorage('p2p-chat-bg-custom-url', '');

const chatBgOptions = computed(() => [
  { label: t('tools.p2p-chat.bgTelegram'), value: 'telegram' },
  { label: t('tools.p2p-chat.bgDefault'), value: 'default' },
  { label: t('tools.p2p-chat.bgBlue'), value: 'blue' },
  { label: t('tools.p2p-chat.bgPink'), value: 'pink' },
  { label: t('tools.p2p-chat.bgGreen'), value: 'green' },
  { label: t('tools.p2p-chat.bgCustom'), value: 'custom' }
]);

async function requestNotificationPermission() {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  try {
    const permission = await Notification.requestPermission();
    notificationPermission.value = permission;
    if (permission === 'granted') {
      toast.success(t('tools.p2p-chat.notificationsEnabled'));
      new Notification(t('tools.p2p-chat.title'), {
        body: t('tools.p2p-chat.notificationTest'),
        icon: '/favicon.ico'
      });
    } else if (permission === 'denied') {
      toast.warning(t('tools.p2p-chat.notificationsBlocked'));
    }
  } catch (e) {
    console.error('Notification permission request failed:', e);
  }
}

// Random Crop & Fruit Nickname Generator based on language
function getRandomNickname() {
  const isZh = locale.value.startsWith('zh');
  
  const nounEmojis: Record<string, string> = {
    // Chinese nouns
    '西瓜': '🍉', '糙米': '🌾', '紅豆': '🫘', '燕麥': '🌾', '芒果': '🥭', 
    '馬鈴薯': '🥔', '芝麻': '🌾', '綠豆': '🟢', '草莓': '🍓', '小麥': '🌾', 
    '花生': '🥜', '玉米': '🌽', '地瓜': '🍠', '藍莓': '🫐', '櫻桃': '🍒', 
    '水蜜桃': '🍑', '小米': '🌾', '薏仁': '🥣', '荔枝': '🍒', '鳳梨': '🍍', 
    '香蕉': '🍌', '蘋果': '🍎',
    // English nouns
    'Watermelon': '🍉', 'Rice': '🌾', 'RedBean': '🫘', 'Oat': '🌾', 'Mango': '🥭', 
    'Potato': '🥔', 'Sesame': '🌾', 'MungBean': '🟢', 'Strawberry': '🍓', 'Wheat': '🌾', 
    'Peanut': '🥜', 'Corn': '🌽', 'SweetPotato': '🍠', 'Blueberry': '🫐', 'Cherry': '🍒', 
    'Peach': '🍑', 'Millet': '🌾', 'Barley': '🥣', 'Lychee': '🍒', 'Pineapple': '🍍', 
    'Banana': '🍌', 'Apple': '🍎'
  };

  if (isZh) {
    const adjs = ['快樂的', '幸運的', '聰明的', '勇敢的', '俏皮的', '活潑的', '溫暖的', '元氣的', '淘氣的', '呆萌的', '帥氣的', '開朗的', '元氣滿滿的', '冒險的'];
    const nouns = ['西瓜', '糙米', '紅豆', '燕麥', '芒果', '馬鈴薯', '芝麻', '綠豆', '草莓', '小麥', '花生', '玉米', '地瓜', '藍莓', '櫻桃', '水蜜桃', '小米', '薏仁', '荔枝', '鳳梨', '香蕉', '蘋果'];
    const adj = adjs[Math.floor(Math.random() * adjs.length)];
    const noun = nouns[Math.floor(Math.random() * nouns.length)];
    const emoji = nounEmojis[noun] || '';
    return adj + noun + ' ' + emoji;
  } else {
    const adjs = ['Happy', 'Lucky', 'Clever', 'Brave', 'Playful', 'Active', 'Warm', 'Energetic', 'Naughty', 'Cute', 'Cool', 'Cheerful', 'Jolly'];
    const nouns = ['Watermelon', 'Rice', 'RedBean', 'Oat', 'Mango', 'Potato', 'Sesame', 'MungBean', 'Strawberry', 'Wheat', 'Peanut', 'Corn', 'SweetPotato', 'Blueberry', 'Cherry', 'Peach', 'Millet', 'Barley', 'Lychee', 'Pineapple', 'Banana', 'Apple'];
    const adj = adjs[Math.floor(Math.random() * adjs.length)];
    const noun = nouns[Math.floor(Math.random() * nouns.length)];
    const emoji = nounEmojis[noun] || '';
    return adj + ' ' + noun + ' ' + emoji;
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
  const border = `1px solid ${activePalette.value.border}20`;
  
  let bgStyle: Record<string, string> = {
    border,
  };

  if (chatBgType.value === 'telegram') {
    bgStyle.backgroundColor = isDark ? '#182533' : '#e7ebf0';
    bgStyle.backgroundImage = 'url("https://telegram.org/img/tgme/pattern.svg")';
    bgStyle.backgroundSize = '380px';
    bgStyle.backgroundRepeat = 'repeat';
    if (isDark) {
      bgStyle.backgroundBlendMode = 'overlay';
    }
  } else if (chatBgType.value === 'default') {
    bgStyle.backgroundColor = isDark ? 'rgba(0, 0, 0, 0.25)' : 'rgba(255, 255, 255, 0.45)';
  } else if (chatBgType.value === 'blue') {
    bgStyle.background = isDark 
      ? 'linear-gradient(180deg, #1e293b 0%, #0f172a 100%)' 
      : 'linear-gradient(180deg, #eff6ff 0%, #dbeafe 100%)';
  } else if (chatBgType.value === 'pink') {
    bgStyle.background = isDark 
      ? 'linear-gradient(180deg, #31151f 0%, #1e0b11 100%)' 
      : 'linear-gradient(180deg, #fff5f7 0%, #ffe4e6 100%)';
  } else if (chatBgType.value === 'green') {
    bgStyle.background = isDark 
      ? 'linear-gradient(180deg, #14281d 0%, #0c1611 100%)' 
      : 'linear-gradient(180deg, #f0fdf4 0%, #dcfce7 100%)';
  } else if (chatBgType.value === 'custom' && chatBgCustomUrl.value.trim()) {
    bgStyle.backgroundImage = `url(${chatBgCustomUrl.value})`;
    bgStyle.backgroundSize = 'cover';
    bgStyle.backgroundPosition = 'center';
    bgStyle.backgroundRepeat = 'no-repeat';
  } else {
    bgStyle.backgroundColor = isDark ? 'rgba(0, 0, 0, 0.25)' : 'rgba(255, 255, 255, 0.45)';
  }

  return bgStyle;
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
  if (names.length === 0) return t('tools.p2p-chat.membersNone');
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

// Base64 to ArrayBuffer
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
  if (!soundEnabled.value) return;
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const now = ctx.currentTime;
    
    // Play a dual-tone chime (higher pitch, pleasant sound)
    const playTone = (freq: number, start: number, duration: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, start);
      
      gain.gain.setValueAtTime(0.0, start);
      gain.gain.linearRampToValueAtTime(0.08, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
      
      osc.start(start);
      osc.stop(start + duration);
    };
    
    playTone(830.61, now, 0.45); // Ab5
    playTone(1046.50, now + 0.08, 0.45); // C6
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
  // Try to load saved peer ID for room persistence (only for hosts)
  let savedId = typeof window !== 'undefined' ? localStorage.getItem('p2p-chat-saved-peer-id') : null;
  if (role.value === 'guest') {
    savedId = null;
  }

  connectionState.value = 'connecting';
  if (savedId) {
    peer.value = new Peer(savedId);
  } else {
    peer.value = new Peer();
  }

  peer.value.on('open', (id) => {
    peerId.value = id;
    if (role.value === 'host') {
      localStorage.setItem('p2p-chat-saved-peer-id', id);
    }
    
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
    
    // If the saved ID is unavailable (e.g. active in another tab/reconnecting) or invalid, clear and recreate
    if (err.type === 'unavailable-id' || err.type === 'invalid-id') {
      localStorage.removeItem('p2p-chat-saved-peer-id');
      initPeer();
      return;
    }
    
    toast.error(t('tools.p2p-chat.statusError') + ': ' + err.message);
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
        toast.success(t('tools.p2p-chat.memberJoined', { name: data.nickname }));
        return;
      }

      // 2. Handle Peer Announcement (Mesh Connection)
      if (data.type === 'announce-peer') {
        const newPeerId = data.peerId;
        if (peer.value && !connections.value.some(c => c.peer === newPeerId)) {
          toast.info(t('tools.p2p-chat.connectingToNew'));
          const newConn = peer.value.connect(newPeerId);
          setupConnection(newConn);
        }
        return;
      }

      // 3. Handle message recall control packets
      if (data.type === 'recall') {
        if (!isRecallPacket(data) || data.senderPeerId !== conn.peer) return;

        const recalledMessage = messages.value.find(
          msg => msg.id === data.messageId && msg.senderPeerId === conn.peer,
        );
        if (recalledMessage) {
          if (isWithinRecallWindow(recalledMessage.timestamp)) {
            markMessageRecalled(recalledMessage);
          }
        } else if (pendingRecalls.size < 100) {
          // Decryption is asynchronous, so the recall packet can be handled
          // before the original message has been added to the list.
          pendingRecalls.add(getRecallKey(data.senderPeerId, data.messageId));
        }
        return;
      }

      // 4. Handle normal message
      const msgId = typeof data.messageId === 'string' && data.messageId
        ? data.messageId
        : createMessageId('received');
      let isEncrypted = !!data.encrypted;
      let text = data.text || '';
      let fileData = data.file;
      let decryptionFailed = false;
      const messageTimestamp = typeof data.timestamp === 'number' ? data.timestamp : Date.now();
      const hasPendingRecall = pendingRecalls.delete(getRecallKey(conn.peer, msgId));
      const shouldApplyPendingRecall = hasPendingRecall && isWithinRecallWindow(messageTimestamp);

      if (messages.value.some(msg => msg.id === msgId && msg.senderPeerId === conn.peer)) return;

      if (isEncrypted && data.encrypted) {
        if (!derivedKey.value) {
          text = t('tools.p2p-chat.e2eeNoteMessage');
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
            text = t('tools.p2p-chat.decryptFailedMessage');
            decryptionFailed = true;
            fileData = undefined;
          }
        }
      }

      messages.value.push({
        id: msgId,
        sender: 'partner',
        senderPeerId: conn.peer,
        senderName: data.senderName || 'Partner',
        timestamp: messageTimestamp,
        type: data.type || 'text',
        text,
        isEncrypted,
        isRecalled: shouldApplyPendingRecall,
        decryptionFailed,
        file: fileData,
        rawEncrypted: data.encrypted,
        rawEncryptedFile: data.file?.isEncryptedData ? data.file : null
      } as any);
      
      // Trigger browser notification if document is hidden and permission is granted
      if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted' && document.hidden) {
        new Notification(data.senderName || 'P2P Chat', {
          body: text || (fileData ? `[傳送了檔案: ${fileData.name}]` : ''),
          icon: '/favicon.ico'
        });
      }
      
      playAlertSound();
      scrollToBottom();
    }
  });

  conn.on('close', () => {
    const name = partnerNames.value[conn.peer] || '成員';
    toast.info(t('tools.p2p-chat.memberLeft', { name }));
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
    if (!msg.isRecalled && msg.isEncrypted && (msg.decryptionFailed || !msg.text || msg.text.startsWith('['))) {
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
          msg.text = t('tools.p2p-chat.decryptFailedMessage');
          msg.decryptionFailed = true;
          msg.file = undefined;
        }
      }
    }
  }
}

function markMessageRecalled(message: MessageItem) {
  message.isRecalled = true;
  message.decryptionFailed = false;
  message.text = undefined;
  message.file = undefined;
}

function handleKeyDown(e: KeyboardEvent) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault(); // Prevent standard newline
    sendMessage();
  }
}

// Send Message (Broadcast to all connected mesh peers)
async function sendMessage() {
  if (!messageInput.value.trim()) return;
  if (connections.value.length === 0) {
    toast.warning(t('tools.p2p-chat.statusDisconnected'));
    return;
  }

  const textToSend = messageInput.value;
  const timestamp = Date.now();
  const msgId = createMessageId();
  
  let payload: any = {
    type: 'text',
    messageId: msgId,
    senderPeerId: peerId.value,
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
      toast.error(t('tools.p2p-chat.encryptError'));
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
    senderPeerId: peerId.value,
    senderName: myUsername.value,
    timestamp,
    type: 'text',
    text: textToSend,
    isEncrypted: !!derivedKey.value,
  });

  messageInput.value = '';
  scrollToBottom();
}

function canRecallMessage(message: MessageItem) {
  return message.sender === 'me'
    && !message.isRecalled
    && isWithinRecallWindow(message.timestamp);
}

function recallMessage(message: MessageItem) {
  if (message.isRecalled) return;
  if (!canRecallMessage(message)) {
    toast.warning(t('tools.p2p-chat.recallExpired'));
    return;
  }
  if (connections.value.length === 0) {
    toast.warning(t('tools.p2p-chat.statusDisconnected'));
    return;
  }

  const packet = {
    type: 'recall' as const,
    messageId: message.id,
    senderPeerId: peerId.value,
    text: t('tools.p2p-chat.messageRecalled'),
  };

  markMessageRecalled(message);
  connections.value.forEach(conn => {
    try {
      conn.send(packet);
    } catch (error) {
      console.error('Failed to send recall packet:', error);
    }
  });

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
  await processAndSendFile(file);
}

async function processAndSendFile(file: File) {
  if (connections.value.length === 0) {
    toast.warning(t('tools.p2p-chat.statusDisconnected'));
    return;
  }
  if (file.size > 2 * 1024 * 1024) {
    toast.error(t('tools.p2p-chat.fileTooLarge'));
    return;
  }

  const reader = new FileReader();
  reader.onload = async (event) => {
    if (!event.target?.result || connections.value.length === 0) return;
    
    const base64Data = event.target.result as string;
    const timestamp = Date.now();
    const msgId = createMessageId();

    let payload: any = {
      type: 'file',
      messageId: msgId,
      senderPeerId: peerId.value,
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
        const { ciphertext: textCt, iv: textIv } = await encryptText(t('tools.p2p-chat.e2eeNoteFile', { name: file.name }), derivedKey.value);
        payload.encrypted = {
          ciphertext: arrayBufferToBase64(textCt),
          iv: arrayBufferToBase64(textIv)
        };

        const { ciphertext: fileCt, iv: fileIv } = await encryptText(base64Data, derivedKey.value);
        payload.file.isEncryptedData = true;
        payload.file.data = arrayBufferToBase64(fileCt);
        payload.file.iv = arrayBufferToBase64(fileIv);
      } catch (e) {
        toast.error(t('tools.p2p-chat.fileEncryptError'));
        return;
      }
    } else {
      payload.text = t('tools.p2p-chat.e2eeNoteFile', { name: file.name });
      payload.file.data = base64Data;
    }

    // Broadcast to all active mesh peers
    connections.value.forEach(conn => {
      conn.send(payload);
    });

    messages.value.push({
      id: msgId,
      sender: 'me',
      senderPeerId: peerId.value,
      senderName: myUsername.value,
      timestamp,
      type: 'file',
      text: t('tools.p2p-chat.e2eeNoteFile', { name: file.name }),
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

// Clipboard Paste Handler (Screenshot paste to upload)
function handlePaste(e: ClipboardEvent) {
  if (connections.value.length === 0) return;
  const items = e.clipboardData?.items;
  if (!items) return;
  
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (item.type.indexOf('image') !== -1) {
      const file = item.getAsFile();
      if (file) {
        e.preventDefault(); // Stop inserting text
        const timestampStr = new Date().toISOString().replace(/[:.]/g, '-');
        const renamedFile = new File([file], `screenshot-${timestampStr}.png`, { type: 'image/png' });
        processAndSendFile(renamedFile);
        break; // Only send one image
      }
    }
  }
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
  if (typeof window !== 'undefined') {
    localStorage.removeItem('p2p-chat-saved-peer-id');
  }
  if (peer.value) {
    peer.value.destroy();
    peer.value = null;
  }
  peerId.value = '';
  connectionState.value = 'disconnected';
  uiState.value = 'setup';
  messages.value = [];
  pendingRecalls.clear();
  
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
    toast.info(t('tools.p2p-chat.detectInvite'));
  }
  if (typeof window !== 'undefined') {
    window.addEventListener('paste', handlePaste);
  }
});

onUnmounted(() => {
  disconnectAll();
  if (peer.value) {
    peer.value.destroy();
  }
  if (typeof window !== 'undefined') {
    window.removeEventListener('paste', handlePaste);
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
            {{ $t('tools.p2p-chat.title') }}
          </h2>
          <p class="text-sm opacity-75 leading-relaxed">
            {{ $t('tools.p2p-chat.description') }}
          </p>
        </div>

        <div class="flex flex-col gap-5 mt-2">
          <!-- Username Block -->
          <div>
            <label class="block text-sm font-semibold mb-2 opacity-80">{{ $t('tools.p2p-chat.nickname') }}</label>
            <div class="flex gap-2">
              <n-input v-model:value="myUsername" :placeholder="$t('tools.p2p-chat.nicknamePlaceholder')" />
              <n-tooltip trigger="hover">
                <template #trigger>
                  <n-button secondary @click="randomizeName">
                    <template #icon><n-icon :component="IconDice" /></template>
                  </n-button>
                </template>
                {{ $t('tools.p2p-chat.diceTooltip') }}
              </n-tooltip>
            </div>
          </div>

          <!-- Password (E2EE) Block -->
          <div>
            <label class="block text-sm font-semibold mb-2 opacity-80 flex items-center gap-1">
              {{ $t('tools.p2p-chat.e2eePassword') }} <n-tag size="mini" type="warning" round>{{ $t('tools.p2p-chat.optional') }}</n-tag>
            </label>
            <n-input 
              v-model:value="password" 
              type="password" 
              show-password-on="click" 
              :placeholder="$t('tools.p2p-chat.e2eePasswordPlaceholder')" 
            />
            <p class="text-xs opacity-60 mt-1.5 leading-relaxed">
              {{ $t('tools.p2p-chat.e2eePasswordNote') }}
            </p>
          </div>

          <!-- Action Buttons -->
          <div class="mt-4 pt-4 border-t border-gray-200/10 flex flex-col gap-4">
            
            <!-- CASE A: User is Guest (Invited via URL) -->
            <div v-if="targetPeerId" class="flex flex-col gap-3">
              <n-alert type="info" size="small" class="text-sm">
                <template #icon>
                  <n-icon :component="IconPeople" />
                </template>
                {{ $t('tools.p2p-chat.invitedAlert') }}
              </n-alert>
              
              <n-button 
                type="primary" 
                block 
                size="large" 
                :loading="connectionState === 'connecting'"
                @click="startGuest"
                class="wiggle-btn"
              >
                {{ $t('tools.p2p-chat.joinChatBtn') }}
              </n-button>

              <n-button 
                secondary 
                block 
                size="medium" 
                @click="targetPeerId = ''; router.replace({ query: {} })"
              >
                {{ $t('tools.p2p-chat.createInsteadBtn') }}
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
                {{ $t('tools.p2p-chat.createRoomBtn') }}
              </n-button>

              <div class="flex items-center my-1 text-sm opacity-50 justify-center gap-2">
                <span class="w-8 h-[1px] bg-current opacity-30"></span>
                <span>{{ $t('tools.p2p-chat.orJoinManual') }}</span>
                <span class="w-8 h-[1px] bg-current opacity-30"></span>
              </div>

              <div class="flex gap-2">
                <n-input v-model:value="targetPeerId" :placeholder="$t('tools.p2p-chat.pastePeerId')" />
                <n-button 
                  type="primary" 
                  secondary
                  :disabled="!targetPeerId"
                  @click="startGuest"
                >
                  {{ $t('tools.p2p-chat.connectBtn') }}
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

        <h3 class="text-lg font-bold mb-2">{{ $t('tools.p2p-chat.waitingTitle') }}</h3>
        <p class="text-sm opacity-75 mb-6 px-4 leading-relaxed">
          {{ $t('tools.p2p-chat.waitingDesc') }}
        </p>

        <!-- Share Box -->
        <div class="flex flex-col gap-3 bg-black/10 dark:bg-black/30 p-4 rounded-2xl mb-6">
          <span class="text-xs uppercase font-bold opacity-60 tracking-wider">{{ $t('tools.p2p-chat.inviteUrlLabel') }}</span>
          <div class="flex gap-2">
            <n-input :value="shareUrl" readonly size="small" placeholder="產生中..." />
            <n-tooltip trigger="hover">
              <template #trigger>
                <n-button size="small" secondary @click="() => copyShareUrl()">
                  <n-icon :component="copiedShareUrl ? IconCheck : IconCopy" />
                </n-button>
              </template>
              {{ copiedShareUrl ? $t('tools.p2p-chat.copiedBtn') : $t('tools.p2p-chat.copyBtn') }}
            </n-tooltip>
          </div>
        </div>

        <!-- Peer ID manually just in case -->
        <div class="text-xs opacity-70 mb-6">
          Your Peer ID: <span class="font-mono bg-white/5 px-1.5 py-0.5 rounded">{{ peerId || '...' }}</span>
        </div>

        <div class="flex gap-3">
          <n-button block size="medium" @click="cancelInvitation" type="error" ghost>
            <n-icon :component="IconBack" class="mr-1" />
            {{ $t('tools.p2p-chat.cancelBtn') }}
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
              <span class="font-bold">{{ $t('tools.p2p-chat.dialogConfig') }}</span>
            </div>
          </template>

          <div class="flex flex-col gap-3.5">
            <!-- Members List Section -->
            <div class="flex flex-col gap-2">
              <span class="text-xs font-semibold opacity-85 block">{{ $t('tools.p2p-chat.roomMembers') }} ({{ Object.keys(partnerNames).length + 1 }})</span>
              <div class="flex flex-col gap-1.5 bg-black/10 dark:bg-black/20 p-2.5 rounded-xl border border-gray-200/5">
                <!-- Self -->
                <div class="flex items-center justify-between text-sm py-0.5">
                  <div class="flex items-center gap-2">
                    <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
                    <span class="font-medium">{{ myUsername }}</span>
                  </div>
                  <n-tag size="mini" type="success" round>{{ $t('tools.p2p-chat.me') }}</n-tag>
                </div>
                <!-- Connected Peers -->
                <div 
                  v-for="(name, pId) in partnerNames" 
                  :key="pId"
                  class="flex items-center justify-between text-sm py-0.5 border-t border-gray-200/5 pt-1.5 mt-0.5"
                >
                  <div class="flex items-center gap-2">
                    <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span class="font-bold" :style="{ color: activePalette.accent }">{{ name }}</span>
                  </div>
                  <span class="text-[10px] opacity-50 font-mono">P2P</span>
                </div>
              </div>
            </div>

            <!-- E2EE Password Box -->
            <div>
              <span class="text-sm font-semibold opacity-85 block mb-1">{{ $t('tools.p2p-chat.e2eePassword') }}</span>
              <n-input 
                v-model:value="password" 
                type="password" 
                show-password-on="click" 
                size="small" 
                :placeholder="$t('tools.p2p-chat.e2eePasswordPlaceholder')" 
              />
              <p class="text-xs opacity-60 mt-1 leading-normal">
                {{ $t('tools.p2p-chat.e2eePasswordNoteSidebar') }}
              </p>
            </div>

            <!-- Chat Window Background -->
            <div>
              <span class="text-sm font-semibold opacity-85 block mb-1">{{ $t('tools.p2p-chat.chatBgLabel') }}</span>
              <n-select 
                v-model:value="chatBgType" 
                size="small"
                :options="chatBgOptions"
              />
              <div v-if="chatBgType === 'custom'" class="mt-1.5">
                <n-input 
                  v-model:value="chatBgCustomUrl" 
                  size="small" 
                  :placeholder="$t('tools.p2p-chat.bgCustomPlaceholder')" 
                />
              </div>
            </div>

            <!-- Desktop Notification Button -->
            <div>
              <n-button 
                block 
                size="small" 
                :type="notificationPermission === 'granted' ? 'success' : 'warning'" 
                secondary
                :disabled="notificationPermission === 'granted'"
                @click="requestNotificationPermission"
              >
                <template #icon>
                  <span class="text-xs">🛎️</span>
                </template>
                {{ notificationPermission === 'granted' ? $t('tools.p2p-chat.notificationsEnabled') : $t('tools.p2p-chat.enableNotifications') }}
              </n-button>
            </div>

            <!-- Sound Notification Button -->
            <div>
              <n-button 
                block 
                size="small" 
                :type="soundEnabled ? 'success' : 'default'" 
                secondary
                @click="soundEnabled = !soundEnabled"
              >
                <template #icon>
                  <span class="text-xs">{{ soundEnabled ? '🔊' : '🔇' }}</span>
                </template>
                {{ soundEnabled ? $t('tools.p2p-chat.soundEnabled') : $t('tools.p2p-chat.soundDisabled') }}
              </n-button>
            </div>

            <!-- Invite More Button -->
            <div>
              <n-tooltip trigger="hover">
                <template #trigger>
                  <n-button block size="small" type="primary" secondary @click="() => copyShareUrl()">
                    <n-icon :component="IconWorld" class="mr-1" />
                    {{ $t('tools.p2p-chat.inviteMoreBtn') }}
                  </n-button>
                </template>
                {{ copiedShareUrl ? $t('tools.p2p-chat.copiedBtn') : $t('tools.p2p-chat.inviteMoreBtn') }}
              </n-tooltip>
            </div>

            <!-- Disconnect Button -->
            <n-button block size="small" type="error" ghost @click="resetAll" class="mt-1">
              <template #icon><n-icon :component="IconBack" /></template>
              {{ $t('tools.p2p-chat.disconnectBtn') }}
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
              <span class="font-bold text-base">
                {{ $t('tools.p2p-chat.statusChattingWith', { partners: partnersListString }) }}
              </span>
            </div>

            <n-tag v-if="derivedKey" type="warning" size="medium" round>
              <n-icon :component="IconLock" class="mr-1" />
              {{ $t('tools.p2p-chat.e2eeEnabled') }}
            </n-tag>
            <n-tag v-else type="default" size="small" round>
              <n-icon :component="IconUnlock" class="mr-1" />
              {{ $t('tools.p2p-chat.e2eeDisabled') }}
            </n-tag>
          </div>

          <!-- Chat History -->
          <div 
            ref="chatContainer"
            class="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3 min-h-[380px] max-h-[380px] rounded-xl"
            :style="chatHistoryStyle"
          >
            <div v-if="messages.length === 0" class="h-full flex flex-col items-center justify-center text-center opacity-50 py-10">
              <n-icon size="40" :component="IconChat" class="mb-2" />
              <p class="text-sm">{{ $t('tools.p2p-chat.noMessages') }}</p>
              <p class="text-xs mt-1">{{ $t('tools.p2p-chat.noMessagesDesc') }}</p>
            </div>

            <div 
              v-for="msg in messages" 
              :key="msg.id" 
              class="flex flex-col max-w-[80%]"
              :class="msg.sender === 'me' ? 'self-end items-end' : 'self-start items-start'"
            >
              <!-- Time and Sender name -->
              <span class="text-xs opacity-75 mb-0.5 px-1.5">
                {{ msg.senderName }} • {{ formatTime(msg.timestamp) }}
              </span>

              <!-- Bubble Box -->
              <div 
                class="rounded-2xl px-4 py-2.5 text-base leading-relaxed shadow-sm relative group"
                :style="msg.sender === 'me' ? meBubbleStyle : (msg.decryptionFailed ? partnerBubbleFailedStyle : partnerBubbleStyle)"
              >
                <!-- Recalled message placeholder -->
                <div v-if="msg.isRecalled" class="italic opacity-75 text-sm py-1">
                  {{ $t('tools.p2p-chat.messageRecalled') }}
                </div>

                <!-- Image/File Payload -->
                <div v-else-if="msg.type === 'file' && msg.file" class="flex flex-col gap-2">
                  <div v-if="msg.file.type.startsWith('image/')" class="max-w-[280px] overflow-hidden rounded-lg shadow-sm border border-black/10">
                    <n-image 
                      :src="msg.file.data" 
                      :preview-src="msg.file.data"
                      class="w-full cursor-zoom-in hover:opacity-90 transition-opacity" 
                      style="max-height: 240px; display: block;"
                      object-fit="contain" 
                      alt="Shared image"
                    />
                  </div>
                  <div class="flex items-center gap-3 bg-black/10 dark:bg-black/30 p-2 rounded-lg text-sm">
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

                <n-tooltip v-if="msg.sender === 'me' && canRecallMessage(msg)" trigger="hover">
                  <template #trigger>
                    <n-button
                      quaternary
                      size="tiny"
                      class="mt-1 !text-white/80 hover:!text-white"
                      :aria-label="$t('tools.p2p-chat.recallBtn')"
                      @click="recallMessage(msg)"
                    >
                      <template #icon><n-icon :component="IconBack" /></template>
                      {{ $t('tools.p2p-chat.recallBtn') }}
                    </n-button>
                  </template>
                  {{ $t('tools.p2p-chat.recallTooltip') }}
                </n-tooltip>

                <!-- Encryption lock icon -->
                <div v-if="msg.isEncrypted && !msg.isRecalled" class="absolute -bottom-2 -right-1 bg-amber-500 text-black text-[10px] font-extrabold px-1 rounded flex items-center gap-0.5 scale-90 shadow-sm">
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
            
            <n-popover trigger="click" placement="top-start" scrollable style="max-width: 250px">
              <template #trigger>
                <n-button circle secondary size="medium" :disabled="connections.length === 0">
                  <span class="text-lg">😀</span>
                </n-button>
              </template>
              <div class="grid grid-cols-6 gap-2 p-1">
                <button 
                  v-for="emoji in ['😀', '😂', '😊', '😍', '🥰', '😘', '😜', '🤔', '🤫', '🤨', '🙄', '😢', '😡', '👍', '👎', '👏', '🙌', '🔥', '🎉', '❤️', '💡', '❓']" 
                  :key="emoji" 
                  class="text-xl hover:bg-black/10 dark:hover:bg-white/10 p-1.5 rounded-lg transition-colors cursor-pointer border-none bg-transparent"
                  @click="messageInput += emoji"
                >
                  {{ emoji }}
                </button>
              </div>
            </n-popover>

            <n-input 
              v-model:value="messageInput" 
              type="textarea" 
              :autosize="{ minRows: 1, maxRows: 4 }"
              size="medium"
              :placeholder="$t('tools.p2p-chat.inputPlaceholder')" 
              :disabled="connections.length === 0"
              @keydown="handleKeyDown"
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

@keyframes gentle-wiggle {
  0%, 90%, 100% { transform: rotate(0deg) scale(1); }
  92% { transform: rotate(-1.5deg) scale(1.015); }
  94% { transform: rotate(1.5deg) scale(1.015); }
  96% { transform: rotate(-1.5deg) scale(1.015); }
  98% { transform: rotate(1.5deg) scale(1.015); }
}

.wiggle-btn {
  animation: gentle-wiggle 4s infinite;
  box-shadow: 0 4px 14px rgba(16, 185, 129, 0.2);
}
</style>
