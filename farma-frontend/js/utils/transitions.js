/**
 * BOTICAS POR TU SALUD - Transiciones de navegación
 * Fundido de salida antes de cambiar de página y limpieza al volver
 * con el botón "atrás" (bfcache). Respeta prefers-reduced-motion.
 */
(function () {
  'use strict';

  var DURACION_SALIDA = 150;
  var navegando = false;

  function prefiereReducido() {
    return typeof window.matchMedia === 'function'
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  function esNavegacionInterna(enlace, evento) {
    if (evento.defaultPrevented) return false;
    if (evento.button !== 0) return false;
    if (evento.metaKey || evento.ctrlKey || evento.shiftKey || evento.altKey) return false;
    if (enlace.target && enlace.target !== '_self') return false;
    if (enlace.hasAttribute('download')) return false;

    var href = enlace.getAttribute('href') || '';
    if (!href || href.charAt(0) === '#' || href.indexOf('javascript:') === 0) return false;

    try {
      var url = new URL(enlace.href, window.location.href);
      if (url.origin !== window.location.origin) return false;
      // Misma página + solo ancla: no es una navegación.
      if (url.pathname === window.location.pathname
        && url.search === window.location.search
        && url.hash) return false;
    } catch (e) {
      return false;
    }

    return true;
  }

  document.addEventListener('click', function (evento) {
    if (navegando || prefiereReducido()) return;

    var enlace = evento.target && evento.target.closest
      ? evento.target.closest('a[href]')
      : null;

    if (!enlace || !esNavegacionInterna(enlace, evento)) return;

    evento.preventDefault();
    navegando = true;
    document.body.classList.add('page-leaving');

    window.setTimeout(function () {
      window.location.href = enlace.href;
    }, DURACION_SALIDA);
  });

  // Al volver desde el historial, la página debe verse de nuevo.
  window.addEventListener('pageshow', function () {
    navegando = false;
    document.body.classList.remove('page-leaving');
  });
})();
