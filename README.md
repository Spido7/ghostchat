# 👻 GhostChat // Serverless P2P Mesh

![Status](https://img.shields.io/badge/Status-Live-neon)
![Stack](https://img.shields.io/badge/Stack-Cloudflare%20Workers%20%2B%20WebRTC-cyan)
![Privacy](https://img.shields.io/badge/Privacy-End--to--End%20Encrypted-ff0099)

**GhostChat** is a decentralized, serverless communication suite designed for ephemeral, privacy-focused interaction. Built on **Cloudflare Workers** and **PeerJS**, it establishes direct P2P connections between users without storing messages on a central server.

The interface features a responsive **Cyberpunk/Neon Glassmorphism** design optimized for mobile and desktop.

---

## 🚀 Features

### 📡 Communication Modes
1.  **Public Lounge:** A global, ephemeral lobby capped at **15 users**.
2.  **Random 1:1:** Instantly matches two strangers for a private, direct conversation.
3.  **Private Mesh:** Create or join secure groups (Max **8 users**) using a 6-digit numeric key.

### 🛡️ Privacy & Security
* **Serverless Architecture:** No database stores your chats. The Cloudflare Worker only acts as a signaling switchboard.
* **P2P Encryption:** All messages flow directly between peers via WebRTC.
* **Soft Reset:** The application automatically purges local DOM memory every **30 minutes** to prevent data residue.

### 💎 Premium Utilities
* **File Sharing:** P2P file transfer (Max 50MB for files, 5MB for video). *Available in Private Groups.*
* **Voice Chat:** Real-time encrypted voice calls. *Available in Private Groups.*

---

## 🛠️ Tech Stack

* **Backend:** Cloudflare Workers (Signaling), KV Storage (Room Management).
* **Frontend:** Vanilla HTML5, CSS3, JavaScript (ES6+).
* **Networking:** PeerJS (WebRTC wrapper).
* **Monetization:** Adcash (Auto Tag) & Crypto Donations (OxaPay).

---

## ⚙️ Installation & Deployment

### Prerequisites
* [Node.js](https://nodejs.org/) installed.
* A Cloudflare account.
* [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/install-and-update/): `npm install -g wrangler`

### 1. Clone the Repository
```bash
git clone [https://github.com/Spido7/GhostChat.git](https://github.com/Spido7/GhostChat.git)
cd GhostChat
