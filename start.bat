@echo off
echo Запуск сервера...
start cmd /k "cd /d %~dp0backend && npm start"
timeout /t 3
echo Запуск Cloudflare туннеля...
start cmd /k "%~dp0cloudflared-windows-amd64.exe tunnel --url http://localhost:3000"
echo.
echo Готово! Скопируй ссылку из окна Cloudflare и обнови в Яндекс OAuth
echo oauth.yandex.ru - твоё приложение - Redirect URI
pause