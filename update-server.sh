#!/bin/bash
# ============================================================
# Update Script — SMA Annajah Payment
# Jalankan di server production (192.168.1.51)
# ============================================================
# 
# Sebelum pertama kali jalankan:
#   chmod +x update-server.sh
#
# Konfigurasi Database (untuk backup)
# ============================================================

set -e  # Hentikan script jika ada error

APP_DIR="/var/www/db_sas_annajah"
DB_HOST="192.168.1.51"
DB_USER="root"
DB_PASS='$a$Login4dmin'
DB_NAME="dbannajah"
BACKUP_DIR="$APP_DIR/backup-db"

echo "╔══════════════════════════════════════════════════╗"
echo "║        UPDATE APLIKASI SMA ANNAJAH              ║"
echo "╚══════════════════════════════════════════════════╝"
echo ""
echo "Mulai: $(date '+%Y-%m-%d %H:%M:%S')"
echo ""

# ── 1. Masuk ke folder aplikasi ──
echo "📁 [1/6] Masuk ke folder aplikasi..."
cd "$APP_DIR"

# ── 2. Backup Database ──
echo "💾 [2/6] Backup database..."
mkdir -p "$BACKUP_DIR"
BACKUP_FILE="$BACKUP_DIR/backup_$(date +%Y%m%d_%H%M%S).sql"
mysqldump -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" > "$BACKUP_FILE"
echo "   Backup tersimpan: $BACKUP_FILE"
# Hapus backup lebih dari 7 hari
find "$BACKUP_DIR" -name "backup_*.sql" -mtime +7 -delete
echo ""

# ── 3. Git Pull ──
echo "📥 [3/6] Mengambil update terbaru dari Git..."
git pull origin main
echo ""

# ── 4. Install Server Dependencies (backend sekarang di root) ──
echo "📦 [4/6] Install dependensi server..."
npm install --production
echo ""

# ── 5. Build Client (Frontend) ──
echo "🎨 [5/6] Build ulang client (frontend)..."
cd client
npm install
npm run build
cd ..
echo ""

# ── 6. Restart Aplikasi ──
echo "🔄 [6/6] Restart aplikasi dengan PM2..."
pm2 restart backend-sas
echo ""

echo "╔══════════════════════════════════════════════════╗"
echo "║        ✅ UPDATE SELESAI                         ║"
echo "╚══════════════════════════════════════════════════╝"
echo ""
echo "Selesai: $(date '+%Y-%m-%d %H:%M:%S')"
echo ""
echo "Cek status aplikasi:"
echo "  pm2 status"
echo ""
echo "Cek log aplikasi:"
echo "  pm2 logs backend-sas"
echo ""
echo "Backup database tersimpan di:"
echo "  $BACKUP_DIR"
echo "  (backup lebih dari 7 hari otomatis dihapus)"
