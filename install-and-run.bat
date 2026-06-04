@echo off
title SMA Annajah - Payment System
color 0A

echo ============================================
echo   SMA Annajah - Sistem Administrasi Sekolah
echo ============================================
echo.

:: Check Node.js
where node >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Node.js tidak ditemukan!
    echo Silakan install Node.js dari https://nodejs.org
    pause
    exit /b 1
)

echo [OK] Node.js terdeteksi
node -v
echo.

:: Install Backend
echo [1/3] Menginstall dependensi Backend...
cd /d "%~dp0backend"
call npm install
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Gagal install backend dependencies!
    pause
    exit /b 1
)
echo [OK] Backend dependencies terinstall
echo.

:: Install Frontend
echo [2/3] Menginstall dependensi Frontend...
cd /d "%~dp0frontend"
call npm install
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Gagal install frontend dependencies!
    pause
    exit /b 1
)
echo [OK] Frontend dependencies terinstall
echo.

:: Done
echo ============================================
echo   INSTALASI SELESAI!
echo ============================================
echo.
echo Menjalankan aplikasi...
echo.
echo Backend  : http://localhost:5000
echo Frontend : http://localhost:3000
echo.
echo Akun Demo:
echo   Admin     : admin / admin123
echo   Bendahara : bendahara / bendahara123
echo.

:: Start Backend (di window baru)
start "SMA Annajah - Backend" cmd /k "cd /d "%~dp0backend" && node server.js"
timeout /t 3 /nobreak >nul

:: Start Frontend (di window baru)
start "SMA Annajah - Frontend" cmd /k "cd /d "%~dp0frontend" && npm run dev"

echo.
echo Backend dan Frontend sudah dijalankan!
echo Buka http://localhost:3000 di browser Anda.
echo.
echo (Tutup jendela CMD ini untuk keluar)
echo.
pause
