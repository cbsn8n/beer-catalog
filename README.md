# Beervana (vana.beer) — Каталог пива от Ивана

## Обзор
Веб-каталог пива с данными из NocoDB. Next.js 16 + shadcn/ui + Framer Motion + Tailwind CSS.  
Продакшн: **https://vana.beer**

## Архитектура

```
┌─────────────────────────────────────────────────┐
│                   Frontend                       │
│  Next.js 16 (app router, client-side filtering) │
│  shadcn/ui components + Framer Motion            │
│  Geist font (cyrillic)                           │
└──────────┬──────────────────────┬───────────────┘
           │                      │
    /api/beers              /data/images/
    (JSON из файла)         (картинки + sharp thumbnails)
           │                      │
    data/beers.json         data/images/*.{png,jpg}
           │                data/thumbs/*_WxQq.webp
           │                      │
    ┌──────┴──────────────────────┴───────┐
    │         Sync Script (scripts/sync.ts)        │
    │  Тянет данные из NocoDB API                  │
    │  Скачивает фото в data/images/               │
    │  Вызывается через POST /api/sync             │
    └──────────────────┬──────────────────┘
                       │
              NocoDB (noc.mdch.cloud)
              Таблица: ivanbeer (mwllcohqjkngvow)
```

## Структура проекта

```
beer-catalog/
├── app/
│   ├── layout.tsx          # Root layout, Geist font, meta
│   ├── page.tsx            # Главная: состояние фильтров, загрузка данных из /api/beers
│   ├── beeradm/page.tsx    # Закрытая админка (пароль + сессия)
│   ├── globals.css         # Tailwind + shadcn theme
│   ├── api/
│   │   ├── beers/route.ts  # GET — отдаёт data/beers.json
│   │   ├── sync/route.ts   # POST — запускает scripts/sync.ts (npx tsx)
│   │   ├── beeradm/login/route.ts  # POST — вход в админку
│   │   ├── beeradm/logout/route.ts # POST — выход из админки
│   │   └── beer-image/route.ts # (legacy) SVG placeholder генератор
│   └── data/
│       └── images/[...path]/route.ts  # Отдаёт картинки, ?w=N&q=N → sharp resize → webp thumb
├── components/
│   ├── header.tsx          # Шапка: лого + кнопка входа (disabled)
│   ├── hero.tsx            # Hero-блок: заголовок + анимированная кнопка "Добавить пиво"
│   ├── filters.tsx         # Фильтры: сорта, страны (с флагами + кнопка "Все"), рейтинг (звёзды), цена (слайдер)
│   ├── beer-card.tsx       # Карточка пива: квадратное превью, название, страна, рейтинг, цена
│   ├── beer-grid.tsx       # Сетка карточек с infinite scroll (IntersectionObserver, по 30)
│   ├── footer.tsx          # Футер: лого + ссылки (политика, правовая)
│   └── ui/                 # shadcn components (badge, button, card, select, slider)
├── lib/
│   ├── types.ts            # Типы Beer (из NocoDB)
│   ├── country-flags.ts    # Маппинг страна → эмодзи-флаг
│   ├── mock-data.ts        # (legacy) Моковые данные, не используется
│   └── utils.ts            # shadcn cn() утилита
├── scripts/
│   └── sync.ts             # Скрипт синхронизации NocoDB → data/beers.json + data/images/
├── data/
│   ├── beers.json          # 962 записей пива (коммитится в git)
│   ├── images/             # Фото пива (НЕ в git, скачиваются sync-ом)
│   └── thumbs/             # Кэш превью WebP (генерируются sharp на лету)
├── Dockerfile              # Multi-stage: deps → build → standalone runner
├── next.config.ts          # output: "standalone"
└── package.json
```

## Схема данных Beer (из NocoDB)

```typescript
interface Beer {
  id: number;           // NocoDB Id
  name: string;         // Название
  image: string | null; // /data/images/{id}.{png|jpg} или null
  type: string | null;  // Тип: Светлое, Темное, Янтарное
  sort: string | null;  // Сорт: Лагер, Пшеничное, Пилснер, Эль, и т.д.
  filtration: string | null; // Фильтрация: Фильтрованное / Нефильтрованное
  country: string | null;    // Страна
  price: number | null;      // Цена в рублях
  traits: {
    socks: boolean;     // Носки (плохой запах)
    bitter: boolean;    // Горчит
    sour: boolean;      // Кислит
    fruity: boolean;    // Фруктовое
    smoked: boolean;    // Копченое
    watery: boolean;    // Водянистое
    spirity: boolean;   // Спиртовое
  };
  rating: number | null;   // Оценка 1-10
  comment: string | null;  // Комментарий
}
```

## NocoDB таблица

