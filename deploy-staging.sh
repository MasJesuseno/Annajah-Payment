#!/bin/bash
# ============================================
# DEPLOY STAGING - Local Server (192.168.1.51)
# Jalankan setelah: git push origin main
# Cara: bash deploy-staging.sh
# ============================================
set -e

APP_DIR="/var/www/db_sas_annajah"

cd "$APP_DIR"

echo "=== [1/5] Git Pull dari GitHub ==="
git pull origin main 2>&1

echo ""
echo "=== [2/5] Install Backend Dependencies ==="
npm_config_cache=/tmp/npm-cache npm install --production --no-audit --no-fund 2>&1

echo ""
echo "=== [3/5] Build Frontend ==="
cd client
npm_config_cache=/tmp/npm-cache npm install --no-audit --no-fund 2>&1
chmod -R +x node_modules/.bin/ 2>/dev/null
npm run build 2>&1
cd ..

echo ""
echo "=== [4/5] Restart PM2 ==="
pm2 restart backend-sas 2>&1

echo ""
echo "=== [5/5] Selesai! ==="
pm2 list | grep backend-sas
echo ""
echo "============================================"
echo "  ✅ Deploy STAGING berhasil!"
echo "  URL: http://192.168.1.51:3001"
echo "============================================"
