(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    const config = require('./config.js');
    const apiClient = require('./api-client.js');
    module.exports = factory(config, apiClient);
  } else {
    root.FarmaAuthService = factory(root.FarmaConfig, root.FarmaApiClient);
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (config, apiClient) {
  'use strict';

  const USER_KEY = (config && config.STORAGE_KEYS && config.STORAGE_KEYS.USER) || 'farma_user';

  class AuthService {
    constructor(client = apiClient, storageKey = USER_KEY) {
      this.apiClient = client;
      this.storageKey = storageKey;
    }

    getCurrentUser() {
      try {
        if (typeof localStorage === 'undefined') return null;
        const raw = localStorage.getItem(this.storageKey);
        return raw ? JSON.parse(raw) : null;
      } catch (e) {
        return null;
      }
    }

    setCurrentUser(user) {
      if (typeof localStorage === 'undefined') return;
      if (user) {
        localStorage.setItem(this.storageKey, JSON.stringify(user));
      } else {
        localStorage.removeItem(this.storageKey);
      }
    }

    isAuthenticated() {
      const user = this.getCurrentUser();
      return !!(user && user.id);
    }

    isAdmin() {
      const user = this.getCurrentUser();
      return !!(user && user.rol === 'ADMIN');
    }

    async login(correo, contrasena) {
      const data = await this.apiClient.post('/auth/login', { correo, contrasena });
      this.setCurrentUser(data);
      return data;
    }

    async register(userData) {
      const data = await this.apiClient.post('/auth/registro', userData);
      return data;
    }

    logout() {
      this.setCurrentUser(null);
    }
  }

  return new AuthService();
});
