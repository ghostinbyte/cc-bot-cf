# 💳 CC Bot CF — Telegram CC Checker & Generator (Cloudflare Worker)

Bot Telegram yang bisa generate & cek validitas kartu kredit langsung dari Telegram. Dirancang untuk berjalan di Cloudflare Workers tanpa VPS atau hosting tambahan.

---

## 🚀 Cara Deploy Manual (Disarankan)

Karena tombol deploy otomatis Cloudflare saat ini hanya mendukung proyek berbasis `package.json`, Anda bisa mengikuti langkah manual berikut untuk menjalankan bot ini:

### 📌 Langkah Manual via Dashboard Cloudflare

1. Masuk ke [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Buka **Workers & Pages → Create Application → Create Worker**
3. Hapus kode default, lalu **copy-paste isi file `cc-bot.js`** ke editor
4. Klik **Save and Deploy**
5. Setelah itu, buka tab **Settings → Variables**, lalu tambahkan variabel berikut:

| Nama Variabel          | Contoh Nilai                     |
|------------------------|----------------------------------|
| `TELEGRAM_BOT_TOKEN`   | `123456:ABCdefGhiJKLmnopQRsTUvW` |
| `ADMIN_USER_ID`        | `123456789`                      |
| `ADMIN_USERNAME`       | `yourusername`                   |
| `CHECK_CC_API_URL`     | `https://api.chkr.cc/` *(opsional)* |

6. Set webhook bot Telegram:
```bash
curl -X POST "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook?url=https://<your-subdomain>.workers.dev/webhook"
```


---

🌐 Cara Mengaktifkan Bot / Set Webhook via Browser (Tanpa Terminal)

Untuk menghubungkan bot Telegram Anda ke Cloudflare Worker tanpa menggunakan terminal, ikuti langkah berikut:

1. Dapatkan token bot Anda dari BotFather


2. Ganti <YOUR_BOT_TOKEN> dengan token tersebut


3. Ganti <your-subdomain> dengan subdomain Worker kamu di Cloudflare (misalnya: cc-bot-cf.username.workers.dev)


4. Buka link berikut di browser Anda:


```bash
https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook?url=https://<your-subdomain>.workers.dev/webhook
```

✅ Jika berhasil, Browser akan menampilkan respon seperti ini:

```bash
{
  "ok": true,
  "result": true,
  "description": "Webhook was set"
}
```

📌 Anda hanya perlu membuka link ini satu kali setiap kali deploy ulang Worker, atau saat pertama kali menghubungkan bot.


---

🧪 Contoh Perintah Telegram

/generate 5 — Generate 5 kartu random (BIN acak)

/generate 519505 5 — Generate 5 kartu dari BIN 519505

/check 4532123412341234|12|2026|123 — Cek 1 kartu

/checkall lalu kirim banyak kartu dalam format:

4532xxxxxxxxxxxx|12|2025|123
5555xxxxxxxxxxxx|01|2027|456



---

🧰 Fitur

✅ Generate kartu dengan BIN custom & random

✅ Cek validitas kartu (terintegrasi API checker)

✅ Inline keyboard (copy ID, validasi, dsb)

✅ Hanya admin yang bisa pakai bot


---

> ⚠️ Disclaimer: Bot ini hanya untuk tujuan edukasi. Jangan gunakan untuk aktivitas ilegal.
