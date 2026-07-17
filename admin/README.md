# Админка блога (Sveltia CMS)

Панель для написания статей: **https://kaymanov.ru/admin/**
Пишет статьи в папку `_posts/`, GitHub пересобирает сайт. Картинки грузятся в `assets/blog/`.

## Разовая настройка входа через GitHub (~15 минут)

Вход нужен один раз настроить — потом просто заходишь на `/admin/` и пишешь.

### Шаг 1. Развернуть воркер авторизации (Cloudflare, бесплатно)
1. Открой репозиторий **https://github.com/sveltia/sveltia-cms-auth**
2. Нажми кнопку **«Deploy to Cloudflare Workers»** (в описании репозитория).
3. Заведи бесплатный аккаунт Cloudflare, если его нет, и заверши деплой.
4. Скопируй адрес воркера из дашборда Cloudflare — вида
   `https://sveltia-cms-auth.ТВОЙ-САБДОМЕН.workers.dev`

### Шаг 2. Создать GitHub OAuth App
1. Открой **https://github.com/settings/developers** → вкладка **OAuth Apps** → **New OAuth App**.
2. Заполни:
   - **Application name:** `kaymanov.ru CMS`
   - **Homepage URL:** `https://kaymanov.ru`
   - **Authorization callback URL:** `АДРЕС_ВОРКЕРА/callback`
     (например `https://sveltia-cms-auth.xxx.workers.dev/callback`)
3. Нажми **Register application**.
4. Скопируй **Client ID**, затем нажми **Generate a new client secret** и скопируй **Client Secret**.

### Шаг 3. Прописать ключи в воркере
В дашборде Cloudflare открой свой воркер → **Settings → Variables** и добавь:
- `GITHUB_CLIENT_ID` — Client ID из шага 2
- `GITHUB_CLIENT_SECRET` — Client Secret из шага 2 (нажми **Encrypt**)
- `ALLOWED_DOMAINS` — `kaymanov.ru`

Сохрани и передеплой (Deploy).

### Шаг 4. Подключить воркер к админке
Пришли адрес воркера — впишу его в `admin/config.yml` (строка `base_url`) и запушу.
Либо сам: в `admin/config.yml` под `backend:` раскомментируй строку и вставь адрес:
```yaml
    base_url: https://sveltia-cms-auth.ТВОЙ-САБДОМЕН.workers.dev
```

### Готово
Заходишь на **https://kaymanov.ru/admin/**, жмёшь **Login with GitHub** — открывается редактор.
«New Статью» → заполняешь поля, пишешь текст, грузишь картинки → **Publish**.
Через минуту статья появляется на `https://kaymanov.ru/blog/`.
