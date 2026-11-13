/**
 * =====================================================================
 * Boticas Por tu Salud - Módulo Central Compartido (comun.js)
 * 
 * Principios SOLID y Buenas Prácticas aplicadas:
 * - SRP (Single Responsibility): Centraliza la configuración, formateo,
 *   validación, cálculo de dominio de carrito y gestión de sesión.
 * - DRY (Don't Repeat Yourself): Elimina la duplicación de funciones utilitarias
 *   en todos los scripts del frontend.
 * - Testabilidad: Compatible con navegadores web y entornos Node.js (CommonJS).
 * =====================================================================
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    // Entorno Node.js / Jest / Node Test Runner
    module.exports = factory();
  } else {
    // Entorno de Navegador Web
    var farma = factory();
    root.Farma = farma;

    // Exportar alias globales para máxima compatibilidad con código existente
    root.API_URL = farma.config.API_URL;
    root.CLAVE_SESION = farma.config.CLAVE_SESION;
    root.CLAVE_CARRITO = farma.config.CLAVE_CARRITO;
    root.CLAVE_ULTIMO_CORREO = farma.config.CLAVE_ULTIMO_CORREO;
    root.IMG_VACIA = farma.IMG_VACIA;
    root.soles = farma.soles;
    root.esc = farma.esc;
    root.rutaImagen = farma.rutaImagen;
    root.leerSesion = farma.leerSesion;
    root.guardarSesion = farma.guardarSesion;
    root.cerrarSesion = farma.cerrarSesion;
    root.esAdmin = farma.esAdmin;
    root.obtenerIdUsuario = farma.obtenerIdUsuario;
    root.obtenerCabeceraAuth = farma.obtenerCabeceraAuth;
    root.mostrarToast = farma.mostrarToast;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  /* ---------- Configuración Global ---------- */
  // El backend se sirve siempre en el puerto 8081 del mismo host que abre la web.
  // Así funciona en localhost y también al probar desde el móvil por la red local.
  var hostAPI = 'localhost';
  try {
    if (typeof location !== 'undefined' && location.hostname) hostAPI = location.hostname;
  } catch (e) { /* entorno Node.js para pruebas */ }

  var config = {
    API_URL: 'http://' + hostAPI + ':8081/api',
    CLAVE_SESION: 'farma_sesion',
    CLAVE_CARRITO: 'farma_carrito',
    CLAVE_ULTIMO_CORREO: 'farma_ultimo_correo',
    FACTOR_IGV: 1.18
  };

  /* Placeholder SVG para productos sin fotografía */
  var IMG_VACIA = 'data:image/svg+xml;utf8,' + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="300" height="240" viewBox="0 0 300 240">' +
    '<rect width="300" height="240" fill="#eef3f8"/>' +
    '<g fill="none" stroke="#9fb3c8" stroke-width="8" stroke-linecap="round">' +
    '<rect x="105" y="70" width="90" height="110" rx="14"/><path d="M125 70v-16h50v16M150 105v50M125 130h50"/></g></svg>'
  );

  /* ---------- Formateadores y Sanitización ---------- */

  /** Formatea cualquier número o string numérico a moneda peruana (S/ 0.00). */
  function soles(valor) {
    var n = Number(valor);
    if (isNaN(n) || !isFinite(n)) n = 0;
    return 'S/ ' + n.toFixed(2);
  }

  /** Escapa caracteres especiales de HTML para prevenir vulnerabilidades XSS. */
  function esc(texto) {
    if (texto == null) return '';
    return String(texto)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')
      .replace(/`/g, '&#96;');
  }

  /** Normaliza la ruta de la imagen o devuelve el placeholder si no existe. */
  function rutaImagen(url) {
    if (!url || !String(url).trim()) return IMG_VACIA;
    var u = String(url).trim();
    if (u.indexOf('http://') === 0 || u.indexOf('https://') === 0 || u.indexOf('data:') === 0) {
      return u;
    }
    u = u.replace(/^\/+/, '');
    if (!u.startsWith('img/') && !u.startsWith('docs/')) {
      u = 'img/productos/' + u;
    }
    return u;
  }

  /* ---------- Validaciones de Formularios ---------- */

  /** Valida si un DNI peruano contiene exactamente 8 dígitos numéricos. */
  function esDniValido(dni) {
    if (!dni) return false;
    return /^\d{8}$/.test(String(dni).trim());
  }

  /** Valida el formato de un correo electrónico. */
  function esCorreoValido(correo) {
    if (!correo) return false;
    return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(correo).trim());
  }

  /** Valida longitud mínima de contraseña (al menos 6 caracteres). */
  function esContrasenaValida(contrasena) {
    if (!contrasena) return false;
    return String(contrasena).length >= 6;
  }

  /* ---------- Lógica de Negocio y Cálculo de Carrito (Puras y Testeables) ---------- */

  /** Calcula el precio final unitario aplicando el porcentaje de descuento si existe. */
  function calcularPrecioFinal(precio, descuento) {
    var p = Number(precio) || 0;
    var d = Number(descuento) || 0;
    if (d <= 0 || d > 90) return p;
    var final = p * (1 - (d / 100));
    return Math.round(final * 100) / 100;
  }

  /** Calcula el subtotal de una línea de compra. */
  function calcularSubtotalItem(precio, descuento, cantidad) {
    var cant = Number(cantidad) || 0;
    if (cant <= 0) return 0;
    var precioUnitarioFinal = calcularPrecioFinal(precio, descuento);
    return Math.round(precioUnitarioFinal * cant * 100) / 100;
  }

  /**
   * Calcula los totales financieros de una lista de productos en el carrito:
   * subtotal original, descuento total, total a pagar, base imponible gravada e IGV (18%).
   */
  function calcularTotalesCarrito(items) {
    var lista = [];
    if (Array.isArray(items)) {
      lista = items;
    } else if (items && typeof items === 'object') {
      lista = Object.values(items);
    }

    var subtotalSinDescuento = 0;
    var total = 0;
    var totalUnidades = 0;

    for (var i = 0; i < lista.length; i++) {
      var item = lista[i];
      if (!item) continue;
      var cant = Number(item.cantidad) || 0;
      if (cant <= 0) continue;

      var precio = Number(item.precio) || 0;
      var desc = Number(item.descuento) || 0;
      var precioFinal = calcularPrecioFinal(precio, desc);

      subtotalSinDescuento += precio * cant;
      total += precioFinal * cant;
      totalUnidades += cant;
    }

    subtotalSinDescuento = Math.round(subtotalSinDescuento * 100) / 100;
    total = Math.round(total * 100) / 100;
    var descuentoTotal = Math.round((subtotalSinDescuento - total) * 100) / 100;
    var opGravada = Math.round((total / config.FACTOR_IGV) * 100) / 100;
    var igv = Math.round((total - opGravada) * 100) / 100;

    return {
      subtotalSinDescuento: subtotalSinDescuento,
      descuentoTotal: descuentoTotal,
      total: total,
      opGravada: opGravada,
      igv: igv,
      totalUnidades: totalUnidades
    };
  }

  /* ---------- Gestión de Sesión y Autenticación ---------- */

  /** Lee los datos de la sesión actual almacenada en localStorage. */
  function leerSesion() {
    if (typeof localStorage === 'undefined') return null;
    try {
      var guardado = localStorage.getItem(config.CLAVE_SESION);
      return guardado ? JSON.parse(guardado) : null;
    } catch (e) {
      return null;
    }
  }

  /** Guarda la sesión autenticada en localStorage. */
  function guardarSesion(sesion) {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem(config.CLAVE_SESION, JSON.stringify(sesion));
    } catch (e) {
      console.error('Error al guardar sesión:', e);
    }
  }

  /** Cierra la sesión activa y redirige al login con notificación. */
  function cerrarSesion() {
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.removeItem(config.CLAVE_SESION);
      } catch (e) {}
    }
    if (typeof location !== 'undefined') {
      location.replace('index.html');
    }
  }

  /** Comprueba si el usuario autenticado tiene rol de administrador. */
  function esAdmin() {
    var sesion = leerSesion();
    return !!(sesion && String(sesion.rol || '').toUpperCase() === 'ADMIN');
  }

  /** Retorna el identificador del usuario autenticado o null si es anónimo. */
  function obtenerIdUsuario() {
    var sesion = leerSesion();
    return sesion && sesion.id != null ? sesion.id : null;
  }

  /** Retorna las cabeceras requeridas para peticiones protegidas (X-Usuario-Id). */
  function obtenerCabeceraAuth() {
    var id = obtenerIdUsuario();
    return id != null ? { 'X-Usuario-Id': String(id) } : {};
  }

  /* ---------- Notificaciones Toast (Bootstrap 5) ---------- */

  /** Muestra una notificación emergente estilizada no intrusiva. */
  function mostrarToast(mensaje, tipo) {
    if (typeof document === 'undefined') return;
    var toastEl = document.getElementById('toastAviso');
    var mensajeEl = document.getElementById('toastMensaje');
    if (!toastEl || !mensajeEl) return;

    mensajeEl.textContent = mensaje || '';
    toastEl.classList.remove('text-bg-success', 'text-bg-danger', 'text-bg-warning', 'text-bg-info');

    if (tipo === 'exito' || tipo === 'success') {
      toastEl.classList.add('text-bg-success');
    } else if (tipo === 'error' || tipo === 'danger') {
      toastEl.classList.add('text-bg-danger');
    } else if (tipo === 'aviso' || tipo === 'warning') {
      toastEl.classList.add('text-bg-warning');
    } else {
      toastEl.classList.add('text-bg-info');
    }

    if (typeof bootstrap !== 'undefined' && bootstrap.Toast) {
      var bsToast = bootstrap.Toast.getOrCreateInstance(toastEl, { delay: 3500 });
      bsToast.show();
    }
  }

  return {
    config: config,
    IMG_VACIA: IMG_VACIA,
    soles: soles,
    esc: esc,
    rutaImagen: rutaImagen,
    esDniValido: esDniValido,
    esCorreoValido: esCorreoValido,
    esContrasenaValida: esContrasenaValida,
    calcularPrecioFinal: calcularPrecioFinal,
    calcularSubtotalItem: calcularSubtotalItem,
    calcularTotalesCarrito: calcularTotalesCarrito,
    leerSesion: leerSesion,
    guardarSesion: guardarSesion,
    cerrarSesion: cerrarSesion,
    esAdmin: esAdmin,
    obtenerIdUsuario: obtenerIdUsuario,
    obtenerCabeceraAuth: obtenerCabeceraAuth,
    mostrarToast: mostrarToast
  };
});