- **URL**: https://noc.mdch.cloud
- **Таблица**: `ivanbeer` (ID: `mwllcohqjkngvow`)
- **Столбцы**: Id, Название, Фото (Attachment), Тип, Сорт, Фильтрация, Страна, Цена, Носки, Горчит, Кислит, Фруктовое, Копченое, Водянистое, Спиртовое, Оценка, Комментарий
- **Фото**: attachment с `signedPath`, скачивается через `{API_URL}/{signedPath}`

## Деплой (Coolify)

- **Coolify URL**: https://coolify.mdch.cloud
- **Проект**: apps → production
- **Сервис UUID**: `g84gg88wgc8g4cg8ckk8cgc8`
- **Домен**: https://vana.beer (A-запись → Coolify сервер)
- **Build**: Dockerfile (public GitHub repo)
- **БД Postgres UUID**: `vg0cw00wcwsgc0skk48o8w80` (пока не используется, создана на будущее)

### Persistent Storage
✅ Реализовано в Coolify:
- volume для `/app/data/images` — фото пива
- volume для `/app/data/thumbs` — кэш превью
- `DATA_DIR=/app/data`

Благодаря этому фото и превью сохраняются между деплоями.

### Переменные окружения (в Coolify)

| Переменная | Значение | Назначение |
|---|---|---|
| `DATABASE_URL` | postgres://... (auto) | Postgres (на будущее — Prisma) |
| `NEXT_PUBLIC_SITE_URL` | https://vana.beer | URL сайта |
| `NOCO_DB_API_URL` | https://noc.mdch.cloud | NocoDB API |
| `NOCO_DB_API_KEY` | (secret) | Токен NocoDB |
| `NOCO_DB_TABLE_ID` | mwllcohqjkngvow | ID таблицы |
| `TELEGRAM_BOT_TOKEN` | (secret) | Для авторизации (TODO) |
| `TELEGRAM_BOT_USERNAME` | (bot username) | Для login widget (TODO) |
| `JWT_SECRET` | (secret) | Сессии (TODO) |
| `ADMIN_PANEL_PASSWORD` | (secret) | Пароль входа в `/beeradm` |

## Sync (синхронизация с NocoDB)

```bash
# Локально
NOCO_DB_API_URL=... NOCO_DB_API_KEY=... NOCO_DB_TABLE_ID=... npx tsx scripts/sync.ts

# Только JSON (без картинок)
npx tsx scripts/sync.ts --no-images

# Через API на продакшне
curl -X POST https://vana.beer/api/sync
```

Sync скачивает все записи из NocoDB, сохраняет `data/beers.json`, затем качает фото в `data/images/`.

> Доступ к `/api/sync`: либо активная сессия `/beeradm`, либо `SYNC_TRIGGER_SECRET` (для автоматизаций).

## Превью картинок

Роут `/data/images/{file}?w=300&q=70` через sharp:
- Ресайзит по высоте (fit: inside), конвертирует в WebP
- Кэширует в `data/thumbs/`
- На фронте карточки запрашивают `?w=400&q=70`
- Оригиналы доступны без параметров

## Фильтрация (клиентская)

Все данные загружаются одним запросом `/api/beers` → фильтрация через `useMemo`:
- Сорта (badges, множественный выбор)
- Страны (badges с флагами 🇩🇪🇷🇺, кнопка "Все")
- Рейтинг (от 5/6/7/8/9, со звёздами)
- Цена (range slider)
- Infinite scroll по 30 карточек (IntersectionObserver)

## TODO (не реализовано)

- [ ] **Telegram авторизация** — login widget, JWT сессии
- [ ] **Google авторизация** — OAuth
- [ ] **Админка (beeradm)** — расширить до полноценной панели (роли, аудит действий, дополнительные разделы)
- [ ] **Postgres + Prisma** — миграция данных из JSON в БД, комментарии, рейтинги от пользователей
- [x] **Страница пива** — детальная карточка с полным описанием, traits, комментариями
- [ ] **Добавление пива** — форма (после авторизации)
- [x] **Базовая админка `/beeradm`** — вход по паролю + защищённый запуск Sync
- [x] **Кнопка Sync в UI** — только в админке
- [x] **Persistent Storage в Coolify** — чтобы не терять картинки при деплое
- [x] **Traits в фильтрах** — фильтрация по горчит/кислит/фруктовое и т.д.
- [x] **Поиск по названию**
- [x] **Сортировка** (по рейтингу, цене, названию)

## Технологии

- Next.js 16 (app router, standalone output)
- React 19
- Tailwind CSS 4
- shadcn/ui (badge, button, card, select, slider)
- Framer Motion (анимации)
- Lucide React (иконки)
- Sharp (ресайз/конвертация картинок)
- TypeScript
- Docker (multi-stage build, node:22-alpine)
