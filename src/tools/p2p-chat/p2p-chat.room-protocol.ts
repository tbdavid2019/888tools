export interface RoomMember {
  peerId: string
  sessionId: string
  nickname: string
}

export type RoomServerMessage = {
  type: 'room-state'
  members: RoomMember[]
} | {
  type: 'member-joined'
  member: RoomMember
} | {
  type: 'member-left'
  peerId: string
  sessionId: string
};

const ROOM_ID_PATTERN = /^[A-Za-z0-9_-]{16,64}$/;

export function createRoomId(): string {
  const uuid = globalThis.crypto?.randomUUID?.();
  const fallback = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  return (uuid ?? fallback).replace(/-/g, '').slice(0, 32);
}

export function createRoomSessionId(): string {
  return createRoomId();
}

export function isValidRoomId(value: string): boolean {
  return ROOM_ID_PATTERN.test(value);
}

export function parseRoomServerMessage(data: unknown): RoomServerMessage | null {
  if (!data || typeof data !== 'object') {
    return null;
  }

  const message = data as Partial<RoomServerMessage>;
  if (message.type === 'room-state' && Array.isArray(message.members)) {
    const members = message.members.filter(isRoomMember);
    return members.length === message.members.length ? { type: 'room-state', members } : null;
  }

  if (message.type === 'member-joined' && isRoomMember(message.member)) {
    return { type: 'member-joined', member: message.member };
  }

  if (message.type === 'member-left'
    && typeof message.peerId === 'string'
    && typeof message.sessionId === 'string') {
    return { type: 'member-left', peerId: message.peerId, sessionId: message.sessionId };
  }

  return null;
}

function isRoomMember(value: unknown): value is RoomMember {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const member = value as Partial<RoomMember>;
  return typeof member.peerId === 'string'
    && member.peerId.length > 0
    && typeof member.sessionId === 'string'
    && member.sessionId.length > 0
    && typeof member.nickname === 'string';
}
