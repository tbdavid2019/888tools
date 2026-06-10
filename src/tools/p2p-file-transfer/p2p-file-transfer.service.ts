import Peer, { DataConnection } from 'peerjs';

export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error';
export type Role = 'sender' | 'receiver';

export class P2PService {
  private peer: Peer | null = null;
  private connection: DataConnection | null = null;
  private manualConnection: RTCPeerConnection | null = null;
  private dataChannel: RTCDataChannel | null = null;

  public state: import('vue').Ref<ConnectionState>;
  public peerId: import('vue').Ref<string>;
  public remotePeerId: import('vue').Ref<string>;
  
  public onDataReceived: ((data: ArrayBuffer) => void) | null = null;
  public onFileMetadata: ((metadata: { name: string, size: number, type: string }) => void) | null = null;
  public onTransferComplete: (() => void) | null = null;
  public onDataChannelOpen: (() => void) | null = null;

  constructor(private vueRef: typeof import('vue').ref) {
    this.state = vueRef('disconnected');
    this.peerId = vueRef('');
    this.remotePeerId = vueRef('');
  }

  // --- PeerJS Methods ---

  public initPeerJS(role: Role) {
    this.state.value = 'connecting';
    this.peer = new Peer();

    this.peer.on('open', (id) => {
      this.peerId.value = id;
      if (role === 'receiver') {
        this.state.value = 'disconnected'; // Waiting for connection
      }
    });

    this.peer.on('connection', (conn) => {
      if (role === 'receiver') {
        this.setupDataConnection(conn);
      }
    });

    this.peer.on('error', (err) => {
      console.error('PeerJS error:', err);
      this.state.value = 'error';
    });
  }

  public connectToPeer(id: string) {
    if (!this.peer) return;
    this.state.value = 'connecting';
    const conn = this.peer.connect(id);
    this.setupDataConnection(conn);
  }

  private setupDataConnection(conn: DataConnection) {
    this.connection = conn;
    conn.on('open', () => {
      this.state.value = 'connected';
      this.remotePeerId.value = conn.peer;
      if (this.onDataChannelOpen) this.onDataChannelOpen();
    });

    conn.on('data', (data: any) => {
      if (data && data.type === 'metadata') {
        if (this.onFileMetadata) this.onFileMetadata(data.metadata);
      } else if (data && data.type === 'complete') {
        if (this.onTransferComplete) this.onTransferComplete();
      } else if (data instanceof ArrayBuffer || data instanceof Uint8Array) {
        if (this.onDataReceived) this.onDataReceived(data as ArrayBuffer);
      }
    });

    conn.on('close', () => {
      this.state.value = 'disconnected';
    });
  }

  // --- Manual Signaling Methods ---

  public async initManual(role: Role) {
    this.state.value = 'disconnected';
    this.manualConnection = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
    });

    this.manualConnection.onicecandidate = (event) => {
      if (event.candidate) {
        // Handle new ICE candidate (In manual, we usually wait for gathering to complete to copy the full SDP with ICE)
      }
    };

    if (role === 'sender') {
      this.dataChannel = this.manualConnection.createDataChannel('fileTransfer');
      this.setupManualDataChannel();
    } else {
      this.manualConnection.ondatachannel = (event) => {
        this.dataChannel = event.channel;
        this.setupManualDataChannel();
      };
    }
  }

  private setupManualDataChannel() {
    if (!this.dataChannel) return;

    this.dataChannel.binaryType = 'arraybuffer';

    this.dataChannel.onopen = () => {
      this.state.value = 'connected';
      if (this.onDataChannelOpen) this.onDataChannelOpen();
    };

    this.dataChannel.onmessage = (event) => {
      const data = event.data;
      if (typeof data === 'string') {
        const parsed = JSON.parse(data);
        if (parsed.type === 'metadata' && this.onFileMetadata) {
          this.onFileMetadata(parsed.metadata);
        } else if (parsed.type === 'complete' && this.onTransferComplete) {
          this.onTransferComplete();
        }
      } else if (data instanceof ArrayBuffer) {
        if (this.onDataReceived) this.onDataReceived(data);
      }
    };

    this.dataChannel.onclose = () => {
      this.state.value = 'disconnected';
    };
  }

  public async createOffer(): Promise<string> {
    if (!this.manualConnection) throw new Error('No connection');
    const offer = await this.manualConnection.createOffer();
    await this.manualConnection.setLocalDescription(offer);
    
    // Wait for ICE gathering
    return new Promise((resolve) => {
      if (this.manualConnection!.iceGatheringState === 'complete') {
        resolve(JSON.stringify(this.manualConnection!.localDescription));
      } else {
        this.manualConnection!.onicegatheringstatechange = () => {
          if (this.manualConnection!.iceGatheringState === 'complete') {
            resolve(JSON.stringify(this.manualConnection!.localDescription));
          }
        };
      }
    });
  }

  public async acceptOfferAndCreateAnswer(offerStr: string): Promise<string> {
    if (!this.manualConnection) throw new Error('No connection');
    const offer = JSON.parse(offerStr);
    await this.manualConnection.setRemoteDescription(offer);
    const answer = await this.manualConnection.createAnswer();
    await this.manualConnection.setLocalDescription(answer);

    // Wait for ICE gathering
    return new Promise((resolve) => {
      if (this.manualConnection!.iceGatheringState === 'complete') {
        resolve(JSON.stringify(this.manualConnection!.localDescription));
      } else {
        this.manualConnection!.onicegatheringstatechange = () => {
          if (this.manualConnection!.iceGatheringState === 'complete') {
            resolve(JSON.stringify(this.manualConnection!.localDescription));
          }
        };
      }
    });
  }

  public async acceptAnswer(answerStr: string) {
    if (!this.manualConnection) throw new Error('No connection');
    const answer = JSON.parse(answerStr);
    await this.manualConnection.setRemoteDescription(answer);
  }

  // --- Common Transfer Methods ---

  public sendData(data: any) {
    if (this.connection) {
      this.connection.send(data);
    } else if (this.dataChannel && this.dataChannel.readyState === 'open') {
      if (data instanceof ArrayBuffer || data instanceof Blob) {
        this.dataChannel.send(data as any);
      } else {
        this.dataChannel.send(JSON.stringify(data));
      }
    }
  }

  public get bufferedAmount(): number {
    if (this.connection && this.connection.dataChannel) {
      return this.connection.dataChannel.bufferedAmount;
    }
    if (this.dataChannel) {
      return this.dataChannel.bufferedAmount;
    }
    return 0;
  }

  public destroy() {
    if (this.connection) this.connection.close();
    if (this.peer) this.peer.destroy();
    if (this.dataChannel) this.dataChannel.close();
    if (this.manualConnection) this.manualConnection.close();
  }
}
