#!/bin/bash
# ============================================
# DEPLOY PRODUCTION - Cloud Server (43.129.43.213)
# Jalankan setelah: git push origin main
# Cara: bash deploy.sh
# ============================================
set -e

APP_DIR="/www/wwwroot/sas.smaannajah.sch.id"
NODE_BIN="/www/server/nodejs/v24.18.0/bin"
export PATH="$PATH:$NODE_BIN"

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
$NODE_BIN/pm2 restart backend-sas 2>&1

echo ""
echo "=== [5/5] Selesai! ==="
$NODE_BIN/pm2 list | grep backend-sas
echo ""
echo "============================================"
echo "  ✅ Deploy PRODUCTION berhasil!"
echo "  Domain: https://sas.smaannajah.sch.id"
echo "============================================"
