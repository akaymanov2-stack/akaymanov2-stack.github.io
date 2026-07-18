// ============================================================
//  Публичная библиотека: читает список книг из Supabase и рендерит
// ============================================================
const sb = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
document.getElementById('year').textContent = new Date().getFullYear();

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

async function load() {
  const { data, error } = await sb.from('books')
    .select('*').order('sort').order('created_at', { ascending: false });
  if (error) {
    document.getElementById('bookGrid').innerHTML =
      '<p class="sec-sub">Не удалось загрузить библиотеку.</p>';
    console.error('books load error:', error.message);
    return;
  }
  render(data || []);
}
load();
