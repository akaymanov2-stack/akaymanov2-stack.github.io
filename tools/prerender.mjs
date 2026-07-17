// ============================================================
//  Пререндер кейсов в статичный HTML для индексации Яндексом.
//
//  Что делает: открывает каждый кейс в headless Chrome, ждёт, пока
//  case.js отрисует контент из Supabase, забирает готовый HTML и
//  сохраняет его в /cases/<slug>/index.html с полной SEO-разметкой
//  (title, description, canonical, Open Graph, JSON-LD Article +
//  BreadcrumbList). Заодно генерирует sitemap.xml.
//
//  Запуск (см. tools/prerender.sh):
//    node tools/prerender.mjs <cdpPort> <baseUrl>
//  где baseUrl — локальный сервер, отдающий сайт (напр. http://127.0.0.1:8099)
// ============================================================
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SITE = 'https://kaymanov.ru';
const cdpPort = process.argv[2] || '9250';
const baseUrl = process.argv[3] || 'http://127.0.0.1:8099';

// --- ключи Supabase из config.js ---
const cfg = fs.readFileSync(path.join(ROOT, 'config.js'), 'utf8');
const SUPABASE_URL = cfg.match(/SUPABASE_URL\s*=\s*"([^"]+)"/)[1];
const SUPABASE_KEY = cfg.match(/SUPABASE_ANON_KEY\s*=\s*"([^"]+)"/)[1];
const pub = p => p ? `${SUPABASE_URL}/storage/v1/object/public/media/${p}` : '';
const esc = s => String(s ?? '').replace(/[&<>"']/g, c =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// --- список кейсов ---
const cases = await (await fetch(
  `${SUPABASE_URL}/rest/v1/cases?select=slug,title,description,tag,metric,category,cover_path,kpis&order=sort`,
  { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } }
)).json();
console.log(`Кейсов к пререндеру: ${cases.length}`);

// --- CDP-подключение ---
let target;
for (let i = 0; i < 40; i++) {
  try { const l = await (await fetch(`http://127.0.0.1:${cdpPort}/json`)).json(); target = l.find(t => t.type === 'page'); if (target) break; } catch {}
  await new Promise(r => setTimeout(r, 300));
}
const ws = new WebSocket(target.webSocketDebuggerUrl);
let id = 0; const pend = new Map();
ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && pend.has(d.id)) { pend.get(d.id)(d); pend.delete(d.id); } };
await new Promise(r => (ws.onopen = r));
const send = (method, params = {}) => new Promise(res => { const i = ++id; pend.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async e => (await send('Runtime.evaluate', { expression: e, awaitPromise: true, returnByValue: true })).result?.result?.value;
await send('Page.enable'); await send('Runtime.enable');

// --- HTML-обёртка статичной страницы кейса ---
function pageHtml(c, innerHtml) {
  const url = `${SITE}/cases/${c.slug}/`;
  const title = `${c.title} — Андрей Кайманов`;
  const desc = (c.description || c.metric || '').slice(0, 300);
  const ogImg = c.cover_path ? pub(c.cover_path) : `${SITE}/og.png`;
  const ld = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Article',
        headline: c.title,
        description: desc,
        image: ogImg,
        inLanguage: 'ru-RU',
        author: { '@type': 'Person', '@id': `${SITE}/#person`, name: 'Андрей Кайманов', url: `${SITE}/` },
        publisher: { '@type': 'Person', '@id': `${SITE}/#person`, name: 'Андрей Кайманов' },
        mainEntityOfPage: url,
        about: (c.kpis || []).length ? c.kpis : undefined
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Главная', item: `${SITE}/` },
          { '@type': 'ListItem', position: 2, name: 'Кейсы', item: `${SITE}/#cases` },
          { '@type': 'ListItem', position: 3, name: c.title, item: url }
        ]
      }
    ]
  };
  return `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${url}">
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
<link rel="mask-icon" href="/favicon.svg" color="#f2b23e">
<meta name="theme-color" content="#0b0c10">
<meta property="og:type" content="article">
<meta property="og:site_name" content="Андрей Кайманов">
<meta property="og:title" content="${esc(c.title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${esc(ogImg)}">
<meta property="og:locale" content="ru_RU">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(c.title)}">
<meta name="twitter:description" content="${esc(desc)}">
<meta name="twitter:image" content="${esc(ogImg)}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&family=Unbounded:wght@500;600;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/styles.css">
<script type="application/ld+json">
${JSON.stringify(ld, null, 2)}
</script>

<!-- Yandex.Metrika counter -->
<script type="text/javascript">
    (function(m,e,t,r,i,k,a){
        m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
        m[i].l=1*new Date();
        for (var j = 0; j < document.scripts.length; j++) {if (document.scripts[j].src === r) { return; }}
        k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)
    })(window, document,'script','https://mc.yandex.ru/metrika/tag.js?id=110815005', 'ym');
    ym(110815005, 'init', {ssr:true, webvisor:true, clickmap:true, ecommerce:"dataLayer", referrer: document.referrer, url: location.href, accurateTrackBounce:true, trackLinks:true});
</script>
<noscript><div><img src="https://mc.yandex.ru/watch/110815005" style="position:absolute; left:-9999px;" alt="" /></div></noscript>
<!-- /Yandex.Metrika counter -->
</head>
<body>
<div class="bg-glow"></div>

<nav>
  <div class="wrap nav-in">
    <a class="logo" href="/#top">АНДРЕЙ<span>&nbsp;КАЙМАНОВ</span></a>
    <div class="nav-links">
      <a href="/#cases">Кейсы</a>
      <a href="/#industries">Отрасли</a>
      <a href="/#video">Видео</a>
      <a href="/#contact">Контакты</a>
      <a href="/blog/">Блог</a>
    </div>
    <a class="nav-cta" href="mailto:akaymanov2@gmail.com">Написать</a>
  </div>
</nav>

<main class="wrap case-wrap">
  <a class="case-back" href="/#cases">← Все кейсы</a>
  <article id="caseDetail" class="case-detail">${innerHtml}</article>
</main>

<footer>
  <div class="wrap">
    <div>© <span id="year"></span> Андрей Кайманов</div>
    <div>Performance · E-com · Контент</div>
  </div>
</footer>

<button class="to-top" id="toTop" aria-label="Наверх" title="Наверх">↑</button>

<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
<script src="/config.js"></script>
<script src="/longreads.js"></script>
<script src="/case.js"></script>
<script src="/backtop.js"></script>
</body>
</html>
`;
}

