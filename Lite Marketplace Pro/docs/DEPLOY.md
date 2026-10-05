# Deploying

## Option 1: a VPS with Docker (full platform)

Any Linux server with 2 GB RAM works (Hetzner, DigitalOcean, Contabo, AWS Lightsail…).

1. **Point your domain** (for example `shop.example.com`) to the server's IP with an `A` record.
2. **Install Docker** on the server: `curl -fsSL https://get.docker.com | sh`
3. **Copy the project** to the server (git clone, or upload the folder).
4. **Create `.env`** from `.env.example` and set at least:

   ```env
   WEB_BASE_URL=https://shop.example.com
   CORS_ORIGINS=https://shop.example.com
   SECURE_COOKIES=true
   JWT_SECRET=<openssl rand -base64 48>
   AI_INTERNAL_KEY=<another long random string>
   DB_PASSWORD=<a strong password>
   PAYMENTS_DEMO_MODE=false
   DEMO_SEED=false
   ADMIN_EMAIL=you@example.com
   ADMIN_PASSWORD=<a strong password>
   WEB_PORT=8080
   ```

   With `DEMO_SEED=false`, the **first account that signs up becomes the admin**. Sign up yourself right after deploying.

5. **Add HTTPS** with [Caddy](https://caddyserver.com) in front of the website container. Install Caddy on the server and use this `/etc/caddy/Caddyfile`:

   ```
   shop.example.com {
       reverse_proxy localhost:8080
   }
   ```

   Caddy gets and renews the HTTPS certificate automatically.

6. **Start it**: `docker compose up -d --build`
7. Set the webhook URLs in your payment dashboards (see [PAYMENTS.md](PAYMENTS.md)).

### Updating

```bash
git pull            # or upload the new files
docker compose up -d --build
```

The database and uploaded photos live in Docker volumes (`pgdata`, `uploads`) and survive updates.

### Backups

```bash
docker compose exec db pg_dump -U litemarket litemarket > backup-$(date +%F).sql
docker run --rm -v litemarket_uploads:/u -v "$PWD":/b alpine tar czf /b/uploads-$(date +%F).tgz -C /u .
```

(The volume name starts with your folder name; `docker volume ls` shows it.)

## Option 2: a free live demo (website only)

Perfect for showing buyers. The whole app runs in the visitor's browser with sample data and simulated payments: no server, no cost.

```bash
cd web
npm install
npm run build:demo
```

Then drag the `web/dist` folder onto [Netlify Drop](https://app.netlify.com/drop). The `_redirects` file is already included so every page link works. Vercel and Cloudflare Pages work too (`vercel.json` included).

## Option 3: separate hosts

You can host the website (`npm run build`, any static host) and the API somewhere else. Then:

- set `VITE_API_URL=https://api.example.com` when building the website;
- set `CORS_ORIGINS=https://www.example.com` and `SECURE_COOKIES=true` on the API;
- the refresh cookie is `SameSite=Lax`, so the website and API must be on the **same site** (for example `www.example.com` and `api.example.com`). Different domains won't keep users logged in.

## Go-live checklist

- [ ] `JWT_SECRET`, `AI_INTERNAL_KEY`, `DB_PASSWORD`, `ADMIN_PASSWORD` changed to long random values
- [ ] `PAYMENTS_DEMO_MODE=false` and `DEMO_SEED=false`
- [ ] `WEB_BASE_URL` and `CORS_ORIGINS` are your real `https://` address, `SECURE_COOKIES=true`
- [ ] Live payment keys set and webhooks added (Admin → Overview shows them)
- [ ] One real low-value payment tested end to end (and refunded)
- [ ] Email configured (`MAIL_HOST`…) so password resets and order emails arrive
- [ ] Backups scheduled
- [ ] Your terms of service and privacy policy pages added and linked
