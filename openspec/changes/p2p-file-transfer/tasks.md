## 1. Setup

- [x] 1.1 Add `peerjs` dependency using pnpm
- [x] 1.2 Create `src/tools/p2p-file-transfer/` directory and basic Vue component structure
- [x] 1.3 Register `p2p-file-transfer` in `src/tools/index.ts` under the `data` or `network` category (will use `network` per proposal)

## 2. Core UI Implementation

- [x] 2.1 Implement layout for choosing connection modes (PeerJS or Manual)
- [x] 2.2 Implement layout for selecting Role (Sender or Receiver)
- [x] 2.3 Implement file selection UI for the Sender
- [x] 2.4 Implement progress bar and status UI for both Sender and Receiver

## 3. WebRTC & PeerJS Integration

- [x] 3.1 Implement PeerJS automatic signaling (create room, generate ID, join room)
- [x] 3.2 Implement fallback manual signaling (copy-paste SDP/ICE)
- [x] 3.3 Set up `RTCDataChannel` connection and message event listeners

## 4. File Transfer Logic

- [x] 4.1 Implement `Blob.slice()` chunking logic for the Sender with backpressure control (monitoring `bufferedAmount`)
- [x] 4.2 Implement chunk reception logic for the Receiver
- [x] 4.3 Assemble received chunks into a `Blob` and trigger automatic file download (`URL.createObjectURL`)

## 5. Localization and Cleanup

- [x] 5.1 Add translation strings for the new tool in English and other supported locales
- [x] 5.2 Validate file transfer logic with small and large files