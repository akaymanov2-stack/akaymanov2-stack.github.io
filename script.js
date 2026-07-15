// ============================================================
//  Supabase client + рендер контента из БД
// ============================================================
const sb = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);

// Год в футере
document.getElementById('year').textContent = new Date().getFullYear();

// Экранирование текста из БД перед вставкой в разметку
const esc = s => String(s ?? '').replace(/[&<>"']/g, c =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// Появление при скролле. Надёжно: фолбэк без IntersectionObserver.
const revealNow = root => root.querySelectorAll('.reveal').forEach(el => el.classList.add('on'));
let io = null;
if ('IntersectionObserver' in window) {
  io = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('on'); io.unobserve(e.target); }
    });
  }, { threshold: 0, rootMargin: '0px 0px -8% 0px' });
}
// Статика — появление по скроллу; если observer недоступен, показываем сразу.
const observeReveals = root => {
  if (!io) { revealNow(root); return; }
  root.querySelectorAll('.reveal').forEach(el => io.observe(el));
};
// Динамический контент (кейсы, видео) показываем сразу после рендера — без
// зависимости от скролла/observer'а (частая причина «пустых» блоков в мобильных
// вебвью). Плавное появление — через кадр.
const revealSoon = root => requestAnimationFrame(() => requestAnimationFrame(() => revealNow(root)));

// Статические блоки страницы (статы, «Проекты разных лет», контакты).
observeReveals(document);

// ----- Кейсы --------------------------------------------------
function renderCases(rows) {
  const grid = document.getElementById('caseGrid');
  grid.innerHTML = rows.map(c => {
    const kpis = (c.kpis || []).map(k => `<span>${esc(k)}</span>`).join('');
    return `
      <a class="card reveal" href="case.html?slug=${encodeURIComponent(c.slug || '')}" data-cat="${esc(c.category)}">
        <span class="tag">${esc(c.tag)}</span>
        <div class="metric">${esc(c.metric)}</div>
        <h3>${esc(c.title)}</h3>
        <p>${esc(c.description)}</p>
        <div class="kpis">${kpis}</div>
        <span class="case-more">Открыть кейс →</span>
      </a>`;
  }).join('');
  revealSoon(grid);
  wireFilters();
}

// ----- Фильтр кейсов -----------------------------------------
function wireFilters() {
  const btns = document.querySelectorAll('.filters button');
  const cards = document.querySelectorAll('#caseGrid .card');
  btns.forEach(b => {
    b.onclick = () => {
      btns.forEach(x => x.classList.remove('active'));
      b.classList.add('active');
      const f = b.dataset.f;
      cards.forEach(c => c.classList.toggle('hidden', f !== 'all' && c.dataset.cat !== f));
    };
  });
}

// ----- Модальный плеер ---------------------------------------
const modal = document.getElementById('videoModal');
const modalVideo = document.getElementById('modalVideo');

function openModal(url) {
  modalVideo.src = url;
  modal.classList.add('open');
  modal.setAttribute('aria-hidden', 'false');
  modalVideo.play().catch(() => {});
}
function closeModal() {
  modal.classList.remove('open');
  modal.setAttribute('aria-hidden', 'true');
  modalVideo.pause();
  modalVideo.removeAttribute('src');
  modalVideo.load();
}
document.getElementById('modalClose').addEventListener('click', closeModal);
modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

// ----- Видео --------------------------------------------------
function renderVideos(rows) {
  const grid = document.getElementById('vidGrid');
  grid.innerHTML = rows.map(v => {
    const videoUrl = sb.storage.from('media').getPublicUrl(v.storage_path).data.publicUrl;
    const poster = v.poster_path
      ? sb.storage.from('media').getPublicUrl(v.poster_path).data.publicUrl : '';
    const bg = poster ? ` style="background-image:url('${esc(poster)}')"` : '';
    return `
      <a class="vid reveal" href="${esc(videoUrl)}" data-video="${esc(videoUrl)}" target="_blank" rel="noopener">
        <div class="thumb"${bg}><div class="play">▶</div></div>
        <div class="meta"><b>${esc(v.title)}</b><span>${esc(v.subtitle || '')}</span></div>
      </a>`;
  }).join('');
  revealSoon(grid);
  grid.querySelectorAll('.vid').forEach(a =>
    a.addEventListener('click', e => { e.preventDefault(); openModal(a.dataset.video); }));
}

// ----- Загрузка данных ---------------------------------------
async function load() {
  const [cases, videos] = await Promise.all([
    sb.from('cases').select('*').order('sort'),
    sb.from('videos').select('*').order('sort'),
  ]);
  if (cases.error)  console.error('Ошибка загрузки кейсов:', cases.error.message);
  else              renderCases(cases.data);
  if (videos.error) console.error('Ошибка загрузки видео:', videos.error.message);
  else              renderVideos(videos.data);
}
load();
