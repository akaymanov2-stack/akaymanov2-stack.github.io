# Инструменты сборки

## Пререндер кейсов (`prerender.mjs`)

Генерирует статичные страницы `/cases/<slug>/index.html` из данных Supabase —
чтобы YandexBot видел контент кейсов без исполнения JS (client-side rendering
он индексирует плохо). Заодно пересобирает `sitemap.xml`.

**Когда запускать:** после того как добавили/изменили кейс или его блоки в БД.

**Как запускать** (нужны Chrome и Python в PATH):

```bash
# 1. Локальный сервер сайта
python -m http.server 8099 --directory . &

# 2. Headless Chrome с отладочным портом
"/c/Program Files/Google/Chrome/Application/chrome.exe" \
  --headless=new --disable-gpu --remote-debugging-port=9250 \
  --user-data-dir=/tmp/chrome-prerender about:blank &

# 3. Генерация
node tools/prerender.mjs 9250 http://127.0.0.1:8099
```

После — закоммитить `cases/**` и `sitemap.xml`.

Ссылки карточек на главной (`script.js`) и `case.js` уже понимают чистые URL
`/cases/<slug>/`; старый адрес `case.html?slug=<slug>` продолжает работать и
проставляет canonical на чистый URL.
