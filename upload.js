// ============================================================
//  Страница загрузки книги: вход (Supabase Auth) + аплоад в Storage
//  и запись в таблицу books. Доступ ограничен политиками RLS.
// ============================================================
const sb = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);

const $ = id => document.getElementById(id);
const loginBox = $('loginBox'), uploadBox = $('uploadBox'), bootMsg = $('bootMsg');
const logoutBtn = $('logoutBtn');

function showLogged(isLogged) {
  bootMsg.hidden = true;
  loginBox.hidden = isLogged;
  uploadBox.hidden = !isLogged;
  logoutBtn.hidden = !isLogged;
}

// Определяем текущую сессию
(async () => {
  const { data } = await sb.auth.getSession();
  showLogged(!!data.session);
})();

// --- Вход ---
$('loginForm').addEventListener('submit', async e => {
  e.preventDefault();
  const msg = $('loginMsg');
  msg.textContent = 'Входим…';
  const { error } = await sb.auth.signInWithPassword({
    email: $('email').value.trim(),
    password: $('password').value,
  });
  if (error) { msg.textContent = 'Ошибка входа: ' + error.message; return; }
  msg.textContent = '';
  showLogged(true);
});

// --- Выход ---
logoutBtn.addEventListener('click', async () => {
  await sb.auth.signOut();
  showLogged(false);
});

// Безопасное имя файла: латиница/цифры + расширение
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

// --- Загрузка книги ---
$('bookForm').addEventListener('submit', async e => {
  e.preventDefault();
  const msg = $('uploadMsg'), btn = $('submitBtn');
  const pdfFile = $('pdf').files[0];
  const coverFile = $('cover').files[0];
  if (!pdfFile) { msg.textContent = 'Выберите PDF-файл.'; return; }

  btn.disabled = true;
  try {
    msg.textContent = 'Загружаем PDF…';
    const pdf_path = await uploadFile('pdf', pdfFile);

    let cover_path = null;
    if (coverFile) { msg.textContent = 'Загружаем обложку…'; cover_path = await uploadFile('covers', coverFile); }

    msg.textContent = 'Сохраняем…';
    const tags = $('tags').value.split(',').map(t => t.trim()).filter(Boolean);
    const { error } = await sb.from('books').insert({
      title: $('title').value.trim(),
      author: $('author').value.trim() || null,
      year: $('bookYear').value ? parseInt($('bookYear').value, 10) : null,
      description: $('description').value.trim() || null,
      tags: tags.length ? tags : null,
      cover_path, pdf_path,
    });
    if (error) throw new Error('Запись в базу: ' + error.message);

    msg.innerHTML = '✅ Готово! Книга добавлена. <a href="/library/" target="_blank" rel="noopener">Открыть библиотеку</a>';
    e.target.reset();
  } catch (err) {
    msg.textContent = '❌ ' + err.message;
  } finally {
    btn.disabled = false;
  }
});
