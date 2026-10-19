(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    const apiClient = require('./api-client.js');
    module.exports = factory(apiClient);
  } else {
    root.FarmaProductoService = factory(root.FarmaApiClient);
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (apiClient) {
  'use strict';

  class ProductoService {
    constructor(client = apiClient) {
      this.client = client;
    }

    getAll() {
      return this.client.get('/productos');
    }

    getById(id) {
      return this.client.get(`/productos/${id}`);
    }

    create(productoData) {
      return this.client.post('/productos', productoData);
    }

    update(id, productoData) {
      return this.client.put(`/productos/${id}`, productoData);
    }

    delete(id) {
      return this.client.delete(`/productos/${id}`);
    }
  }

  return new ProductoService();
});
