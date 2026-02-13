# ClaudeStudio Server

Auth & sync server for ClaudeStudio desktop app.

## Quick Start (Dev)

```bash
cd server
npm install
npm run dev
```

Server runs on `http://localhost:3456`.

## Deploy (Linux + systemd)

```bash
# Build
cd server
npm install
npm run build

# Deploy (as root)
sudo bash deploy.sh
```

This will:
- Create a `claude-studio` system user
- Install to `/opt/claude-studio-server`
- Store data (SQLite + JWT secret) in `/var/lib/claude-studio`
- Install config to `/etc/claude-studio/server.env`
- Register and start a systemd service
- Install `cs-admin` CLI to `/usr/local/bin`

## Configuration

Edit `/etc/claude-studio/server.env`:

```env
# Server port
PORT=3456

# Data directory (SQLite database + JWT secret)
DATA_DIR=/var/lib/claude-studio

# Disable new user registration (set to true after creating your accounts)
DISABLE_REGISTRATION=false
```

Restart after changes: `sudo systemctl restart claude-studio-server`

## Manage Service

```bash
sudo systemctl status claude-studio-server
sudo systemctl restart claude-studio-server
sudo systemctl stop claude-studio-server
sudo journalctl -u claude-studio-server -f
```

## Admin CLI

After deploy, use `cs-admin` to manage users:

```bash
cs-admin users                                    # List all users
cs-admin user <email|username>                    # Show user details
cs-admin create <email> <username> <password>     # Create a user
cs-admin delete <email|username>                  # Delete a user
cs-admin reset-password <email|username> <pass>   # Reset password
```

In dev (server directory): `npm run admin -- users`

## Update

```bash
cd server
git pull
npm install
npm run build
sudo bash deploy.sh
```

## API

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/health` | No | Health check |
| POST | `/api/auth/register` | No | Register |
| POST | `/api/auth/login` | No | Login |
| GET | `/api/auth/validate` | Bearer | Validate token |
| POST | `/api/auth/logout` | Bearer | Logout |
| PUT | `/api/auth/profile` | Bearer | Update profile |
| GET | `/api/settings` | Bearer | Get user settings |
| PUT | `/api/settings` | Bearer | Set user setting |

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3456` | Server port |
| `DATA_DIR` | `~/.claude-studio` | Database & JWT secret location |
| `DISABLE_REGISTRATION` | `false` | Block new registrations |
