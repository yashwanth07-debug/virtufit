# VirtuFit 👗✨

## 🌐 **Try it live: https://yashwanth07-debug.github.io/virtufit/**

**AI virtual try-on in your browser. No account. Nothing stored.**

Upload a selfie + a garment → get a realistic preview of you wearing it in ~20 seconds.
Powered by the **YouCam cloth-v3** virtual try-on API.

## 🔒 Privacy-first by design (no backend at all)

- **Zero backend** — pure static frontend. The only network call is the try-on request to the YouCam API (CORS-enabled, client key).
- **Nothing is stored** — images exist as in-memory blob URLs in your tab and are discarded the moment you close it. No database, no cookies.
- The result is yours: **download it** or **share it** via the OS share sheet.

## 🚀 Run it

```bash
npm ci
cp .env.example .env    # add your YouCam API key (optional — see below)
npm run dev             # http://localhost:5273
```

**No key? It still runs** in *demo mode* (a sample result replays the full flow, clearly labeled). Add a key to get real results:

1. Get a key: **https://yce.makeupar.com/api-console** (hackathon participants get 1,000 free units)
2. `VITE_YOUCAM_KEY=your-key` in `.env`
3. Restart — the app auto-switches from demo to real mode (badge shows "✨ YouCam AI")

## 🧱 How it works

```
You (photo) ─┐
             ├─► YouCam cloth-v3  ──► result (in-memory)
Garment ─────┘      (~2 units · ~15–30s)
```

- Person photo: front-facing, 3:4 works best, upper body visible
- Garment: single clean flat-lay product photo (or browse the built-in sample catalog)
- Results: **before/after compare**, **download**, **share**, seed control for variety

## ✨ Features

- 3-step flow: person photo → garment → run
- 12 sample person photos + 12 sample garment photos (try instantly, no uploads needed)
- Seed slider + random seed, "Seed used" / "Response" readouts
- Showcase gallery of person + garment → result pairs
- Fully responsive, works on phone & laptop

## 📦 Stack

React 18 + Vite + TypeScript · no other deps · deploys to GitHub Pages (auto-deploy on push).

## 🗂️ Files

```
virtufit/
├─ src/
│  ├─ App.tsx          # the whole product (3-step flow, seed, result)
│  ├─ tryon.ts         # provider adapter: YouCam (real) | mock (demo, no key)
│  ├─ main.tsx
│  └─ styles.css       # clean card design system
├─ public/assets/      # sample person/garment photos + showcase + demo result
├─ .env.example
└─ README.md
```
