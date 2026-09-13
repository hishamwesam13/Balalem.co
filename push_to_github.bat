@echo off
chcp 65001 >nul
echo ====================================================
echo  رفع مشروع Balalem.co إلى GitHub (شركة الولاء للستائر)
echo ====================================================
echo.
git push -u origin main
echo.
if %errorlevel% equ 0 (
    echo ====================================================
    echo  تم الرفع إلى GitHub بنجاح! ✓
    echo  المستودع: https://github.com/hishamwesam13/Balalem.co
    echo ====================================================
) else (
    echo.
    echo  فشل الرفع. تأكد من تسجيل الدخول إلى GitHub في نافذة المتصفح.
)
pause
