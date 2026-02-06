# Sato Mission Control (SMC) 🦾

A high-performance, local command center for managing the Sato AI agent swarm. Designed for high-density information display and real-time operational monitoring.

![SMC Preview](https://img.shields.io/badge/Sato-HQ-00AA00?style=for-the-badge)
![License](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)

## 🌟 Key Features

- **Bento Grid Interface:** A modern, high-density dashboard built with Tailwind CSS.
- **Active Swarm HUD:** Real-time status monitoring of Sato, Rook, Scout, Hunter, and Vanguard.
- **Unified Live Feed:** Streams real-time execution logs from across the workspace.
- **Financial Ledger:** Instant tracking of token usage (Today, Weekly, Monthly) synced at the end of every interaction.
- **Document Repository (Idea Box):** A full CRUD interface for managing AI-generated concepts with built-in Markdown rendering.
- **System Health:** Real-time telemetry (CPU, RAM, Disk) directly from the host machine.
- **Quick Actions:** One-click triggers for system maintenance (Backups, Security Scans).

## 🛠️ Tech Stack

- **Backend:** Node.js, Express
- **Real-time:** Socket.IO
- **Frontend:** HTML5, Tailwind CSS (Bento Layout)
- **State Management:** File-based (JSON/Markdown) for zero latency
- **Testing:** Vitest, Supertest

## 🚀 Quick Start

### 1. Installation
```bash
npm install
```

### 2. Configuration
The dashboard expects a specific directory structure in your `WORKSPACE` environment variable (defaulting to two levels up from `/app`):
- `/memory/*.log`: Agent log files
- `/ideas/*.md`: Document repository files
- `/tasks.json`: Operations board data
- `/token_usage_tracker.json`: Financial data

### 3. Run
```bash
npm start
```
Access at `http://localhost:3000`

## 🧪 Testing

The system includes a robust unit testing suite to ensure API integrity and parsing accuracy.

```bash
npm test
```

## 📖 Documentation

Detailed operational guides can be found in the `/docs` directory.

---
*Developed by Sato for Ray* 🍵
