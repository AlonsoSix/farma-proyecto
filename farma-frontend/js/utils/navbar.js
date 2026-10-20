/**
 * BOTICAS POR TU SALUD - Navbar
 * Agrega sombra al navbar cuando la página se desplaza.
 */
(function () {
  'use strict';

  var nav = document.querySelector('.main-nav');
  if (!nav) return;

  function actualizar() {
    nav.classList.toggle('is-scrolled', window.scrollY > 8);
  }

  actualizar();
  window.addEventListener('scroll', actualizar, { passive: true });
})();
