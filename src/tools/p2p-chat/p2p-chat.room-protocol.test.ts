import { describe, expect, it } from 'vitest';
import {
  createRoomId,
  createRoomSessionId,
  isValidRoomId,
  parseRoomServerMessage,
} from './p2p-chat.room-protocol';

describe('p2p chat room protocol', () => {
  it('creates valid room and session identifiers', () => {
    const roomId = createRoomId();
    const sessionId = createRoomSessionId();

    expect(isValidRoomId(roomId)).toBe(true);
    expect(sessionId).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(roomId).not.toBe(sessionId);
  });

  it('parses a room state and filters malformed members', () => {
    const message = parseRoomServerMessage({
      type: 'room-state',
      members: [{ peerId: 'peer-a', sessionId: 'session-a', nickname: 'A' }],
    });

    expect(message).toEqual({
      type: 'room-state',
      members: [{ peerId: 'peer-a', sessionId: 'session-a', nickname: 'A' }],
    });
    expect(parseRoomServerMessage({
      type: 'room-state',
      members: [{ peerId: 'peer-a' }],
    })).toBeNull();
  });

  it('parses member join and leave events', () => {
    expect(parseRoomServerMessage({
      type: 'member-joined',
      member: { peerId: 'peer-a', sessionId: 'session-a', nickname: 'A' },
    })).toEqual({
      type: 'member-joined',
      member: { peerId: 'peer-a', sessionId: 'session-a', nickname: 'A' },
    });
    expect(parseRoomServerMessage({
      type: 'member-left',
      peerId: 'peer-a',
      sessionId: 'session-a',
    })).toEqual({ type: 'member-left', peerId: 'peer-a', sessionId: 'session-a' });
  });
});
