# CribNotes — Server Access & Deployment

## Infrastructure Overview

| Role | VM Name | Proxmox VM ID | Local IP | Tailscale IP | RAM | Disk |
|------|---------|---------------|----------|-------------|-----|------|
| App Server | nightwatch-app | 120 | 192.168.68.120 | 100.93.184.108 | 4 GB | 40 GB |
| Database Server | nightwatch-data | 121 | 192.168.68.121 | — (pending auth) | 2 GB | 60 GB |

> VM names retain the original `nightwatch-*` Proxmox identifiers from when the project was named NightWatch. The application, repo, and runtime have been renamed to **CribNotes**; renaming the VMs would be cosmetic-only and require a Proxmox-level rename.

## SSH Access

```bash
# App server
ssh -i ~/.ssh/proxmox_key ubuntu@192.168.68.120

# Database server
ssh -i ~/.ssh/proxmox_key ubuntu@192.168.68.121

# Proxmox host
ssh -i ~/.ssh/proxmox_key root@192.168.68.50
```

SSH key location: `~/.ssh/proxmox_key`

## Application Stack

- **Runtime**: Node.js 20.x (managed via PM2)
- **Framework**: Next.js 14 (App Router)
- **Database**: PostgreSQL 16 on `192.168.68.121:5432`
- **Reverse Proxy**: nginx on port 80 → localhost:3000
- **Process Manager**: PM2 (auto-restart on reboot via systemd)
- **PM2 process name**: `cribnotes`

## Application Layout on App Server

| Path | Purpose |
|------|---------|
| `/home/ubuntu/cribnotes-repo/` | Git checkout of `CribNotes.git` (source of truth for pulls) |
| `/home/ubuntu/cribnotes/` | Live working directory (synced from `cribnotes-repo`, contains `.env`, `node_modules`, `.next`) |

The live directory is **not** a git repo — it's an rsync of `cribnotes-repo/cribnotes/`. `.env`, `node_modules`, and `.next` are persistent and excluded from sync.

## Database

| Parameter | Value |
|-----------|-------|
| Host | `192.168.68.121` |
| Port | `5432` |
| Database | `nightwatch` |

> The Postgres database name is still `nightwatch` (legacy). Renaming would require a coordinated dump/restore + `.env` update; not currently planned.

Credentials live in `/home/ubuntu/cribnotes/.env` (`DATABASE_URL`). PostgreSQL is configured to accept connections from `192.168.68.0/24`.

## Application URLs

- **Public**: `https://cribnotes.baby` (canonical; `NEXTAUTH_URL` and `NEXT_PUBLIC_APP_URL`)
- **Direct on VM**: `http://192.168.68.120:3000`
- **Via nginx**: `http://192.168.68.120` (port 80)

> HTTPS termination for `cribnotes.baby` is **not** done by the local nginx (the nginx block below only listens on :80). Confirm the public termination path (Cloudflare tunnel, external reverse proxy, certbot, etc.) before assuming TLS behavior.

## PM2 Commands

```bash
pm2 status                    # Check process status
pm2 logs cribnotes            # View logs
pm2 logs cribnotes --err      # Errors only
pm2 restart cribnotes         # Restart app
pm2 stop cribnotes            # Stop app
pm2 start npm --name "cribnotes" -- run start   # Start app from scratch
```

## Deployment

The standard redeploy is a fast-forward pull + rsync. It is non-destructive: it preserves `.env`, `node_modules`, and `.next`, and never re-clones the repo.

```bash
ssh -i ~/.ssh/proxmox_key ubuntu@192.168.68.120 'set -e
  cd /home/ubuntu/cribnotes-repo
  git pull --ff-only origin main

  rsync -a \
    --exclude=.env \
    --exclude=.env.local \
    --exclude=node_modules \
    --exclude=.next \
    /home/ubuntu/cribnotes-repo/cribnotes/ /home/ubuntu/cribnotes/

  cd /home/ubuntu/cribnotes
  # Run npm install only when package-lock.json changed
  # Run npx prisma generate / db push only when prisma/schema.prisma changed
  npm run build
  pm2 restart cribnotes
'
```

