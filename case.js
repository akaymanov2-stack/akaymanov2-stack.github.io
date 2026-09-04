// ============================================================
//  Страница кейса: читает slug, тянет кейс + блоки из Supabase.
//
//  Страницы /cases/<slug>/ пререндерены — контент в HTML уже есть.
//  Поэтому файл устроен так, чтобы сбой сети никогда не ухудшал страницу:
//  интерактив готовой разметки поднимается сразу, а обновление из БД
//  либо проходит, либо тихо пропускается.
// ============================================================
const detail = document.getElementById('caseDetail');
// Пререндер отличаем по тому, что в контейнере уже есть разметка.
const hasPrerender = !!(detail && detail.children.length);

const yearEl = document.getElementById('year');
if (yearEl) yearEl.textContent = new Date().getFullYear();

const esc = s => String(s ?? '').replace(/[&<>"']/g, c =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
// Публичный URL в сторадже — та же склейка, что делает storage-js.
const pub = path => path
  ? encodeURI(`${window.SUPABASE_URL}/storage/v1/object/public/media/${path}`) : '';
// Многострочный текст → абзацы (пустая строка разделяет абзацы)
const paragraphs = t => String(t ?? '').split(/\n{2,}/)
  .map(p => `<p>${esc(p).replace(/\n/g, '<br>')}</p>`).join('');

// Slug берём из ?slug= (старые ссылки) либо из пути /cases/<slug>/ (пререндер).
const slug = new URLSearchParams(location.search).get('slug')
  || (location.pathname.match(/\/cases\/([^/]+)\/?/) || [])[1]
  || null;

// Императивные компоненты внутри блоков (список лонгридов с кнопкой
// «Смотреть больше»). Вызываем и по пререндеру, и после перерисовки: иначе
// при недоступном Supabase кнопка в уже готовой разметке остаётся мёртвой.
function mountBlocks() {
  if (!detail) return;
  detail.querySelectorAll('[data-lr]').forEach(el => {
    if (window.renderLongreads) window.renderLongreads(el);
  });
}
mountBlocks();

let sb = null;
try {
  if (window.supabase && window.SUPABASE_URL && window.SUPABASE_ANON_KEY) {
    sb = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
  }
} catch (e) {
  console.error('Supabase init failed:', e);
}

// Запрос с таймаутом и повторами — сеть до Supabase нестабильна.
async function fetchRows(build, { tries = 3, timeout = 10000 } = {}) {
  let last = null;
  for (let i = 0; i < tries; i++) {
    const ac = new AbortController();
    const t = setTimeout(() => ac.abort(), timeout);
    try {
      const { data, error } = await build().abortSignal(ac.signal);
      if (!error) return { data: data || [] };
      last = error;
    } catch (e) {
      last = e;
    } finally {
      clearTimeout(t);
    }
    if (i < tries - 1) await new Promise(r => setTimeout(r, 600 * (i + 1)));
  }
  return { error: last };
}

// ----- Рендер одного блока контента --------------------------
function renderBlock(b) {
  const d = b.data || {};
  switch (b.type) {
    case 'heading':
      return `<h2 class="cb-heading">${esc(d.text)}</h2>`;
    case 'text':
      return `<div class="cb-text">${paragraphs(d.text)}</div>`;
    case 'image':
      return `<figure class="cb-image"><img src="${esc(pub(d.path))}" alt="${esc(d.caption || '')}" loading="lazy">`
        + (d.caption ? `<figcaption>${esc(d.caption)}</figcaption>` : '') + `</figure>`;
    case 'video':
      return `<figure class="cb-video"><video controls preload="metadata"`
        + (d.poster ? ` poster="${esc(pub(d.poster))}"` : '')
        + ` src="${esc(pub(d.path))}"></video>`
        + (d.caption ? `<figcaption>${esc(d.caption)}</figcaption>` : '') + `</figure>`;
    case 'gallery':
      return `<div class="cb-gallery">`
        + (d.images || []).map(p => `<img src="${esc(pub(p))}" alt="" loading="lazy">`).join('')
        + `</div>`;
    case 'quote':
      return `<blockquote class="cb-quote">${esc(d.text)}`
        + (d.author ? `<cite>${esc(d.author)}</cite>` : '') + `</blockquote>`;
    case 'metrics':
      return `<div class="cb-metrics">`
        + (d.items || []).map(m => `<div class="cb-metric"><b>${esc(m.value)}</b><span>${esc(m.label)}</span></div>`).join('')
        + `</div>`;
    case 'table':
      return `<figure class="cb-table-wrap"><table class="cb-table">`
        + (d.columns ? `<thead><tr>${d.columns.map(c => `<th>${esc(c)}</th>`).join('')}</tr></thead>` : '')
        + `<tbody>` + (d.rows || []).map(r => `<tr>${r.map(cell => `<td>${esc(cell)}</td>`).join('')}</tr>`).join('') + `</tbody>`
        + `</table>` + (d.caption ? `<figcaption>${esc(d.caption)}</figcaption>` : '') + `</figure>`;
    case 'longreads':
      // Компонент рендерится императивно после вставки (см. mountBlocks)
      return `<div class="cb-longreads" data-lr="1"></div>`;
    default:
      return '';
  }
}

function message(title, withBack = true) {
  return `<div class="case-empty"><h1>${esc(title)}</h1>`
    + (withBack ? `<a class="btn-main" href="/#cases">← Ко всем кейсам</a>` : '') + `</div>`;
}

// Заглушку показываем только там, где показывать больше нечего: на
// пререндеренной странице готовый контент важнее сообщения об ошибке.
function bail(title, err) {
  if (err) console.error(`${title}:`, err.message || err);
  if (!hasPrerender && detail) detail.innerHTML = message(title);
}

async function load() {
  if (!detail) return;
  if (!slug) { bail('Кейс не указан'); return; }
  if (!sb) { bail('Не удалось загрузить кейс', 'Supabase SDK недоступен'); return; }

  const res = await fetchRows(() => sb.from('cases').select('*').eq('slug', slug).limit(1));
  if (res.error) { bail('Не удалось загрузить кейс', res.error); return; }
  const c = res.data[0];
  if (!c) { bail('Кейс не найден'); return; }

  document.title = `${c.title} — Андрей Кайманов`;

  // Канонический адрес кейса — чистый URL пререндера (против дублей ?slug=)
  let canon = document.querySelector('link[rel="canonical"]');
  if (!canon) { canon = document.createElement('link'); canon.rel = 'canonical'; document.head.appendChild(canon); }
  canon.href = `https://kaymanov.ru/cases/${c.slug}/`;

  const blocksRes = await fetchRows(() => sb.from('case_blocks')
    .select('*').eq('case_id', c.id).order('sort'));
  // Блоки не пришли, а готовая разметка есть — оставляем её нетронутой.
  if (blocksRes.error && hasPrerender) {
    console.error('Ошибка загрузки блоков кейса:', blocksRes.error.message || blocksRes.error);
    return;
  }
  const blocks = blocksRes.data || [];

  const cover = c.cover_path
    ? `<div class="case-cover" style="background-image:url('${esc(pub(c.cover_path))}')"></div>` : '';
  const kpis = (c.kpis || []).length
    ? `<div class="kpis">${c.kpis.map(k => `<span>${esc(k)}</span>`).join('')}</div>` : '';
  const body = blocks.length
    ? `<div class="case-body">${blocks.map(renderBlock).join('')}</div>`
    : `<div class="case-empty">Подробное описание кейса скоро появится.</div>`;
  const cta = c.link_url
    ? `<a class="btn-main case-cta" href="${esc(c.link_url)}" target="_blank" rel="noopener">${esc(c.link_label || 'Подробнее →')}</a>` : '';

  detail.innerHTML = `
    ${cover}
    <span class="tag">${esc(c.tag)}</span>
    <div class="metric">${esc(c.metric)}</div>
    <h1>${esc(c.title)}</h1>
    <p class="case-lead">${esc(c.description)}</p>
    ${kpis}
    ${body}
    ${cta}
  `;

  mountBlocks();
}
load();
