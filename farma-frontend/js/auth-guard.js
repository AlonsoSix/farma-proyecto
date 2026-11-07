/* =====================================================================
   Puerta de acceso de la tienda (auth-guard.js)
   Se carga en el <head> de todas las páginas protegidas.
   - Sin sesión: redirige a login.html recordando la página solicitada.
   - admin.html y reportes.html: requieren rol ADMIN obligatoriamente.
   Utiliza Farma.leerSesion() de comun.js con respaldo local seguro.
   ===================================================================== */
(function () {
  'use strict';

  var pagina = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
  var soloAdmin = pagina === 'admin.html' || pagina === 'reportes.html';
  var sesion = (window.Farma && typeof Farma.leerSesion === 'function')
    ? Farma.leerSesion()
    : null;

  if (!sesion) {
    try {
      var raw = localStorage.getItem('farma_sesion');
      sesion = raw ? JSON.parse(raw) : null;
    } catch (e) {
      sesion = null;
    }
  }

  if (!sesion || sesion.id == null) {
    var destino = pagina + location.search + location.hash;
    location.replace('login.html?next=' + encodeURIComponent(destino));
    return;
  }

  if (soloAdmin && String(sesion.rol || '').toUpperCase() !== 'ADMIN') {
    location.replace('index.html?sinPermiso=1');
  }
})();
