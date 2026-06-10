## Context

Users want a fast and private way to share files directly with one another without size constraints. WebRTC is the industry standard for this. `it-tools` currently lacks a P2P transfer tool. We will add a tool that leverages `peerjs` for easy signaling, along with file chunking to handle large files effectively in the browser.

## Goals / Non-Goals

**Goals:**
- Provide a tool to transfer files of arbitrary size directly between two browsers.
- Ensure end-to-end encryption (native to WebRTC).
- Support automatic signaling via `peerjs`.
- Support manual signaling as a fallback.
- Handle backpressure during file chunking to prevent memory bloat.

**Non-Goals:**
- Group file transfer (1-to-many).
- Persistent file hosting.
- Advanced file system directory transfer (only single/multiple discrete files).

## Decisions

- **Signaling Server:** We will use `peerjs` because it provides a free, simple signaling server and abstracts away the complexities of WebRTC SDP/ICE negotiation. A manual signaling mode (copy/paste text) will also be provided as a fallback.
- **File Chunking:** We will slice files using `Blob.slice()` into small chunks (e.g., 64KB). The sender will listen to the `RTCDataChannel`'s `bufferedAmount` to manage backpressure.
- **File Assembly:** The receiver will collect chunks in an array and use `new Blob(chunks)` followed by `URL.createObjectURL()` to trigger a download once all chunks are received.

## Risks / Trade-offs

- **Risk:** Large files might crash the browser if chunking is not properly throttled.
  **Mitigation:** Implement backpressure mechanism checking `bufferedAmount` and pausing transmission if it exceeds a threshold (e.g., 16MB).
- **Risk:** `peerjs` public server might be unstable or blocked in some networks.
  **Mitigation:** Provide a manual signaling fallback that relies purely on copy-pasting WebRTC SDP tokens.