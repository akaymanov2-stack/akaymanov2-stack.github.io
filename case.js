// ============================================================
//  Страница кейса: читает ?slug=, тянет кейс + блоки из Supabase
// ============================================================
const sb = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
document.getElementById('year').textContent = new Date().getFullYear();

const esc = s => String(s ?? '').replace(/[&<>"']/g, c =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const pub = path => path ? sb.storage.from('media').getPublicUrl(path).data.publicUrl : '';
// Многострочный текст → абзацы (пустая строка разделяет абзацы)
const paragraphs = t => String(t ?? '').split(/\n{2,}/)
  .map(p => `<p>${esc(p).replace(/\n/g, '<br>')}</p>`).join('');

const detail = document.getElementById('caseDetail');
const slug = new URLSearchParams(location.search).get('slug');

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
      // Компонент рендерится императивно после вставки (см. монтирование в load)
      return `<div class="cb-longreads" data-lr="1"></div>`;
    default:
      return '';
  }
}

function message(title, withBack = true) {
  return `<div class="case-empty"><h1>${esc(title)}</h1>`
    + (withBack ? `<a class="btn-main" href="index.html#cases">← Ко всем кейсам</a>` : '') + `</div>`;
}

async function load() {
  if (!slug) { detail.innerHTML = message('Кейс не указан'); return; }

  const { data: rows, error } = await sb.from('cases').select('*').eq('slug', slug).limit(1);
  if (error) { detail.innerHTML = message('Не удалось загрузить кейс'); return; }
  const c = rows && rows[0];
  if (!c) { detail.innerHTML = message('Кейс не найден'); return; }

  document.title = `${c.title} — Андрей Кайманов`;

  const { data: blocks } = await sb.from('case_blocks')
    .select('*').eq('case_id', c.id).order('sort');

  const cover = c.cover_path
    ? `<div class="case-cover" style="background-image:url('${esc(pub(c.cover_path))}')"></div>` : '';
  const kpis = (c.kpis || []).length
    ? `<div class="kpis">${c.kpis.map(k => `<span>${esc(k)}</span>`).join('')}</div>` : '';
  const body = (blocks && blocks.length)
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

  // Императивные компоненты внутри блоков (например, список лонгридов)
  detail.querySelectorAll('[data-lr]').forEach(el => {
    if (window.renderLongreads) window.renderLongreads(el);
  });
}
load();
