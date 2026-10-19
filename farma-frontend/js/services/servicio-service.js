(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    const apiClient = require('./api-client.js');
    module.exports = factory(apiClient);
  } else {
    root.FarmaServicioService = factory(root.FarmaApiClient);
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (apiClient) {
  'use strict';

  class ServicioService {
    constructor(client = apiClient) {
      this.client = client;
    }

    getAll(todos = false) {
      return this.client.get(`/servicios?todos=${todos ? 'true' : 'false'}`);
    }

    getById(id) {
      return this.client.get(`/servicios/${id}`);
    }

    create(servicioData) {
      return this.client.post('/servicios', servicioData);
    }

    update(id, servicioData) {
      return this.client.put(`/servicios/${id}`, servicioData);
    }

    toggleActive(id, activo) {
      return this.client.put(`/servicios/${id}`, { activo });
    }

    delete(id) {
      return this.client.delete(`/servicios/${id}`);
    }
  }

  return new ServicioService();
});
