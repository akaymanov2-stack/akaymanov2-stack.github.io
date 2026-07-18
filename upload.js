// ============================================================
//  Управление библиотекой: вход (Supabase Auth), список книг,
//  создание/редактирование/удаление. Доступ ограничен RLS.
// ============================================================
const sb = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
const $ = id => document.getElementById(id);

const esc = s => String(s ?? '').replace(/[&<>"']/g, c =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fileUrl = path => path
  ? sb.storage.from('library').getPublicUrl(path).data.publicUrl : '';

// Состояние редактирования
let editingId = null;
let editingCoverPath = null;
let editingPdfPath = null;

// ---------- Переключение экранов ----------
function showLogged(isLogged) {
  $('bootMsg').hidden = true;
  $('loginBox').hidden = isLogged;
  $('adminBox').hidden = !isLogged;
  $('logoutBtn').hidden = !isLogged;
  if (isLogged) showList();
}
function showList() {
  $('formView').hidden = true;
  $('listView').hidden = false;
  loadBooks();
}
function showForm() {
  $('listView').hidden = true;
  $('formView').hidden = false;
}

// ---------- Список книг ----------
async function loadBooks() {
  const box = $('adminBooks');
  const { data, error } = await sb.from('books')
    .select('*').order('sort').order('created_at', { ascending: false });
  if (error) { box.innerHTML = `<p class="sec-sub">Ошибка загрузки: ${esc(error.message)}</p>`; return; }
  if (!data.length) { box.innerHTML = '<p class="sec-sub">Пока книг нет. Нажми «Добавить книгу».</p>'; return; }
  box.innerHTML = data.map(b => {
    const thumb = b.cover_path
      ? `<div class="admin-book-thumb" style="background-image:url('${esc(fileUrl(b.cover_path))}')"></div>`
      : `<div class="admin-book-thumb admin-book-thumb--empty">PDF</div>`;
    const meta = [b.author, b.year].filter(Boolean).map(esc).join(' · ');
    return `<div class="admin-book">
      ${thumb}
      <div class="admin-book-info">
        <b>${esc(b.title)}</b>
        ${meta ? `<span>${meta}</span>` : ''}
        ${!b.cover_path ? '<span class="admin-book-warn">без обложки</span>' : ''}
      </div>
      <div class="admin-book-actions">
        <button class="btn-ghost" data-edit="${b.id}" type="button">Редактировать</button>
        <button class="btn-del" data-del="${b.id}" data-title="${esc(b.title)}" type="button">Удалить</button>
      </div>
    </div>`;
  }).join('');
  // сохраним данные для быстрого редактирования
  box.__books = data;
  box.querySelectorAll('[data-edit]').forEach(btn =>
    btn.addEventListener('click', () => openEdit(data.find(x => x.id === btn.dataset.edit))));
  box.querySelectorAll('[data-del]').forEach(btn =>
    btn.addEventListener('click', () => removeBook(btn.dataset.del, btn.dataset.title)));
}

// ---------- Открыть форму ----------
function fillCurrent(id, label, path, isImage) {
  const el = $(id);
  if (!path) { el.hidden = true; el.innerHTML = ''; return; }
  el.hidden = false;
  const preview = isImage
    ? `<img src="${esc(fileUrl(path))}" alt="">`
    : `<a href="${esc(fileUrl(path))}" target="_blank" rel="noopener">открыть текущий файл</a>`;
  el.innerHTML = `<span>${label}:</span> ${preview}`;
}

function openCreate() {
  editingId = null; editingCoverPath = null; editingPdfPath = null;
  $('bookForm').reset();
  $('formTitle').textContent = 'Добавить книгу';
  $('submitBtn').textContent = 'Загрузить книгу';
  $('currentCover').hidden = true;
  $('currentPdf').hidden = true;
  $('coverHint').textContent = '';
  $('pdfHint').textContent = 'обязательно';
  $('uploadMsg').textContent = '';
  showForm();
}

function openEdit(book) {
  if (!book) return;
  editingId = book.id;
  editingCoverPath = book.cover_path || null;
  editingPdfPath = book.pdf_path || null;
  $('bookForm').reset();
  $('title').value = book.title || '';
  $('author').value = book.author || '';
  $('bookYear').value = book.year || '';
  $('description').value = book.description || '';
  $('tags').value = (book.tags || []).join(', ');
  $('formTitle').textContent = 'Редактировать книгу';
  $('submitBtn').textContent = 'Сохранить изменения';
  fillCurrent('currentCover', 'Текущая обложка', book.cover_path, true);
  fillCurrent('currentPdf', 'Текущий файл', book.pdf_path, false);
  $('coverHint').textContent = book.cover_path ? 'оставь пустым, чтобы не менять' : 'обложки нет — можно добавить';
  $('pdfHint').textContent = 'оставь пустым, чтобы не менять';
  $('uploadMsg').textContent = '';
  showForm();
}

// ---------- Загрузка файла ----------
function safeName(file) {
  const dot = file.name.lastIndexOf('.');
  const ext = dot > -1 ? file.name.slice(dot + 1).toLowerCase().replace(/[^a-z0-9]/g, '') : 'bin';
  const rand = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  return `${rand}.${ext}`;
}
async function uploadFile(folder, file) {
  const path = `${folder}/${safeName(file)}`;
  const { error } = await sb.storage.from('library').upload(path, file, {
    cacheControl: '3600', upsert: false, contentType: file.type || undefined,
  });
  if (error) throw new Error('Загрузка файла: ' + error.message);
  return path;
}

// ---------- Сохранение (создание/редактирование) ----------
$('bookForm').addEventListener('submit', async e => {
  e.preventDefault();
  const msg = $('uploadMsg'), btn = $('submitBtn');
  const pdfFile = $('pdf').files[0];
  const coverFile = $('cover').files[0];
  if (!editingId && !pdfFile) { msg.textContent = 'Выберите PDF-файл.'; return; }

  btn.disabled = true;
  try {
    let pdf_path = editingPdfPath;
    if (pdfFile) { msg.textContent = 'Загружаем PDF…'; pdf_path = await uploadFile('pdf', pdfFile); }

    let cover_path = editingCoverPath;
    if (coverFile) { msg.textContent = 'Загружаем обложку…'; cover_path = await uploadFile('covers', coverFile); }

    const tags = $('tags').value.split(',').map(t => t.trim()).filter(Boolean);
    const row = {
      title: $('title').value.trim(),
      author: $('author').value.trim() || null,
      year: $('bookYear').value ? parseInt($('bookYear').value, 10) : null,
      description: $('description').value.trim() || null,
      tags: tags.length ? tags : null,
      cover_path, pdf_path,
    };

    msg.textContent = 'Сохраняем…';
    let error;
    if (editingId) ({ error } = await sb.from('books').update(row).eq('id', editingId));
    else           ({ error } = await sb.from('books').insert(row));
    if (error) throw new Error('Запись в базу: ' + error.message);

    msg.textContent = '✅ Сохранено';
    setTimeout(showList, 700);
  } catch (err) {
    msg.textContent = '❌ ' + err.message;
  } finally {
    btn.disabled = false;
  }
});

// ---------- Удаление ----------
async function removeBook(id, title) {
  if (!confirm(`Удалить книгу «${title}»? Действие необратимо.`)) return;
  const { error } = await sb.from('books').delete().eq('id', id);
  if (error) { alert('Не удалось удалить: ' + error.message); return; }
  loadBooks();
}

// ---------- Вход/выход ----------
$('loginForm').addEventListener('submit', async e => {
  e.preventDefault();
  const msg = $('loginMsg');
  msg.textContent = 'Входим…';
  const { error } = await sb.auth.signInWithPassword({
    email: $('email').value.trim(), password: $('password').value,
  });
  if (error) { msg.textContent = 'Ошибка входа: ' + error.message; return; }
  msg.textContent = '';
  showLogged(true);
});
$('logoutBtn').addEventListener('click', async () => { await sb.auth.signOut(); showLogged(false); });

// ---------- Кнопки навигации ----------
$('newBookBtn').addEventListener('click', openCreate);
$('backBtn').addEventListener('click', showList);

// ---------- Старт ----------
(async () => {
  const { data } = await sb.auth.getSession();
  showLogged(!!data.session);
})();
