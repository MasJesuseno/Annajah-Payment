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

:: Install Server Dependencies
echo [1/3] Menginstall dependensi Server...
cd /d "%~dp0"
call npm install
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Gagal install server dependencies!
    pause
    exit /b 1
)
echo [OK] Server dependencies terinstall
echo.

:: Install Client (Frontend)
echo [2/3] Menginstall dependensi Client...
cd /d "%~dp0client"
call npm install
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Gagal install client dependencies!
    pause
    exit /b 1
)
echo [OK] Client dependencies terinstall
echo.

:: Done
echo ============================================
echo   INSTALASI SELESAI!
echo ============================================
echo.
echo Menjalankan aplikasi...
echo.
echo Aplikasi : http://localhost:3001
echo Frontend : http://localhost:3001 (via Vite proxy)
echo.
echo Akun Demo:
echo   Admin     : admin / admin123
echo   Bendahara : bendahara / bendahara123
echo.

:: Start Server (di window baru)
start "SMA Annajah - Server" cmd /k "cd /d "%~dp0" && node server.js"
timeout /t 3 /nobreak >nul

:: Start Client Dev Server (di window baru)
start "SMA Annajah - Client" cmd /k "cd /d "%~dp0client" && npm run dev"

echo.
echo Backend dan Frontend sudah dijalankan!
echo Buka http://localhost:3001 di browser Anda.
echo.
echo (Tutup jendela CMD ini untuk keluar)
echo.
pause