After deploy, verify with `pm2 logs cribnotes --err --lines 20 --nostream` and `curl -I http://127.0.0.1:3000/login`.

### First-time setup / disaster recovery

If `/home/ubuntu/cribnotes-repo` does not exist (fresh VM) or the live tree is corrupted:

```bash
ssh -i ~/.ssh/proxmox_key ubuntu@192.168.68.120
cd /home/ubuntu
git clone https://github.com/wardethan2000-eng/CribNotes.git cribnotes-repo
mkdir -p cribnotes
rsync -a cribnotes-repo/cribnotes/ cribnotes/

# Create .env (only if it does not already exist — never overwrite a live .env)
cat > cribnotes/.env <<'EOF'
DATABASE_URL="postgresql://<user>:<pass>@192.168.68.121:5432/nightwatch"
NEXTAUTH_SECRET="<generate with: openssl rand -hex 32>"
NEXTAUTH_URL="https://cribnotes.baby"
NEXT_PUBLIC_APP_URL="https://cribnotes.baby"
NEXT_PUBLIC_APP_NAME="CribNotes"
RESEND_API_KEY="<real key>"
RESEND_FROM_EMAIL="noreply@cribnotes.baby"
EOF

cd cribnotes
npm install
npx prisma generate
npx prisma db push
npm run build
pm2 start npm --name "cribnotes" -- run start
pm2 save
```

> ⚠️  Rotating `NEXTAUTH_SECRET` invalidates every active session cookie. Until each affected browser logs in again, Auth.js will log a `JWTSessionError: no matching decryption secret` on every request from that browser. The user is correctly redirected to `/login`; the log line itself is suppressed in `src/lib/auth.ts` to avoid spam.

## Nginx Config

Located at `/etc/nginx/sites-available/cribnotes` on the app server:

```nginx
server {
    listen 80;
    server_name cribnotes.baby 192.168.68.120;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
}
```

Enabled via: `/etc/nginx/sites-enabled/cribnotes` (symlink). Verify the actual file paths on the VM — the nginx config may still live at the old `nightwatch` filename.

## Proxmox VM Configuration

VMs created via Proxmox cloud-init with Ubuntu 22.04 cloud image.

```bash
# List VMs on Proxmox host
ssh -i ~/.ssh/proxmox_key root@192.168.68.50 'qm list'

# Console into VM
ssh -i ~/.ssh/proxmox_key root@192.168.68.50 'qm terminal 120'
```

## Other Homelab VMs (do not modify)

| VM ID | Name | IP | Purpose |
|-------|------|----|---------|
| 102 | homeassistant | 192.168.68.102 | Home Assistant |
| 110 | familytree-app | 192.168.68.110 | Tessera app server |
| 111 | familytree-data | 192.168.68.111 | Tessera database |

## Environment Variables

| Variable | Value | Notes |
|----------|-------|-------|
| `DATABASE_URL` | `postgresql://<user>:<pass>@192.168.68.121:5432/nightwatch` | PostgreSQL connection (db name still `nightwatch`) |
| `NEXTAUTH_SECRET` | (generated) | `openssl rand -hex 32`. Rotating invalidates existing sessions. |
| `NEXTAUTH_URL` | `https://cribnotes.baby` | Base URL |
| `NEXT_PUBLIC_APP_URL` | `https://cribnotes.baby` | Client-side URL |
| `NEXT_PUBLIC_APP_NAME` | `CribNotes` | App display name |
| `RESEND_API_KEY` | (real key required) | Email verification, password reset, invites |
| `RESEND_FROM_EMAIL` | `noreply@cribnotes.baby` | Resend sender |

## Known Limitations

- **HTTPS termination**: Public TLS for `cribnotes.baby` is handled outside the local nginx. Document the actual termination path here once confirmed.
- **Tailscale**: App VM joined (100.93.184.108). Data VM not yet joined.
