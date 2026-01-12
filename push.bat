@echo off
set /p msg="Сообщение коммита: "
git add .
git commit -m "%msg%"
git push
pause
