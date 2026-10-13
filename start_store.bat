@echo off
title متجر الولاء لستائر Balalem co - السيرفر المحلي وقاعدة بيانات نيون
color 0A
echo ========================================================
echo        متجر الولاء لستائر - Balalem co
echo  تشغيل الخادم وقاعدة البيانات السحابية Neon PostgreSQL...
echo ========================================================
echo.

where node >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    echo [Node.js Engine Detected] تشغيل السيرفر المتكامل (Node + Neon DB)...
    start "" "http://localhost:5500/"
    node server.js 5500
) else (
    echo [Fallback] Node.js غير مثبت في المسار، جاري تشغيل خادم PowerShell...
    start "" "http://localhost:5500/"
    powershell -ExecutionPolicy Bypass -File .\server.ps1 -Port 5500
)
pause
