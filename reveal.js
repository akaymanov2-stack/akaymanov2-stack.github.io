// ============================================================
//  Появление блоков при скролле.
//
//  Отдельный файл без зависимостей — намеренно. Стартовое состояние
//  .reveal (opacity:0) включается ТОЛЬКО классом .has-js, который ставит
//  этот скрипт. Если он почему-то не выполнился, контент остаётся
//  видимым, а не прозрачным навсегда. Раньше показ блоков жил внутри
//  script.js рядом с инициализацией Supabase: падение внешнего CDN
//  убивало весь файл, и статика («Сайты», статы, контакты) не появлялась.
// ============================================================
(function () {
  document.documentElement.classList.add('has-js');

  var list = function (root) { return (root || document).querySelectorAll('.reveal'); };
  var revealAll = function (root) {
    Array.prototype.forEach.call(list(root), function (n) { n.classList.add('on'); });
  };

  var io = null;
  if ('IntersectionObserver' in window) {
    io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('on'); io.unobserve(e.target); }
      });
    }, { threshold: 0, rootMargin: '0px 0px -8% 0px' });
  }

  // Статика — появление по скроллу; без observer'а показываем сразу.
  window.observeReveals = function (root) {
    if (!io) { revealAll(root); return; }
    Array.prototype.forEach.call(list(root), function (n) { io.observe(n); });
  };

  // Динамический контент (кейсы, видео) показываем сразу после рендера — без
  // зависимости от скролла/observer'а (частая причина «пустых» блоков).
  window.revealIn = function (root) {
    requestAnimationFrame(function () {
      requestAnimationFrame(function () { revealAll(root); });
    });
  };

  function start() {
    window.observeReveals(document);
    // Предохранитель: если через 2.5 с не появилось ни одного видимого блока,
    // значит observer не сработал — показываем всё принудительно.
    setTimeout(function () {
      if (!document.querySelector('.reveal.on') && list().length) revealAll();
    }, 2500);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
