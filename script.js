// ============================================================
//  Главная: рендер кейсов и видео из Supabase.
//
//  Файл намеренно не падает целиком: сеть до Supabase нестабильна
//  (периодические таймауты), поэтому инициализация клиента защищена,
//  запросы идут с таймаутом и повторами, а показ блоков страницы живёт
//  в отдельном reveal.js и от этого файла не зависит.
// ============================================================

// Год в футере
const yearEl = document.getElementById('year');
if (yearEl) yearEl.textContent = new Date().getFullYear();

// Экранирование текста из БД перед вставкой в разметку
const esc = s => String(s ?? '').replace(/[&<>"']/g, c =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// Показ блоков — из reveal.js. Фолбэки на случай, если он не загрузился.
const revealIn = root => (window.revealIn || (r => r.querySelectorAll('.reveal')
  .forEach(el => el.classList.add('on'))))(root);

// Клиент Supabase. Если библиотека не поднялась — работаем без неё:
// статика страницы уже отрисована, динамические блоки покажут заглушку.
let sb = null;
try {
  if (window.supabase && window.SUPABASE_URL && window.SUPABASE_ANON_KEY) {
    sb = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
  }
} catch (e) {
  console.error('Supabase init failed:', e);
}

// Публичный URL файла в сторадже. Это просто склейка пути, поэтому
// считаем её сами и не зависим от того, поднялся ли клиент.
// Кодирование через encodeURI — ровно как в storage-js getPublicUrl,
// чтобы адреса совпали с теми, что работали раньше.
const pub = path => path
  ? encodeURI(`${window.SUPABASE_URL}/storage/v1/object/public/media/${path}`)
  : '';

// ----- Запрос с таймаутом и повторами -------------------------
// Без таймаута зависший запрос оставляет блок пустым навсегда.
function withTimeout(query, ms) {
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), ms);
  return Promise.resolve(query.abortSignal(ac.signal)).finally(() => clearTimeout(t));
}

async function fetchRows(build, { tries = 3, timeout = 10000 } = {}) {
  let last = null;
  for (let i = 0; i < tries; i++) {
    try {
      const { data, error } = await withTimeout(build(), timeout);
      if (!error) return { data: data || [] };
      last = error;
    } catch (e) {
      last = e;
    }
    if (i < tries - 1) await new Promise(r => setTimeout(r, 600 * (i + 1)));
  }
  return { error: last };
}

function fallback(el, text) {
  if (el) el.innerHTML = `<p class="sec-sub">${esc(text)}</p>`;
}

// ----- Кейсы --------------------------------------------------
function renderCases(rows) {
  const grid = document.getElementById('caseGrid');
  if (!grid) return;
  grid.innerHTML = rows.map(c => {
    const kpis = (c.kpis || []).map(k => `<span>${esc(k)}</span>`).join('');
    return `
      <a class="card reveal" href="/cases/${encodeURIComponent(c.slug || '')}/" data-cat="${esc(c.category)}">
        <span class="tag">${esc(c.tag)}</span>
        <div class="metric">${esc(c.metric)}</div>
        <h3>${esc(c.title)}</h3>
        <p>${esc(c.description)}</p>
        <div class="kpis">${kpis}</div>
        <span class="case-more">Открыть кейс →</span>
      </a>`;
  }).join('');
  revealIn(grid);
  applyFilter();
}

// ----- Фильтр кейсов -----------------------------------------
// Обработчики вешаются один раз на статичную разметку и ищут карточки
// в момент клика — поэтому кнопки живы независимо от того, успел ли
// отрисоваться грид.
let activeFilter = 'all';
function applyFilter() {
  document.querySelectorAll('#caseGrid .card').forEach(c =>
    c.classList.toggle('hidden', activeFilter !== 'all' && c.dataset.cat !== activeFilter));
}
function wireFilters() {
  const btns = document.querySelectorAll('.filters button');
  btns.forEach(b => b.addEventListener('click', () => {
    btns.forEach(x => x.classList.remove('active'));
    b.classList.add('active');
    activeFilter = b.dataset.f;
    applyFilter();
  }));
}
wireFilters();

// ----- Модальный плеер ---------------------------------------
const modal = document.getElementById('videoModal');
const modalVideo = document.getElementById('modalVideo');
const modalClose = document.getElementById('modalClose');

function openModal(url) {
  if (!modal || !modalVideo) return;
  modalVideo.src = url;
  modal.classList.add('open');
  modal.setAttribute('aria-hidden', 'false');
  modalVideo.play().catch(() => {});
}
function closeModal() {
  if (!modal || !modalVideo) return;
  modal.classList.remove('open');
  modal.setAttribute('aria-hidden', 'true');
  modalVideo.pause();
  modalVideo.removeAttribute('src');
  modalVideo.load();
}
if (modalClose) modalClose.addEventListener('click', closeModal);
if (modal) {
  modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });
}

// ----- Видео --------------------------------------------------
function renderVideos(rows) {
  const grid = document.getElementById('vidGrid');
  if (!grid) return;
  grid.innerHTML = rows.map(v => {
    const videoUrl = pub(v.storage_path);
    const poster = pub(v.poster_path);
    const bg = poster ? ` style="background-image:url('${esc(poster)}')"` : '';
    return `
      <a class="vid reveal" href="${esc(videoUrl)}" data-video="${esc(videoUrl)}" target="_blank" rel="noopener">
        <div class="thumb"${bg}><div class="play">▶</div></div>
        <div class="meta"><b>${esc(v.title)}</b><span>${esc(v.subtitle || '')}</span></div>
      </a>`;
  }).join('');
  revealIn(grid);
  grid.querySelectorAll('.vid').forEach(a =>
    a.addEventListener('click', e => { e.preventDefault(); openModal(a.dataset.video); }));
}

// ----- Загрузка данных ---------------------------------------
async function load() {
  if (!sb) {
    console.error('Supabase SDK недоступен — динамические блоки не загружены');
    fallback(document.getElementById('caseGrid'), 'Кейсы временно недоступны. Обновите страницу.');
    fallback(document.getElementById('vidGrid'), 'Видео временно недоступны. Обновите страницу.');
    return;
  }
  const [cases, videos] = await Promise.all([
    fetchRows(() => sb.from('cases').select('*').order('sort')),
    fetchRows(() => sb.from('videos').select('*').order('sort')),
  ]);
  if (cases.error) {
    console.error('Ошибка загрузки кейсов:', cases.error.message || cases.error);
    fallback(document.getElementById('caseGrid'), 'Не удалось загрузить кейсы. Обновите страницу.');
  } else {
    renderCases(cases.data);
  }
  if (videos.error) {
    console.error('Ошибка загрузки видео:', videos.error.message || videos.error);
    fallback(document.getElementById('vidGrid'), 'Не удалось загрузить видео. Обновите страницу.');
  } else {
    renderVideos(videos.data);
  }
}
load();
