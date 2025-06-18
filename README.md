
# ðŸ’³ CC Bot CF â€” Telegram CC Checker & Generator (Cloudflare Worker)

Bot Telegram yang memungkinkan Anda untuk generate dan mengecek validitas kartu kredit langsung di Telegram, dijalankan tanpa VPS menggunakan **Cloudflare Workers**.

---

## ðŸš€ Deploy Otomatis ke Cloudflare Workers

Klik tombol berikut untuk langsung deploy:

[![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/ghostinbyte/cc-bot-cf)

---

## ðŸ› ï¸ Deploy Manual (via Wrangler CLI)

### 1. Install Wrangler
```bash
npm install -g wrangler
```

### 2. Login ke Cloudflare
```bash
wrangler login
```

### 3. Clone Repository
```bash
git clone https://github.com/ghostinbyte/cc-bot-cf.git
cd cc-bot-cf
```

### 4. Buat file `wrangler.toml`
Contoh:
```toml
name = "cc-bot-cf"
main = "cc-bot.js"
compatibility_date = "2024-06-01"

[vars]
TELEGRAM_BOT_TOKEN = "ISI_TOKEN_BOT"
ADMIN_USER_ID = "123456789"
ADMIN_USERNAME = "username"
CHECK_CC_API_URL = "https://api.chkr.cc/"
```

### 5. Deploy ke Cloudflare
```bash
wrangler deploy
```

### 6. Set Webhook Telegram
```bash
curl -X POST "https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/setWebhook?url=https://<your-subdomain>.workers.dev/webhook"
```

---

## âš™ï¸ Variabel Lingkungan

| Nama Variabel          | Deskripsi                                      |
|------------------------|-----------------------------------------------|
| `TELEGRAM_BOT_TOKEN`   | Token bot dari BotFather                      |
| `ADMIN_USER_ID`        | ID Telegram Anda (angka)                      |
| `ADMIN_USERNAME`       | Username Telegram Anda (tanpa @)             |
| `CHECK_CC_API_URL`     | (Opsional) API checker eksternal (`https://api.chkr.cc/`) |

---

## ðŸ§ª Contoh Perintah

### ðŸ”¹ Generate Kartu Kredit
/generate 5
/generate 519505 5
/generate 519505 3 12 2025
/generate 519505 3 * * 123

### ðŸ”¹ Cek 1 Kartu Kredit
/check 4532123412341234|12|2026|123

### ðŸ”¹ Cek Banyak Sekaligus
/checkall
4532123412341234|12|2026|123
4556789012345678|01|2027|456

---

## ðŸ’¡ Fitur

- âœ… Validasi CC via API
- âœ… Auto-format hasil cek
- âœ… Opsi validasi manual atau langsung
- âœ… Mendukung CVV, Expiry, BIN custom
- âœ… Inline keyboard dan anti-spam (hanya admin yang diizinkan)

---

## ðŸ“ Lisensi

MIT License â€” Bebas digunakan dan dimodifikasi. Mohon tetap mencantumkan atribusi.

---

> âš ï¸ *Proyek ini hanya untuk edukasi dan testing. Dilarang digunakan untuk aktivitas ilegal.*
