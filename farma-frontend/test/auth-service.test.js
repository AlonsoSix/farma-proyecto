const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');

if (typeof globalThis.localStorage === 'undefined') {
  const store = new Map();
  globalThis.localStorage = {
    getItem: (key) => store.get(key) || null,
    setItem: (key, val) => store.set(key, String(val)),
    removeItem: (key) => store.delete(key),
    clear: () => store.clear()
  };
}

const AuthServiceFactory = require('../js/services/auth-service.js');

describe('AuthService Unit Tests', () => {
  let authService;
  let mockApiClient;

  beforeEach(() => {
    globalThis.localStorage.clear();
    mockApiClient = {
      post: async (endpoint, body) => {
        if (endpoint.includes('/login')) {
          if (body.correo === 'admin@farma.com' && body.contrasena === '123456') {
            return { id: 1, nombre: 'Admin', rol: 'ADMIN', correo: body.correo };
          }
          if (body.correo === 'cliente@farma.com') {
            return { id: 2, nombre: 'Cliente', rol: 'CLIENTE', correo: body.correo };
          }
          const err = new Error('Correo o contraseña incorrectos.');
          err.status = 401;
          throw err;
        }
        if (endpoint.includes('/registro')) {
          return { id: 3, nombre: body.nombre, mensaje: 'Cuenta creada' };
        }
      }
    };

    authService = new (AuthServiceFactory.constructor)(mockApiClient, 'test_user_key');
  });

  it('login exitoso debe guardar usuario y actualizar estado', async () => {
    const user = await authService.login('cliente@farma.com', '123456');

    assert.equal(user.id, 2);
    assert.equal(authService.isAuthenticated(), true);
    assert.equal(authService.isAdmin(), false);
    assert.equal(authService.getCurrentUser().nombre, 'Cliente');
  });

  it('login como ADMIN debe reconocer privilegios de administrador', async () => {
    const user = await authService.login('admin@farma.com', '123456');

    assert.equal(user.rol, 'ADMIN');
    assert.equal(authService.isAdmin(), true);
  });

  it('login con credenciales inválidas debe propagar error', async () => {
    await assert.rejects(
      async () => {
        await authService.login('err@correo.com', 'badpass');
      },
      { message: 'Correo o contraseña incorrectos.' }
    );
  });

  it('logout debe limpiar la sesión del usuario', () => {
    authService.setCurrentUser({ id: 10, nombre: 'Usuario Temporal', rol: 'CLIENTE' });
    assert.equal(authService.isAuthenticated(), true);

    authService.logout();
    assert.equal(authService.isAuthenticated(), false);
    assert.equal(authService.getCurrentUser(), null);
  });
});
