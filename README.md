<div align="center">

<br />

```
██████╗ ██╗   ██╗██████╗  █████╗ ██╗  ██╗
██╔══██╗██║   ██║██╔══██╗██╔══██╗██║ ██╔╝
██║  ██║██║   ██║██████╔╝███████║█████╔╝ 
██║  ██║██║   ██║██╔══██╗██╔══██║██╔═██╗ 
██████╔╝╚██████╔╝██║  ██║██║  ██║██║  ██╗
╚═════╝  ╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═╝
```

**A Discord-inspired voice & chat client built with Tauri, React and WebRTC.**

[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tauri](https://img.shields.io/badge/Tauri-2.x-FFC131?style=flat-square&logo=tauri&logoColor=black)](https://tauri.app/)
[![Rust](https://img.shields.io/badge/Rust-1.x-CE422B?style=flat-square&logo=rust&logoColor=white)](https://www.rust-lang.org/)
[![React](https://img.shields.io/badge/React-18.x-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev/)
[![License](https://img.shields.io/badge/license-AGPLv3-22c55e?style=flat-square)](LICENSE)

</div>

---

## Overview

**Durak** is a fully-featured real-time voice and text communication desktop application. Built on top of [Tauri](https://tauri.app/) for a native shell and a Rust WebSocket server for signaling, it uses browser-native **WebRTC** for encrypted peer-to-peer audio — no third-party STUN or TURN infrastructure required beyond Google's public STUN servers.

---

## Features

| | Feature |
|---|---|
| 🎙️ | **Real-time voice channels** — WebRTC P2P audio with DTLS/SRTP encryption |
| 💬 | **Text chat** — per-room live chat with Discord-style grouped messages |
| 🖥️ | **Server management** — create your own servers with text & voice channels |
| 👥 | **Presence** — see who joined / left a channel in real time |
| 🤝 | **Friends list** — add friends by username, manage your list |
| 🖱️ | **User context menu** — right-click any avatar: mute, add friend, copy ID |
| 🔇 | **Functional mute/deafen** — instantly silences the microphone track |
| 🎛️ | **Audio settings** — noise suppression, echo cancellation, auto-gain, volume slider |
| 🗣️ | **Voice activity detection** — avatar ring pulses when you speak |
| 🔒 | **End-to-end encrypted** — DTLS/SRTP by default via WebRTC |

---

## Tech Stack

```
Frontend        Tauri + React 18 + TypeScript
State           Zustand (with persist middleware)
Styling         Tailwind CSS + custom design system
Animation       Framer Motion
Icons           Lucide React
Audio/Video     Web Audio API + WebRTC
Backend         Rust (Axum + Tokio) — WebSocket signaling server
```

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                      Tauri Shell                        │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────┐ │
│  │  ServerBar   │  │   Sidebar    │  │   Main Area   │ │
│  │  (72px)      │  │   (240px)    │  │   (flex-1)    │ │
│  │              │  │  ·channels   │  │  ·VoiceRoom   │ │
│  │  ·server     │  │  ·voice      │  │  ·FriendsPanel│ │
│  │   icons      │  │   members    │  │  ·ChatPanel   │ │
│  └──────────────┘  └──────────────┘  └───────────────┘ │
└─────────────────────────────────────────────────────────┘
         │                                     │
         ▼                                     ▼
  Zustand Store                    WebSocket (ws://127.0.0.1:3001)
  (persisted)                      Rust / Axum signaling server
                                           │
                              ┌────────────┴────────────┐
                              ▼                         ▼
                     RTCPeerConnection           RTCPeerConnection
                      (P2P audio E2EE)           (P2P audio E2EE)
```

### WebSocket Message Flow

```
Client ──Identify──────────────────► Server
Client ◄──Identified────────────────
Client ──JoinRoom──────────────────► Server
Client ◄──RoomUsers─────────────────     (existing members)
Client ◄──UserJoined────────────────     (other joins)
Client ──Offer / Answer / ICE──────► Server ──► Target
Client ──ChatMessage───────────────► Server ──► (broadcast room)
Client ──LeaveRoom─────────────────► Server
Client ◄──UserLeft──────────────────
```

---

## Getting Started

### Prerequisites

| Tool | Version |
|---|---|
| Node.js | ≥ 20 |
| Rust | stable |
| Tauri CLI | v2 |

```bash
# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Install Tauri CLI
cargo install tauri-cli --version "^2"
```

### Installation

```bash
# Clone
git clone https://github.com/krutoychel24/discord-like-app.git
cd discord-like-app

# Install dependencies
npm install
```

### Development

```bash
npm run tauri dev
```

This starts the Vite dev server **and** the Rust WebSocket signaling server on `ws://127.0.0.1:3001`.

### Production Build

```bash
npm run tauri build
```

Output installers are in `src-tauri/target/release/bundle/`.

---

## Project Structure

```
discord-like-app/
├── src/
│   ├── components/
│   │   ├── ServerBar.tsx        # Left server icon column
│   │   ├── Sidebar.tsx          # Channels + voice member list
│   │   ├── VoiceRoom.tsx        # Voice channel main view
│   │   ├── ChatPanel.tsx        # Text chat sidebar
│   │   ├── FriendsPanel.tsx     # Friends management
│   │   ├── UserContextMenu.tsx  # Right-click context menu
│   │   ├── Settings.tsx         # Audio & account settings
│   │   └── Login.tsx            # Nickname entry
│   ├── hooks/
│   │   └── useWebRTC.ts         # WebRTC + WebSocket hook
│   ├── store/
│   │   └── useAppStore.ts       # Zustand global state
│   └── utils/
│       └── animations.ts        # Shared Framer Motion configs
├── src-tauri/
│   ├── src/
│   │   └── lib.rs               # Rust WebSocket signaling server
│   └── tauri.conf.json
├── .gitignore
└── README.md
```

---

## Security

- All voice communication is **end-to-end encrypted** via DTLS 1.3 + SRTP (standard WebRTC stack).
- The Rust signaling server is **relay-only** — it never touches audio data.
- No telemetry, no analytics, no external services beyond Google STUN.

---

## Roadmap

- [ ] Telegram authentication
- [ ] Server roles & permissions
- [ ] Screen sharing
- [ ] Video calls
- [ ] Push notifications (Tauri v2 plugin)
- [ ] Self-hosted TURN server support
- [ ] RNNoise-based noise suppression

---

## Contributing

Pull requests are welcome. For major changes, open an issue first.

```bash
# Create a feature branch
git checkout -b feat/your-feature

# Commit with a conventional message
git commit -m "feat: add screen sharing"

# Push and open a PR
git push origin feat/your-feature
```

---

## License

AGPL-3.0 © 2026 [krutoychel24](https://github.com/krutoychel24)
