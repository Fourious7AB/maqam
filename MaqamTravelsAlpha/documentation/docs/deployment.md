---
sidebar_position: 6
---

# Production Deployment

This guide outlines the production deployment topology, reverse proxy configurations, and process management setup for the MaqamTravels stack.

## Architecture Topology

```
                  +--------------------------------+
                  |         Cloudflare DNS         |
                  +--------------------------------+
                     /                          \
          (Frontend Pages)                    (API Traffic)
                   /                              \
   +------------------------------+       +------------------------------+
   |  Cloudflare Pages Hosting    |       |   Ubuntu Linux VM Server     |
   |  (React SPA client bundles)  |       |  [Nginx Reverse Proxy & SSL] |
   +------------------------------+       +------------------------------+
                                                         |
                                                     (Reverse Proxy to localhost:5000)
                                                         |
                                                  +--------------+
                                                  |  PM2 cluster |
                                                  +--------------+
                                                         |
                                                  +--------------+
                                                  | MongoDB Atlas|
                                                  +--------------+
```

---

## 1. Backend Server Setup (Ubuntu Linux)

### Package Installation
Update local package lists and install Node.js, PM2, Nginx, and Certbot:
```bash
sudo apt update
sudo apt install -y curl git certbot python3-certbot-nginx nginx

# Install Node.js v20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install PM2 Process Manager globally
sudo npm install -g pm2
```

---

## 2. PM2 Cluster Setup

PM2 ensures the Node application runs in the background, clusters across multiple CPU cores, and restarts automatically on crash or server reboot.

### Create PM2 Ecosystem Configuration
Save the following configuration as `ecosystem.config.js` at the root of the project:
```javascript
module.exports = {
  apps: [{
    name: 'maqam-travels-api',
    script: 'server.js',
    instances: 'max', // Scale to all available CPU cores
    exec_mode: 'cluster', // Cluster mode for load balancing
    env_production: {
      NODE_ENV: 'production',
      PORT: 5000
    }
  }]
};
```

### Start the PM2 Application
```bash
pm2 start ecosystem.config.js --env production

# Ensure PM2 starts on server boot
pm2 startup
pm2 save
```

---

## 3. Nginx Reverse Proxy & SSL Setup

Nginx is used as the frontend reverse proxy, routing incoming port 80/443 traffic to our local port 5000 PM2 instances.

### Configure Nginx Server Block
Create a configuration file at `/etc/nginx/sites-available/api.maqamtravels.com`:
```nginx
server {
    listen 80;
    server_name api.maqamtravels.com;

    # Redirect all HTTP traffic to HTTPS
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.maqamtravels.com;

    # SSL Certificates (managed by Certbot)
    ssl_certificate /etc/letsencrypt/live/api.maqamtravels.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.maqamtravels.com/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### Enable Site and Restart Nginx
```bash
sudo ln -s /etc/nginx/sites-available/api.maqamtravels.com /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### SSL Certificates (Let's Encrypt Certbot)
Request SSL certificates automatically using Certbot:
```bash
sudo certbot --nginx -d api.maqamtravels.com
```

---

## 4. Frontend Deployment (Cloudflare Pages)

1. Connect the frontend Git repository to Cloudflare Pages.
2. Select **Vite / React** preset.
3. Configure build settings:
   * **Build Command:** `npm run build`
   * **Build Directory:** `dist`
4. Set Environment Variables:
   * `VITE_API_URL=https://api.maqamtravels.com/api/v1`
5. Configure custom domain redirects. Cloudflare handles Edge SSL automatically.
