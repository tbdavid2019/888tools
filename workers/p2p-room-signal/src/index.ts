import { DurableObject } from 'cloudflare:workers';

interface Env {
  ROOMS: DurableObjectNamespace<Room>;
}

interface RoomMember {
  peerId: string;
  sessionId: string;
  nickname: string;
}

interface ConnectionAttachment extends RoomMember {
  joinedAt: number;
}

type ClientMessage = {
  type: 'heartbeat';
} | {
  type: 'nickname';
  nickname: string;
};

type ServerMessage = {
  type: 'room-state';
  members: RoomMember[];
} | {
  type: 'member-joined';
  member: RoomMember;
} | {
  type: 'member-left';
  peerId: string;
  sessionId: string;
};

const ROOM_ID_PATTERN = /^[A-Za-z0-9_-]{16,64}$/;
const PEER_ID_PATTERN = /^[A-Za-z0-9_-]{1,128}$/;
const SESSION_ID_PATTERN = /^[A-Za-z0-9_-]{16,128}$/;
const MAX_NICKNAME_LENGTH = 80;

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'access-control-allow-origin': '*',
    },
  });
}

function isValidIdentifier(value: string | null, pattern: RegExp): value is string {
  return value !== null && pattern.test(value);
}

function normalizeNickname(value: string | null): string {
  const nickname = value?.trim() || 'Guest';
  return nickname.slice(0, MAX_NICKNAME_LENGTH);
}

function parseClientMessage(value: string | ArrayBuffer): ClientMessage | null {
  if (typeof value !== 'string' || value.length > 2_000) return null;

  try {
    const message = JSON.parse(value) as Partial<ClientMessage>;
    if (message.type === 'heartbeat') return { type: 'heartbeat' };
    if (message.type === 'nickname' && typeof message.nickname === 'string') {
      return { type: 'nickname', nickname: normalizeNickname(message.nickname) };
    }
  } catch {
    return null;
  }

  return null;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const roomId = url.pathname.match(/^\/rooms\/([^/]+)$/)?.[1] ?? '';

    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'access-control-allow-origin': '*',
          'access-control-allow-headers': 'content-type',
          'access-control-allow-methods': 'GET, OPTIONS',
        },
      });
    }

    if (!isValidIdentifier(roomId, ROOM_ID_PATTERN)) {
      return jsonResponse({ error: 'Invalid room id' }, 400);
    }

    const objectId = env.ROOMS.idFromName(roomId);
    return env.ROOMS.get(objectId).fetch(request);
  },
};

export class Room extends DurableObject<Env> {
  async fetch(request: Request): Promise<Response> {
    if (request.headers.get('Upgrade')?.toLowerCase() !== 'websocket') {
      return jsonResponse({ error: 'WebSocket upgrade required' }, 426);
    }

    const url = new URL(request.url);
    const peerId = url.searchParams.get('peerId');
    const sessionId = url.searchParams.get('sessionId');
    if (!isValidIdentifier(peerId, PEER_ID_PATTERN) || !isValidIdentifier(sessionId, SESSION_ID_PATTERN)) {
      return jsonResponse({ error: 'Valid peerId and sessionId are required' }, 400);
    }

    const nickname = normalizeNickname(url.searchParams.get('nickname'));
    const existingSockets = this.ctx.getWebSockets('room').filter((socket) => {
      const attachment = socket.deserializeAttachment() as ConnectionAttachment | null;
      return attachment?.peerId === peerId;
    });
    existingSockets.forEach((socket) => socket.close(4001, 'Peer session replaced'));

    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    const attachment: ConnectionAttachment = {
      peerId,
      sessionId,
      nickname,
      joinedAt: Date.now(),
    };

    this.ctx.acceptWebSocket(server, ['room']);
    server.serializeAttachment(attachment);

    const member: RoomMember = { peerId, sessionId, nickname };
    this.send(server, {
      type: 'room-state',
      members: this.getMembers(),
    });
    this.broadcast({ type: 'member-joined', member }, server);

    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(socket: WebSocket, message: string | ArrayBuffer) {
    const parsed = parseClientMessage(message);
    if (!parsed) return;

    if (parsed.type === 'heartbeat') {
      this.send(socket, { type: 'room-state', members: this.getMembers() });
      return;
    }

    const attachment = socket.deserializeAttachment() as ConnectionAttachment | null;
    if (!attachment) return;

    const nextAttachment = { ...attachment, nickname: parsed.nickname };
    socket.serializeAttachment(nextAttachment);
    this.broadcast({
      type: 'member-joined',
      member: {
        peerId: nextAttachment.peerId,
        sessionId: nextAttachment.sessionId,
        nickname: nextAttachment.nickname,
      },
    }, socket);
  }

  async webSocketClose(socket: WebSocket) {
    const attachment = socket.deserializeAttachment() as ConnectionAttachment | null;
    if (!attachment) return;

    this.broadcast({
      type: 'member-left',
      peerId: attachment.peerId,
      sessionId: attachment.sessionId,
    }, socket);
  }

  async webSocketError(socket: WebSocket) {
    await this.webSocketClose(socket);
  }

  private getMembers(): RoomMember[] {
    const members = new Map<string, ConnectionAttachment>();
    this.ctx.getWebSockets('room').forEach((socket) => {
      if (socket.readyState !== WebSocket.OPEN) return;
      const attachment = socket.deserializeAttachment() as ConnectionAttachment | null;
      if (!attachment) return;

      const previous = members.get(attachment.peerId);
      if (!previous || previous.joinedAt <= attachment.joinedAt) {
        members.set(attachment.peerId, attachment);
      }
    });

    return [...members.values()].map(({ peerId, sessionId, nickname }) => ({
      peerId,
      sessionId,
      nickname,
    }));
  }

  private send(socket: WebSocket, message: ServerMessage) {
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(message));
    }
  }

  private broadcast(message: ServerMessage, except?: WebSocket) {
    const encoded = JSON.stringify(message);
    this.ctx.getWebSockets('room').forEach((socket) => {
      if (socket !== except && socket.readyState === WebSocket.OPEN) {
        socket.send(encoded);
      }
    });
  }
}
