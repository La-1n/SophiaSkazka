# Telegram Bot — Софийская сказка 09

Бот для базы отдыха в Архызе.

## Локальный запуск

1. Установи зависимости: `npm install`
2. Создай `.env` файл с `BOT_TOKEN=твой_токен`
3. Запусти: `npm start`

## Редактирование данных

1. Открой Excel: `open-excel.bat`
2. Отредактируй данные
3. Импортируй: `import-from-excel.bat`
4. Закоммить и запушь изменения

## Деплой на Railway

1. Создай репозиторий на GitHub
2. Зайди на [railway.app](https://railway.app)
3. New Project → Deploy from GitHub repo
4. Добавь переменную `BOT_TOKEN` в Settings → Variables
5. Готово!
