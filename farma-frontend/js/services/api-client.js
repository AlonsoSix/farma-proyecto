(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    const config = require('./config.js');
    module.exports = factory(config);
  } else {
    root.FarmaApiClient = factory(root.FarmaConfig);
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (config) {
  'use strict';

  const baseUrl = (config && config.API_URL) || 'http://localhost:8081/api';

  class ApiClient {
    constructor(apiUrl = baseUrl) {
      this.apiUrl = apiUrl;
    }

    async request(endpoint, options = {}) {
      const url = `${this.apiUrl}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
      const defaultHeaders = {
        'Content-Type': 'application/json'
      };

      const config = {
        ...options,
        headers: {
          ...defaultHeaders,
          ...(options.headers || {})
        }
      };

      try {
        const response = await fetch(url, config);
        let data = null;
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          data = await response.json();
        } else {
          data = await response.text();
        }

        if (!response.ok) {
          const errorMsg = (data && data.error) ? data.error : `Error en la solicitud: ${response.statusText}`;
          const err = new Error(errorMsg);
          err.status = response.status;
          err.data = data;
          throw err;
        }

        return data;
      } catch (err) {
        if (!err.status) {
          err.message = 'No se pudo conectar con el servidor. Verifica que el backend esté ejecutándose.';
        }
        throw err;
      }
    }

    get(endpoint, headers = {}) {
      return this.request(endpoint, { method: 'GET', headers });
    }

    post(endpoint, body, headers = {}) {
      return this.request(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(body)
      });
    }

    put(endpoint, body, headers = {}) {
      return this.request(endpoint, {
        method: 'PUT',
        headers,
        body: JSON.stringify(body)
      });
    }

    delete(endpoint, headers = {}) {
      return this.request(endpoint, { method: 'DELETE', headers });
    }
  }

  return new ApiClient();
});
