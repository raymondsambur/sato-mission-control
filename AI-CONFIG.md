# 🤖 AI Agent & Developer Configuration

This file contains project-specific settings for AI agents and developers. Please respect these configurations.

## 🌐 Network Configuration

- **Host IP**: Use `192.168.0.106` instead of `localhost` when testing or accessing the server.
  - *Reason*: User is running via Tailscale/VPN and needs external IP access.

## 🚀 Environments

### Production (`master` branch)
- **Port**: `3000`
- **Command**: `npm start` (default)
- **URL**: `http://192.168.0.106:3000`

### Staging (`dev` branch)
- **Port**: `3001`
- **Command**: `PORT=3001 npm start`
- **URL**: `http://192.168.0.106:3001`

## 🛠 Project Structure
- Frontend assets are located in `public/css`, `public/js`, and `public/images`.
- Backend logic is in `server.js`.
- Local data (logs, ideas) is stored in the `WORKSPACE` directory (defaulting to `workspace/` locally if configured).
