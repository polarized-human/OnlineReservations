# 🏛️ E-Reservasi Jakarta Timur v2.0

![Status](https://img.shields.io/badge/Status-Production-success?style=for-the-badge&logo=github)
![Framework](https://img.shields.io/badge/Framework-Next.js%2015-black?style=for-the-badge&logo=nextdotjs)
![Backend](https://img.shields.io/badge/Backend-Laravel%2011-FF2D20?style=for-the-badge&logo=laravel&logoColor=white)
![UI](https://img.shields.io/badge/UI-Aero%20Glass-pink?style=for-the-badge&logo=tailwindcss)

---

### ✨ "Modernisasi Layanan & Efisiensi Fasilitas Gedung Pemerintahan"

**E-Reservasi** adalah platform manajemen penjadwalan ruang rapat terintegrasi yang dikembangkan khusus untuk lingkungan **Kantor Walikota Administrasi Jakarta Timur**. Proyek ini mengedepankan estetika **Aero Glass Light Theme** yang mewah namun tetap fungsional dan responsif.

<!--
📸 Tambahkan screenshot di sini agar reviewer langsung bisa melihat hasil kerja kamu.
Contoh:
![Dashboard Preview](./FotoDemo/dashboard.png)
![Booking Page](./FotoDemo/booking.png)
-->

---

## 🚀 Fitur Utama (Core Features)

- 📊 **Executive Dashboard:** Visualisasi metrik reservasi bulanan, status *real-time*, dan jadwal harian dalam satu layar.
- 🎨 **Aero Glass UI:** Antarmuka modern dengan efek transparansi kaca (*frosted glass*) dan *mesh gradients*.
- 🌐 **Live 3D Room Preview:** Integrasi model 3D (Matterport/Sketchfab) untuk melihat tata letak ruangan sebelum melakukan pemesanan.
- 💬 **Smart Chatbot Assistant:** Asisten virtual yang siap menjawab pertanyaan umum mengenai prosedur peminjaman.
- 🔐 **Multi-Role Authentication:** Sistem keamanan berjenjang untuk **Admin Kominfotik**, **Verifikator (Asisten/Pimpinan)**, dan **User Bagian**.
- 🔔 **Floating Notification:** Sistem pemberitahuan *real-time* untuk setiap perubahan status persetujuan.

---

## 🛠️ Tech Stack

### 💻 Frontend (The Visuals)
- **Framework:** Next.js 15 (App Router) ⚛️
- **Styling:** Tailwind CSS with Glassmorphism Plugin 🎨
- **State Management:** React Hooks (useState, useEffect) 🔄
- **Animations:** Tailwind Animate & Framer Motion ⚡

### 🐘 Backend (The Engine)
- **API Server:** Laravel 11 Framework
- **Security:** Laravel Sanctum (Token Based Auth) 🔒
- **Database:** PostgreSQL (Robust & Scalable) 🗄️

---

## 📁 Struktur Folder

```
📂 OnlineReservations
├── 📂 backend-rr      Source code API Laravel 11
│   ├── 📂 app/Models
│   ├── 📂 database/migrations
│   └── 📜 routes/api.php
├── 📂 frontend-rr     Source code Next.js 15
│   ├── 📂 src/app     (Admin, User, Verifikator Panel)
│   ├── 📂 public      (Aset Lambang & Noise Textures)
│   └── 📜 tailwind.config.ts
└── 📂 FotoDemo        Dokumentasi visual & screenshot aplikasi
```

---

## ⚙️ Cara Menjalankan Project (Getting Started)

### Prasyarat
- Node.js >= 18.x
- PHP >= 8.2 & Composer
- PostgreSQL

### 1. Clone Repository
```bash
git clone https://github.com/polarized-human/OnlineReservations.git
cd OnlineReservations
```

### 2. Setup Backend (Laravel)
```bash
cd backend-rr
composer install
cp .env.example .env
php artisan key:generate
# Sesuaikan koneksi database di file .env
php artisan migrate --seed
php artisan serve
```

### 3. Setup Frontend (Next.js)
```bash
cd ../frontend-rr
npm install
cp .env.example .env.local
# Sesuaikan NEXT_PUBLIC_API_URL agar mengarah ke backend
npm run dev
```

Aplikasi frontend akan berjalan di `http://localhost:3000` dan backend API di `http://localhost:8000`.

---

## 👤 Role & Akses

| Role | Deskripsi |
|------|-----------|
| **Admin Kominfotik** | Mengelola master data ruangan, fasilitas, dan pengguna |
| **Verifikator** | Menyetujui/menolak pengajuan reservasi |
| **User Bagian** | Mengajukan reservasi ruang rapat |

---

## 🔗 Demo & Tautan Lain

- 📸 Dokumentasi Screenshot: [`/FotoDemo`](./FotoDemo)

---

## 📝 Tentang Project

Project ini dikembangkan sebagai bagian dari program magang di Kantor Walikota Administrasi Jakarta Timur, dengan fokus pada digitalisasi proses reservasi ruang rapat yang sebelumnya manual.
