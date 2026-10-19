(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.FarmaConfig = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const API_URL = 'http://localhost:8081/api';
  const STORAGE_KEYS = {
    USER: 'farma_user',
    CART: 'farma_carrito'
  };

  const IMG_VACIA = 'data:image/svg+xml;utf8,' + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="300" height="240" viewBox="0 0 300 240">' +
    '<rect width="300" height="240" fill="#eef3f8"/>' +
    '<g fill="none" stroke="#9fb3c8" stroke-width="8" stroke-linecap="round">' +
    '<rect x="105" y="70" width="90" height="110" rx="14"/><path d="M125 70v-16h50v16M150 105v50M125 130h50"/></g></svg>'
  );

  return {
    API_URL,
    STORAGE_KEYS,
    IMG_VACIA
  };
});
