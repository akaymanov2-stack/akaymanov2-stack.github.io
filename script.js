document.getElementById('year').textContent = new Date().getFullYear();

// Фильтр кейсов
const btns = document.querySelectorAll('.filters button');
const cards = document.querySelectorAll('#caseGrid .card');
btns.forEach(b => b.addEventListener('click', () => {
  btns.forEach(x => x.classList.remove('active'));
  b.classList.add('active');
  const f = b.dataset.f;
  cards.forEach(c => {
    c.classList.toggle('hidden', f !== 'all' && c.dataset.cat !== f);
  });
}));

// Появление при скролле
const io = new IntersectionObserver(entries => {
  entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('on'); io.unobserve(e.target); } });
}, {threshold:.12});
document.querySelectorAll('.reveal').forEach(el => io.observe(el));
