# 🏥 Klinik Lite OS

Sistem informasi klinik sederhana dengan React + Supabase.

## Tech Stack

- ⚡ **Vite** + React
- 🎨 **Tailwind CSS**
- 🔀 **React Router**
- 🗃️ **Zustand** (state management)
- 🔥 **Supabase** (PostgreSQL + Auth)

## Fitur

- 🔐 Login dengan Supabase Auth
- 📊 Dashboard (overview pasien & kunjungan hari ini)
- 👥 Data pasien (CRUD)
- 📝 EMR dengan format SOAP (Subjective, Objective, Assessment, Plan)
- 📅 Riwayat kunjungan pasien

## Setup

### 1. Clone & Install

```bash
cd klinik-lite-os
npm install
```

### 2. Setup Supabase

1. Buat project di [supabase.com](https://supabase.com)
2. Copy `supabase/schema.sql` ke SQL Editor dan run
3. Copy `.env.example` ke `.env` dan isi credentials

```bash
cp .env.example .env
```

### 3. Jalankan

```bash
npm run dev
```

## Struktur Folder

```
src/
├── components/    # Reusable UI (Button, Card, Input)
├── pages/         # Page components
├── stores/        # Zustand stores (auth, patients)
├── lib/           # Supabase client
├── layouts/       # Layout (Sidebar, MainLayout)
└── App.jsx        # Routes
```

## User Roles

- **admin** - Akses penuh
- **dokter** - Input pasien & kunjungan

## License

MIT"# klinik-lite-os" 
