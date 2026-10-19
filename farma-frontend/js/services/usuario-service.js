(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    const apiClient = require('./api-client.js');
    module.exports = factory(apiClient);
  } else {
    root.FarmaUsuarioService = factory(root.FarmaApiClient);
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (apiClient) {
  'use strict';

  class UsuarioService {
    constructor(client = apiClient) {
      this.client = client;
    }

    getAll() {
      return this.client.get('/usuarios');
    }

    getById(id) {
      return this.client.get(`/usuarios/${id}`);
    }

    create(usuarioData) {
      return this.client.post('/usuarios', usuarioData);
    }

    update(id, usuarioData) {
      return this.client.put(`/usuarios/${id}`, usuarioData);
    }

    delete(id) {
      return this.client.delete(`/usuarios/${id}`);
    }
  }

  return new UsuarioService();
});
