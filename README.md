
# Forex Trading Dashboard

Sebuah dashboard trading realtime built dengan Next.js + React + TypeScript yang menggabungkan chart interaktif (lightweight-charts), analisis teknikal otomatis, dan bot trading Python (FastAPI + CCXT). Proyek ini dibuat untuk eksperimen perdagangan algoritmik, visualisasi pasar, dan integrasi AI untuk analisis sentimen.

## Fitur Utama
- Chart candlestick realtime dengan overlays: supply/demand, market structure, trading levels
- Generator sinyal pintar menggabungkan multi-timeframe trend + zona + RRR
- Dual AI analysis: technical engine + KOL sentiment (fallback mock)
- Bot trading Python (FastAPI) untuk strategi, manajemen risiko, dan eksekusi (CCXT)
- Fallback robust untuk API eksternal (Binance, Gold APIs, KOL) supaya UI tetap berfungsi saat API mati

## Arsitektur Singkat
- Frontend: Next.js 15 (app router) + TypeScript + Tailwind CSS
- Charting: lightweight-charts v5
- Backend bot: Python (FastAPI) — terletak di folder `bot/`
- Services: API routes di `app/api/*`, library internal di `app/lib/`

## Quickstart (Development)

Syarat: Node.js, npm, Python 3.10+ (jika ingin menjalankan bot)

1. Install dependensi frontend

```bash
npm install
```

2. Jalankan Next.js (development)

```bash
npm run dev
# Buka http://localhost:3000
```

3. (Opsional) Jalankan bot Python

```bash
cd bot
python -m venv .venv
# Windows
.\.venv\Scripts\activate
pip install -r requirements.txt
python bot_api.py
```

## Struktur Folder Penting
- `app/components/chart` — chart dan hooks terkait
- `app/components/signal` — generator sinyal dan komponen UI
- `app/api/binance/klines` — route fallback untuk klines/ohlc
- `app/lib/kolAPI.ts` — integrasi KOL dengan fallback mock
- `bot/` — bot backend (strategy_engine.py, trade_executor.py, trading_bot.py, bot_api.py)

## Konfigurasi & Environment
- Frontend: tambahkan variabel di `.env.local` bila perlu, contoh:

```
NEXT_PUBLIC_BOT_API_URL=http://localhost:8000
```

- Bot (Python): konfigurasi API keys dan exchange credentials di `bot/.env` atau langsung ke `trade_executor.py` (ikuti README di folder `bot/`).

## Debugging & Tips
- Chart tidak update? cek konsol browser untuk log `useWebSocket` dan pastikan endpoint fallback tersedia.
- Bot tidak merespons? pastikan `bot_api.py` berjalan dan `NEXT_PUBLIC_BOT_API_URL` ter-set.
- XAUUSD (Gold): proyek menggunakan simulasi realistis ketika API spot komoditas tidak tersedia.

## Testing & Linting

```bash
npm run lint
npm run build
```

## Kontribusi
- Fork repo → buat branch fitur → buka pull request. Sertakan deskripsi singkat dan screenshot bila ada perubahan UI.

## Lisensi
Lisensi default belum ditentukan — tambahkan `LICENSE` jika ingin mempublikasikan.

## Kontak
Jika butuh bantuan integrasi lebih lanjut, kirim isu di GitHub atau hubungi pemilik repo.

---
_(README ini dihasilkan/dirapikan otomatis; silakan minta versi bahasa Inggris atau versi yang lebih teknis bila diperlukan.)_

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
