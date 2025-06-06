# PIdisk

> **Лёгкий · Быстрый · Кроссплатформенный**

PIdisk — это настольный клиент-менеджер файлов для **удалённого хранилища**, написанный на [Tauri](https://tauri.app) (Rust + Web). Приложение сочетает в себе минимальный размер дистрибутива, мгновенный запуск и отзывчивый интерфейс, сохраняя при этом удобство классического проводника.

<p align="center">
  <img src="/screenshots/tree.png" alt="Folder tree" width="45%">
  <img src="/screenshots/grid.png" alt="Grid view" width="45%">
</p>

---

## Содержание
- [Ключевые возможности](#ключевые-возможности)
- [Преимущества](#преимущества)
- [Скриншоты](#скриншоты)
- [Установка](#установка)
- [Быстрый старт](#быстрый-старт)
- [Архитектура](#архитектура)
- [Дорожная карта](#дорожная-карта)
- [Вклад](#вклад)
- [Лицензия](#лицензия)

---

## Ключевые возможности

| Интерфейс | Функционал |
|-----------|------------|
| **Древовидная навигация** по папкам с ленивой подгрузкой | Создание / переименование / удаление файлов и папок |
| **Grid ↔ List** переключатель представлений | Множественный выбор, drag-&-drop, контекстные меню |
| Хлебные крошки для быстрого перехода | Загрузка файлов и папок «одним кликом» |
| Индикатор использования диска в реальном времени | Корзина с массовой очисткой |

## Преимущества
- **Лёгкий вес**: финальный бинарь < 10 МБ (без Electron-нагрузки)
- **Высокая скорость** работы и запуска благодаря Rust-бекенду и прямым системным вызовам
- **Нативный внешний вид** через Material UI и системные компоненты Tauri
- **Кроссплатформенность**: Windows, Linux, macOS


## Архитектура
<p align="center">
  <img src="/screenshots/arc.png" alt="Arcview">
</p>

---

## Дорожная карта

- [ ] Система пользователей с поддержкой нескольких серверов
- [ ] Папка мгновенной синхронизации (watch + auto-upload)
- [ ] Локализация интерфейса (i18n)
- [ ] Командная строка для управления внутренностями сервера

---

---

## Установка

### 1. Клонирование репозитория
`git clone https://github.com/Ilpaka/pidisk.git`
`cd pidisk-app`
### 2. Предварительные требования

- **Rust 🦀**  
  Установка:  
  `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh`
- **Node ≥18** и **pnpm**  
  Установка:  
  `npm i -g pnpm`
- **Tauri CLI**  
  Установка:  
  `cargo install tauri-cli`  
  или  
  `pnpm dlx tauri@latest init` (автоматически)

### 3. Установка зависимостей
`pnpm install`
### 4. Запуск в режиме разработчика
`cargo tauti dev`




