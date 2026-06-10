## ADDED Requirements

### Requirement: Connect to a Peer
The system SHALL allow a user to generate a connection ID (via PeerJS) or manually exchange signaling data to connect to another peer.

#### Scenario: PeerJS Connection
- **WHEN** user selects PeerJS mode and clicks "Create Room"
- **THEN** system generates a short ID and displays it for sharing

#### Scenario: PeerJS Join
- **WHEN** user enters a valid room ID and clicks "Join"
- **THEN** system establishes a direct WebRTC connection with the host

### Requirement: Send File
The system SHALL allow the sender to select a file and stream it in chunks to the receiver over WebRTC.

#### Scenario: File Selection and Chunking
- **WHEN** sender selects a file after connection is established
- **THEN** system reads the file, slices it into chunks, and transmits them sequentially, pausing if the WebRTC buffer is full

### Requirement: Receive File
The system SHALL receive file chunks, display progress, and assemble them into a downloadable file.

#### Scenario: File Reception
- **WHEN** receiver gets all chunks for a file
- **THEN** system triggers an automatic download of the assembled file and displays completion status