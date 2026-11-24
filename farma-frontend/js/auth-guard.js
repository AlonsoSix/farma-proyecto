/* =====================================================================
   Puerta de acceso de la tienda (auth-guard.js)
   Se carga en el <head> de TODAS las páginas excepto login.html.

   - Al abrir la aplicación en una pestaña nueva no hay marca de sesión:
     se envía siempre a login.html (aunque quede una sesión vieja en
     localStorage). El carrito NO se borra.
   - Después de iniciar sesión se crea una marca en sessionStorage; mientras
     la pestaña siga abierta se puede navegar con normalidad.
   - admin.html y reportes.html requieren rol ADMIN.
   ===================================================================== */
(function () {
  'use strict';

  var pagina = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
  if (pagina === 'login.html') return;   // el login nunca se protege a sí mismo

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

  // Se lee directamente del sessionStorage del entorno (en el navegador es el
  // mismo que usa Farma) para que el guard funcione también en pruebas aisladas.
  var sesionActiva = (function () {
    try { return sessionStorage.getItem('farma_sesion_activa') === '1'; }
    catch (e) { return false; }
  })();

  if (!sesionActiva || !sesion || sesion.id == null) {
    var destino = pagina + location.search + location.hash;
    var urlLogin = 'login.html';
    // En el inicio no hace falta recordar "next"; en el resto sí, para volver
    // a la página que el usuario quería ver justo después de autenticarse.
    if (pagina !== 'index.html') {
      urlLogin += '?next=' + encodeURIComponent(destino);
    }
    location.replace(urlLogin);
    return;
  }

  if (soloAdmin && String(sesion.rol || '').toUpperCase() !== 'ADMIN') {
    location.replace('index.html?sinPermiso=1');
  }
})();
