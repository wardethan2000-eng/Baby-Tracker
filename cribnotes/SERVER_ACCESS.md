# NightWatch — Server Access & Deployment

## Infrastructure Overview

| Role | VM Name | Proxmox VM ID | Local IP | Tailscale IP | RAM | Disk |
|------|---------|---------------|----------|-------------|-----|------|
| App Server | nightwatch-app | 120 | 192.168.68.120 | 100.93.184.108 | 4 GB | 40 GB |
| Database Server | nightwatch-data | 121 | 192.168.68.121 | — (pending auth) | 2 GB | 60 GB |

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

## Database

| Parameter | Value |
|-----------|-------|
| Host | `192.168.68.121` |
| Port | `5432` |
| Database | `nightwatch` |
| User | `nightwatch` |
| Password | `nightwatch` |
| Connection string | `postgresql://nightwatch:nightwatch@192.168.68.121:5432/nightwatch` |

PostgreSQL is configured to accept connections from `192.168.68.0/24`.

## Application URLs

- **Direct**: `http://192.168.68.120:3000`
- **Via nginx**: `http://192.168.68.120` (port 80)
- **Hostname**: `http://nightwatch.local` (add to DNS or `/etc/hosts`)

## PM2 Commands

```bash
pm2 status                    # Check process status
pm2 logs nightwatch           # View logs
pm2 restart nightwatch        # Restart app
pm2 stop nightwatch           # Stop app
pm2 start npm --name "nightwatch" -- run start   # Start app
```

## Deployment (from GitHub)

```bash
ssh -i ~/.ssh/proxmox_key ubuntu@192.168.68.120

# Quick redeploy
cd /home/ubuntu
rm -rf nightwatch-repo
git clone https://github.com/wardethan2000-eng/Baby-Tracker.git nightwatch-repo
rm -rf nightwatch
cp -r nightwatch-repo/nightwatch nightwatch
cd nightwatch

# Restore .env (create if needed)
cat > .env <<EOF
DATABASE_URL="postgresql://nightwatch:nightwatch@192.168.68.121:5432/nightwatch"
NEXTAUTH_SECRET="<generate with: openssl rand -hex 32>"
NEXTAUTH_URL="http://nightwatch.local"
RESEND_API_KEY="re_placeholder"
RESEND_FROM_EMAIL="noreply@nightwatch.local"
NEXT_PUBLIC_APP_URL="http://nightwatch.local"
NEXT_PUBLIC_APP_NAME="NightWatch"
EOF

npm install --production=false
npx prisma generate
npx prisma db push
npm run build
pm2 restart nightwatch
```

## Nginx Config

Located at `/etc/nginx/sites-available/nightwatch` on the app server:

```nginx
server {
    listen 80;
    server_name nightwatch.local;

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

Enabled via: `/etc/nginx/sites-enabled/nightwatch` (symlink)

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
| `DATABASE_URL` | `postgresql://nightwatch:nightwatch@192.168.68.121:5432/nightwatch` | PostgreSQL connection |
| `NEXTAUTH_SECRET` | (generated) | Run `openssl rand -hex 32` |
| `NEXTAUTH_URL` | `http://nightwatch.local` | Base URL |
| `RESEND_API_KEY` | `re_placeholder` | Needs real Resend key for email |
| `RESEND_FROM_EMAIL` | `noreply@nightwatch.local` | Needs real domain |
| `NEXT_PUBLIC_APP_URL` | `http://nightwatch.local` | Client-side URL |
| `NEXT_PUBLIC_APP_NAME` | `NightWatch` | App display name |

## Known Limitations

- **Email**: Resend API key is a placeholder. Email verification, password reset, and invite emails will not work until a real key and domain are configured.
- **HTTPS**: No TLS configured. Consider adding Let's Encrypt via certbot or a Cloudflare tunnel for public access.
- **Tailscale**: App VM joined (100.93.184.108). Data VM not yet joined.