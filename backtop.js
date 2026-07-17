// Кнопка «Наверх»: появляется после прокрутки, плавный возврат к началу.
(function () {
  const btn = document.getElementById('toTop');
  if (!btn) return;
  const toggle = () => btn.classList.toggle('show', window.scrollY > 500);
  window.addEventListener('scroll', toggle, { passive: true });
  btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
  toggle();
})();
