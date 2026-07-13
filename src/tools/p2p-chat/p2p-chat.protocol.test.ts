import { describe, expect, it } from 'vitest';
import {
  RECALL_WINDOW_MS,
  createMessageId,
  isRecallPacket,
  isWithinRecallWindow,
  shouldSendMessageOnEnter,
} from './p2p-chat.protocol';

describe('p2p chat recall protocol', () => {
  it('creates a unique message id with the expected prefix', () => {
    const firstId = createMessageId();
    const secondId = createMessageId();

    expect(firstId).toMatch(/^msg_/);
    expect(secondId).toMatch(/^msg_/);
    expect(firstId).not.toBe(secondId);
  });

  it('accepts a well-formed recall packet', () => {
    expect(
      isRecallPacket({
        type: 'recall',
        messageId: 'msg_123',
        senderPeerId: 'peer-123',
      }),
    ).toBe(true);
  });

  it('rejects malformed or unrelated packets', () => {
    expect(isRecallPacket({ type: 'recall', messageId: '' })).toBe(false);
    expect(isRecallPacket({ type: 'recall', messageId: 'msg_123' })).toBe(false);
    expect(isRecallPacket({ type: 'text', messageId: 'msg_123' })).toBe(false);
    expect(isRecallPacket(null)).toBe(false);
  });

  it('allows recall within the two-minute window, including the boundary', () => {
    const now = 1_000_000;

    expect(isWithinRecallWindow(now - RECALL_WINDOW_MS, now)).toBe(true);
    expect(isWithinRecallWindow(now - RECALL_WINDOW_MS - 1, now)).toBe(false);
    expect(isWithinRecallWindow(now + 1, now)).toBe(false);
  });

  it('does not treat IME composition confirmation as send', () => {
    expect(shouldSendMessageOnEnter({ key: 'Enter', shiftKey: false, isComposing: true, keyCode: 13 })).toBe(false);
    expect(shouldSendMessageOnEnter({ key: 'Enter', shiftKey: false, isComposing: false, keyCode: 229 })).toBe(false);
    expect(shouldSendMessageOnEnter({ key: 'Enter', shiftKey: false, isComposing: false, keyCode: 13 })).toBe(true);
    expect(shouldSendMessageOnEnter({ key: 'Enter', shiftKey: true, isComposing: false, keyCode: 13 })).toBe(false);
  });
});
