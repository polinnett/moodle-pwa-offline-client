# Moodle PWA Offline Client

PWA-клиент для LMS Moodle с механизмами офлайн-доступа к образовательному контенту. Разработан в рамках выпускной квалификационной работы.

## О проекте

Приложение обеспечивает доступ к курсам и учебным материалам Moodle без постоянного подключения к интернету. При наличии соединения данные синхронизируются с сервером автоматически.

**Возможности:**

- Офлайн-доступ к текстовым лекциям, видео и PDF
- Автоматическая расшифровка видеолекций в текст (Whisper AI)
- Заметки к лекциям с синхронизацией между устройствами
- Уведомления об изменениях в курсах
- Прохождение тестов онлайн
- Светлая и темная тема

## Архитектура

Проект состоит из 3 компонентов:

| Компонент       | Технологии                            | Порт |
| --------------- | ------------------------------------- | ---- |
| PWA-клиент      | React, TypeScript, Vite, Tailwind CSS | 5173 |
| Offline Backend | Python, FastAPI, SQLite               | 8001 |
| Whisper-сервис  | Python, FastAPI, OpenAI Whisper       | 9000 |

## Требования

- Node.js 20+
- Docker 20+
- LMS Moodle – [исходный код](https://github.com/moodle/moodle) и [moodle-docker](https://github.com/moodlehq/moodle-docker) для локального развертывания

## Запуск

**1. Клонировать репозиторий:**

```bash
git clone https://github.com/polinnett/moodle-pwa-offline-client.git
cd moodle-pwa-offline-client
```

**2. Запустить бэкенд-сервисы:**

```bash
docker compose up
```

**3. Установить зависимости и запустить PWA:**

```bash
cd client
npm install
npm run dev
```

**4. Открыть приложение:**

Перейти по адресу [http://localhost:5173](http://localhost:5173)

> Для работы приложения необходима запущенная инсталляция Moodle. Исходный код: [moodle/moodle](https://github.com/moodle/moodle). Инструкция по локальному развертыванию: [moodlehq/moodle-docker](https://github.com/moodlehq/moodle-docker)

## Структура репозитория

```
moodle-pwa-offline-client/
├── client/              # PWA-клиент на React
├── offline-backend/     # Сервис заметок и уведомлений
├── whisper-service/     # Сервис расшифровки видео
└── docker-compose.yml   # Запуск всех сервисов
```

## Автор

Хафизова Полина Дмитриевна, 221-323  
Московский Политех, 2026