// --- рендер каждого кейса ---
const done = [];
for (const c of cases) {
  await send('Page.navigate', { url: `${baseUrl}/case.html?slug=${encodeURIComponent(c.slug)}` });
  // ждём, пока контент отрисуется (появится .case-lead или .metric)
  let ok = false;
  for (let i = 0; i < 40; i++) {
    await new Promise(r => setTimeout(r, 300));
    const ready = await ev("!!document.querySelector('#caseDetail .case-lead, #caseDetail h1')");
    if (ready) { ok = true; break; }
  }
  await new Promise(r => setTimeout(r, 600)); // добить асинхронные под-компоненты (лонгриды)
  const inner = await ev("document.getElementById('caseDetail').innerHTML");
  if (!ok || !inner) { console.log(`  ! пропуск ${c.slug} (не отрисовался)`); continue; }
  const dir = path.join(ROOT, 'cases', c.slug);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'index.html'), pageHtml(c, inner));
  done.push(c);
  console.log(`  ✓ /cases/${c.slug}/  (${inner.length} симв.)`);
}

// --- sitemap.xml ---
const today = new Date().toISOString().slice(0, 10);
const urls = [
  { loc: `${SITE}/`, priority: '1.0', freq: 'weekly' },
  ...done.map(c => ({ loc: `${SITE}/cases/${c.slug}/`, priority: '0.8', freq: 'monthly' }))
];
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `  <url>
    <loc>${u.loc}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${u.freq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`).join('\n')}
</urlset>
`;
fs.writeFileSync(path.join(ROOT, 'sitemap-main.xml'), sitemap);
console.log(`sitemap-main.xml: ${urls.length} URL (главная + кейсы; блог — в sitemap-blog.xml, генерит Jekyll)`);

ws.close();
process.exit(0);
