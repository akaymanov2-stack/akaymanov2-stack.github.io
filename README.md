# Сайт Андрея Кайманова

Портфолио performance-маркетолога. Статический фронтенд (`index.html` + `styles.css` + `script.js`), данные и медиа — в **Supabase**, деплой — на **Vercel**.

## Стек

| Слой | Технология |
|------|-----------|
| Фронтенд | Статический HTML/CSS/JS + [`supabase-js`](https://github.com/supabase/supabase-js) (CDN) |
| База данных | Supabase Postgres — таблицы `cases`, `videos` |
| Медиа | Supabase Storage — бакет `media` (видео, фото) |
| Хостинг | Vercel (авто-деплой из GitHub) |

---

## Настройка с нуля

### 1. Проект Supabase
1. Создать проект на [supabase.com](https://supabase.com).
2. **SQL Editor** → выполнить [`supabase/schema.sql`](supabase/schema.sql) (таблицы, RLS, бакет `media`).
3. **SQL Editor** → выполнить [`supabase/seed.sql`](supabase/seed.sql) (текущий контент).
4. **Project Settings → API** → скопировать **Project URL** и **anon public key**.

### 2. Медиа в Storage
Бакет `media` создаётся schema.sql. Внутри — папки `videos/` и `images/`.

Залить файлы (Storage → media → Upload) со следующими именами:

| Файл в Storage | Источник (Google Drive) | Размер |
|----------------|-------------------------|--------|
| `videos/roadscan.mp4` | roadscan.mp4 | 9 МБ |
| `videos/tron.mp4` | tron.mp4 | 11 МБ |
| `videos/evo.mp4` | #4_EVO.mp4 | **240 МБ** ⚠️ |
| `images/portrait.jpg` | портрет (сейчас в base64 в HTML) | — |

> ⚠️ **Лимит размера файла.** На бесплатном плане Supabase есть ограничение на
> размер одного загружаемого файла (Storage → Settings). `evo.mp4` (240 МБ)
> в него, скорее всего, не влезет. Варианты: сжать ролик до ~40 МБ через ffmpeg
> (`ffmpeg -i evo_src.mp4 -vcodec libx264 -crf 28 -preset slow -acodec aac -b:a 128k evo.mp4`)
> или поднять план до Pro. Компрессия заодно бережёт исходящий трафик.

### 3. Ключи фронтенда
Скопировать `config.example.js` → `config.js` и вписать значения из шага 1:
```js
window.SUPABASE_URL      = "https://<project-ref>.supabase.co";
window.SUPABASE_ANON_KEY = "<anon-public-key>";
```
`anon`-ключ публичный (защищён RLS), коммитить его безопасно.

### 4. Деплой на Vercel
1. [vercel.com](https://vercel.com) → **Add New → Project** → импортировать GitHub-репозиторий.
2. Framework Preset: **Other** (сборка не нужна, это статика). Output — корень репозитория.
3. Deploy. Дальше каждый `git push` в `main` деплоится автоматически.

---

## Локальный запуск
```bash
# любой статический сервер, например:
npx serve .
# затем открыть http://localhost:3000
```

## Управление контентом
Пока без админки: кейсы и видео правятся в **Supabase → Table Editor**
(таблицы `cases`, `videos`). Новые медиа — загрузкой в бакет `media`.
