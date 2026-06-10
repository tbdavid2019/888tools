## Why

Users often need a secure, fast, and unconstrained way to transfer files (especially large ones) directly between devices without relying on third-party cloud storage limits or exposing data to intermediary servers. A WebRTC-based P2P file transfer tool solves this by establishing direct, end-to-end encrypted connections.

## What Changes

- Add a new "P2P File Transfer" tool to the `network` category.
- Introduce `peerjs` as a dependency for simplified WebRTC signaling.
- Implement UI for choosing connection modes (PeerJS or manual signaling).
- Implement UI for role selection (Sender or Receiver).
- Implement file chunking (Blob.slice) for sending large files reliably.
- Implement progress tracking for both sending and sending/receiving.
- Implement file reassembly and automatic download on the receiver side.

## Capabilities

### New Capabilities
- `p2p-file-transfer`: Direct point-to-point file transfer using WebRTC data channels, supporting both automated (PeerJS) and manual signaling.

### Modified Capabilities

## Impact

- Adds `peerjs` package to the project dependencies.
- New tool component `src/tools/p2p-file-transfer/`.
- Updates `src/tools/index.ts` to register the new tool under the `network` category.
- New localized translation strings for the new tool in `locales/`.