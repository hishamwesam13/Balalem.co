@echo off
title متجر الولاء لستائر Balalem co
color 0E
echo ========================================================
echo        متجر الولاء لستائر - Balalem co
echo       تشغيل الخادم المحلي وفتح المتجر في المتصفح...
echo ========================================================
echo.

start "" "http://localhost:5500/"
powershell -ExecutionPolicy Bypass -File .\server.ps1 -Port 5500
pause
