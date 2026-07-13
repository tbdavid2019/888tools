export const RECALL_WINDOW_MS = 2 * 60 * 1000;

export interface RecallPacket {
  type: 'recall'
  messageId: string
  senderPeerId: string
  text?: string
}

export function createMessageId(prefix = 'msg'): string {
  const uuid = globalThis.crypto?.randomUUID?.();
  const fallback = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  return `${prefix}_${uuid ?? fallback}`;
}

export function isRecallPacket(data: unknown): data is RecallPacket {
  if (!data || typeof data !== 'object') {
    return false;
  }

  const packet = data as Partial<RecallPacket>;
  return packet.type === 'recall'
    && typeof packet.messageId === 'string'
    && packet.messageId.length > 0
    && typeof packet.senderPeerId === 'string'
    && packet.senderPeerId.length > 0;
}

export function isWithinRecallWindow(timestamp: number, now = Date.now()): boolean {
  return Number.isFinite(timestamp)
    && timestamp <= now
    && now - timestamp <= RECALL_WINDOW_MS;
}

export interface MessageKeyEvent {
  key: string
  shiftKey: boolean
  isComposing?: boolean
  keyCode?: number
}

export function shouldSendMessageOnEnter(event: MessageKeyEvent): boolean {
  return event.key === 'Enter'
    && !event.shiftKey
    && !event.isComposing
    && event.keyCode !== 229;
}
