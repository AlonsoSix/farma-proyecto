(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    const config = require('../services/config.js');
    module.exports = factory(config);
  } else {
    root.FarmaFormatters = factory(root.FarmaConfig);
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (config) {
  'use strict';

  const defaultImg = (config && config.IMG_VACIA) || '';

  function escapeHtml(texto) {
    return String(texto ?? '').replace(/[&<>"']/g, c => (
      { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
    ));
  }

  function formatSoles(numero) {
    const n = Number(numero ?? 0);
    return 'S/ ' + (isNaN(n) ? '0.00' : n.toFixed(2));
  }

  function normalizeText(texto) {
    return String(texto ?? '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }

  function resolveImageUrl(url, isPaginasSubdir) {
    if (!url) return defaultImg;
    const ruta = String(url).trim();
    if (/^(https?:|data:|blob:)/i.test(ruta)) return ruta;
    const limpia = ruta.replace(/^\/+/, '');
    if (limpia.startsWith('../')) return limpia;
    return (isPaginasSubdir ? '../' : '') + limpia;
  }

  function showToast(mensaje, tipo = 'info') {
    if (typeof document === 'undefined') return;

    // Probar primero con toastAviso (usado en tienda y páginas)
    const el = document.getElementById('toastAviso') || document.getElementById('adminToast');
    const msgEl = document.getElementById('toastTexto') || document.getElementById('adminToastMsg');

    if (!el || !msgEl || !window.bootstrap) {
      alert(mensaje);
      return;
    }

    msgEl.textContent = mensaje;
    if (document.getElementById('adminToastIcon')) {
      const icon = document.getElementById('adminToastIcon');
      el.classList.remove('bg-dark', 'bg-success', 'bg-danger', 'bg-warning', 'text-dark');
      if (tipo === 'success') {
        el.classList.add('bg-success');
        icon.className = 'bi bi-check-circle fs-5';
      } else if (tipo === 'error') {
        el.classList.add('bg-danger');
        icon.className = 'bi bi-exclamation-octagon fs-5';
      } else {
        el.classList.add('bg-dark');
        icon.className = 'bi bi-info-circle fs-5';
      }
    }

    bootstrap.Toast.getOrCreateInstance(el, { delay: 3000 }).show();
  }

  return {
    escapeHtml,
    formatSoles,
    normalizeText,
    resolveImageUrl,
    showToast
  };
});
