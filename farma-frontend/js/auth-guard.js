/* =====================================================================
   Puerta de acceso de la tienda.
   Se carga al inicio del <head> de todas las páginas protegidas.
   - Sin sesión: redirige a login.html y guarda la página que se quería ver.
   - admin.html y reportes.html: además exigen rol ADMIN.
   La sesión se guarda en localStorage con la clave farma_sesion.
   ===================================================================== */
(function () {
  'use strict';

  var pagina = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
  var soloAdmin = pagina === 'admin.html' || pagina === 'reportes.html';
  var sesion = null;

  try {
    sesion = JSON.parse(localStorage.getItem('farma_sesion'));
  } catch (e) {
    sesion = null;
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
