# Слияй-Ка — Эволюция форм

Казуальная merge-игра на Phaser 3. Проект собирается через Vite; TypeScript используется для точки входа и постепенно вводится в кодовую базу.

## Запуск

- `npm install`
- `npm run dev` — локальная разработка
- `npm run build` — production-сборка в `dist/`
- `npm run preview` — просмотр production-сборки

## Структура

- `src/main.ts` — запуск приложения и подключение совместимого слоя.
- `src/game.js` — текущая реализация Phaser-сцен; следующий этап — разнести сцены по отдельным файлам.
- `src/config/constants.js` — размеры поля и игровые константы.
- `src/graphics/Shapes.js` — генерация текстур и графика фигур.
- `src/localization/translations.js` — RU/EN тексты.
- `src/systems/Storage.js` — localStorage и синхронизация с Yandex Player API.
- `src/systems/AudioSystem.js` — музыка и звуковые эффекты на Web Audio API.
- `src/systems/Platform.js` — реклама и баннеры Яндекс Игр.
- `src/ui/buttons.js` — отрисовка кнопок Phaser.

Phaser хранится локально в `public/phaser.min.js`, чтобы игра не зависела от CDN.
