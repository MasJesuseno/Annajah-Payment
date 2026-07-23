# 🚀 Git Setup & Panduan Update Server SMA Annajah Payment

---

## 📌 Informasi Repository

| Item | Detail |
|---|---|
| **Folder Lokal (Windows)** | `D:\Aplikasi\Annajah\sma-annajah-payment` |
| **Folder Server (Ubuntu)** | `/var/www/db_sas_annajah` |
| **Domain** | `https://sas.smaannajah.sch.id` |
| **IP Server** | `192.168.1.51` |
| **Port Aplikasi** | `3000` |
| **PM2 Process** | `backend-sas` |

---

## 📡 Remote Repository

Ada **2 remote** yang terdaftar:

### 1. `origin` — GitHub (Cloud)
```
https://github.com/MasJesuseno/Annajah-Payment.git
```
▶️ Berfungsi sebagai **cadangan cloud** dan kolaborasi.

### 2. `server-rumah` — Server Langsung
```
root@192.168.1.51:/root/sas-annajah.git
```
▶️ Berfungsi untuk **deploy langsung** ke server lokal.

---

## ⚙️ Cara Kerja Git Deploy

### Arsitektur
```
Windows (Lokal) ──git push──→ Server Bare Repo ──hook──→ Folder Aplikasi
                                  (/root/sas-annajah.git)    (/var/www/db_sas_annajah)
```

Saat `git push server-rumah main` dijalankan:
1. Git mengirim kode ke bare repo di server (`/root/sas-annajah.git`)
2. **Post-receive hook** otomatis terpicu
3. Hook menjalankan:
   - `git checkout -f main` → menyalin kode ke `/var/www/db_sas_annajah`
   - `npm install --production` di `backend/`
   - `npm install && npm run build` di `frontend/`
   - `pm2 restart backend-sas` → restart backend

---

## 📋 Panduan Update Server

### ▶️ A. Cara Cepat (1 Perintah)

Setelah selesai coding di lokal, jalankan:

```bash
git add .
git commit -m "Pesan perubahan"
git push origin main
git push server-rumah main
```

> **Catatan:** `git push server-rumah main` mungkin gagal jika belum ada SSH key.  
> Jika gagal, gunakan **Cara Alternatif** di bawah.

---

### ▶️ B. Cara Alternatif (Jika Git Push Gagal)

Jika `git push server-rumah main` gagal karena kendala SSH key, gunakan script SFTP:

```bash
node deploy_sftp.js
```

Script ini akan:
1. Upload semua file (kecuali `node_modules`, `.git`, `dist`) ke server via SFTP
2. Install dependencies backend
3. Build frontend
4. Restart PM2

---

### ▶️ C. Update Manual di Server (via SSH)

Login ke server:
```bash
ssh root@192.168.1.51
```

Kemudian jalankan perintah berikut (jika sudah ada `.git` di folder app):
```bash
cd /var/www/db_sas_annajah
git pull origin main
cd backend && npm install --production && cd ..
cd frontend && npm install && npm run build && cd ..
cd backend && pm2 restart backend-sas && cd ..
```

Atau jika menggunakan script (sudah tersedia di server):
```bash
cd /var/www/db_sas_annajah && bash update-server.sh
```

---

## 🔄 Sinkronisasi File Foto (Uploads)

File foto yang diupload (foto profil guru, foto absen, dll.) **tidak ikut tergit** karena ada di folder `backend/uploads/`.

**Setiap kali ada foto baru di lokal, jalankan:**
```bash
node sync_uploads.js
```

Script ini akan menyalin folder `backend/uploads/` dari lokal ke server `192.168.1.51`.

---

## 🔧 Troubleshooting

### Post-Receive Hook (Sudah Diperbaiki)

**Sebelumnya:** Hook men-deploy ke path **salah** → `/var/www/html/db_sas_annajah`  
**Sekarang:** ✅ Sudah diperbaiki → `/var/www/db_sas_annajah`

Isi hook saat ini:
```bash
#!/bin/bash
TARGET="/var/www/db_sas_annajah"
GIT_DIR="/root/sas-annajah.git"
BRANCH="main"

while read oldrev newrev ref
do
    if [ "$ref" = "refs/heads/$BRANCH" ]; then
        echo "=== Deploying to $TARGET ==="
        git --work-tree=$TARGET --git-dir=$GIT_DIR checkout -f $BRANCH
        echo "=== Code updated! ==="
        
        echo "=== Installing backend dependencies ==="
        cd $TARGET/backend
        npm install --production 2>&1
        
        echo "=== Building frontend ==="
        cd $TARGET/frontend
        npm install 2>&1
        npm run build 2>&1
        
        echo "=== Restarting PM2 ==="
        cd $TARGET/backend
        pm2 restart backend-sas 2>&1
        
        echo "=== Deploy completed! ==="
    fi
done
```

### Foto Tidak Muncul

| Kemungkinan | Solusi |
|---|---|
| Cache browser | Tekan **Ctrl+F5** (hard refresh) |
| File foto belum diupload | Jalankan `node sync_uploads.js` |
| Frontend belum di-build | Jalankan `npm run build` di `frontend/` |
| PM2 belum di-restart | Jalankan `pm2 restart backend-sas` |

---

## 📁 Struktur Repository

```
sma-annajah-payment/
├── backend/           # API Node.js (Express)
│   ├── routes/        # Endpoint API
│   ├── helpers/       # Helper functions
│   ├── uploads/       # File uploads (foto, dll)
│   ├── server.js      # Entry point
│   └── database.js    # Konfigurasi DB
├── frontend/          # React (Vite)
│   ├── src/
│   │   ├── pages/     # Halaman aplikasi
│   │   ├── components/# Komponen reusable
│   │   └── api/       # API client
│   └── dist/          # Hasil build (dibaca nginx)
├── GIT_SETUP.md       # File ini
├── deploy_sftp.js     # Script deploy via SFTP
└── sync_uploads.js    # Script sinkron uploads
```

---

## 📜 Riwayat Commit

```
c3a35d2  Upload foto ubsen
bd33e2b  feat: tambah upload foto absen guru & update-server.sh
88f0931  push pertama ke folder db_sas_annajah
5b68c36  Initial commit - SMA Annajah Payment System
```

---

## 💡 Tips

| Perintah | Kegunaan |
|---|---|
| `git status` | Cek perubahan file |
| `git log --oneline` | Lihat riwayat commit |
| `git remote -v` | Lihat daftar remote |
| `git push origin main` | Push ke GitHub |
| `git push server-rumah main` | Push langsung ke server |
| `node sync_uploads.js` | Sinkron foto ke server |
| `node deploy_sftp.js` | Deploy penuh via SFTP |
