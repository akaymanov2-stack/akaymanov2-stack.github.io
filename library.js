// ============================================================
//  Публичная библиотека: читает список книг из Supabase и рендерит
// ============================================================
// Клиент защищён try/catch: падение библиотеки не должно ронять весь файл
// и оставлять страницу с пустым гридом без объяснения.
let sb = null;
try {
  if (window.supabase && window.SUPABASE_URL && window.SUPABASE_ANON_KEY) {
    sb = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
  }
} catch (e) {
  console.error('Supabase init failed:', e);
}

const yearEl = document.getElementById('year');
if (yearEl) yearEl.textContent = new Date().getFullYear();

const esc = s => String(s ?? '').replace(/[&<>"']/g, c =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fileUrl = (path, opts) => path
  ? sb.storage.from('library').getPublicUrl(path, opts).data.publicUrl : '';

function render(books) {
  const grid = document.getElementById('bookGrid');
  if (!books.length) {
    grid.innerHTML = '<p class="sec-sub">Пока пусто — книги скоро появятся.</p>';
    return;
  }
  grid.innerHTML = books.map(b => {
    const read = fileUrl(b.pdf_path);
    const dl = fileUrl(b.pdf_path, { download: true });
    const cover = b.cover_path
      ? `<img class="book-cover-img" src="${esc(fileUrl(b.cover_path))}" alt="${esc(b.title)}" loading="lazy">`
      : `<div class="book-cover book-cover--empty">PDF</div>`;
    const meta = [b.author, b.year].filter(Boolean).map(esc).join(' · ');
    const tags = (b.tags || []).length
      ? `<div class="book-tags">${b.tags.map(t => `<span>${esc(t)}</span>`).join('')}</div>` : '';
    return `
      <article class="book-card">
        ${cover}
        <div class="book-info">
          <h3>${esc(b.title)}</h3>
          ${meta ? `<div class="book-meta">${meta}</div>` : ''}
          ${b.description ? `<p>${esc(b.description)}</p>` : ''}
          ${tags}
          <div class="book-actions">
            <a class="btn-main" href="${esc(read)}" target="_blank" rel="noopener">Читать</a>
            <a class="btn-ghost" href="${esc(dl)}">Скачать</a>
          </div>
        </div>
      </article>`;
  }).join('');
}

function fail(msg, err) {
  console.error(msg, err || '');
  const grid = document.getElementById('bookGrid');
  if (grid) grid.innerHTML = '<p class="sec-sub">Не удалось загрузить библиотеку. Обновите страницу.</p>';
}

async function load() {
  if (!sb) { fail('Supabase SDK недоступен'); return; }
  // Сеть до Supabase нестабильна — запрос с таймаутом и повторами.
  for (let i = 0; i < 3; i++) {
    const ac = new AbortController();
    const t = setTimeout(() => ac.abort(), 10000);
    try {
      const { data, error } = await sb.from('books')
        .select('*').order('sort').order('created_at', { ascending: false })
        .abortSignal(ac.signal);
      if (!error) { render(data || []); return; }
      if (i === 2) { fail('books load error:', error.message); return; }
    } catch (e) {
      if (i === 2) { fail('books load error:', e); return; }
    } finally {
      clearTimeout(t);
    }
    await new Promise(r => setTimeout(r, 600 * (i + 1)));
  }
}
load();
