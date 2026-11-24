const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const Farma = require('../js/comun.js');

const GUARD = fs.readFileSync(path.join(__dirname, '..', 'js', 'auth-guard.js'), 'utf8');

function memoria(inicial = {}) {
  const datos = { ...inicial };
  return {
    getItem: (clave) => (clave in datos ? datos[clave] : null),
    setItem: (clave, valor) => { datos[clave] = String(valor); },
    removeItem: (clave) => { delete datos[clave]; },
    datos
  };
}

function sesion(id, rol = 'CLIENTE') {
  return { id, rol, nombre: 'Usuario', correo: `usuario${id}@correo.com` };
}

function ejecutarGuard(pagina, localStorage, sessionStorage) {
  const redirecciones = [];
  const contexto = {
    location: {
      pathname: `/farma-frontend/${pagina}`,
      search: '',
      hash: '',
      replace: (destino) => redirecciones.push(destino)
    },
    localStorage,
    sessionStorage,
    Farma,
    window: { Farma },
    console
  };
  vm.createContext(contexto);
  vm.runInContext(GUARD, contexto);
  return redirecciones;
}

test('Sesión - cerrar sesión vuelve al login y conserva el carrito', (t) => {
  const ls = memoria({
    farma_sesion: JSON.stringify(sesion(1)),
    farma_carrito_1: JSON.stringify({ 7: { id: 7, nombre: 'Vitamina C', cantidad: 2 } })
  });
  const ss = memoria({ farma_sesion_activa: '1' });
  const destinos = [];

  global.localStorage = ls;
  global.sessionStorage = ss;
  global.location = { replace: (destino) => destinos.push(destino) };
  t.after(() => {
    delete global.localStorage;
    delete global.sessionStorage;
    delete global.location;
  });

  Farma.cerrarSesion();

  assert.deepEqual(destinos, ['login.html?salir=1']);
  assert.equal(ls.getItem('farma_sesion'), null);
  assert.equal(ss.getItem('farma_sesion_activa'), null);
  assert.match(ls.getItem('farma_carrito_1'), /Vitamina C/);
});

test('Carrito - cada usuario conserva el suyo y migra el carrito antiguo', (t) => {
  const ls = memoria();
  global.localStorage = ls;
  t.after(() => { delete global.localStorage; });

  Farma.guardarSesion(sesion(1));
  Farma.guardarCarrito({ 7: { id: 7, nombre: 'Vitamina C', cantidad: 3 } });
  assert.equal(Farma.claveCarrito(), 'farma_carrito_1');

  Farma.guardarSesion(sesion(2));
  assert.deepEqual(Farma.leerCarrito(), {});

  Farma.guardarSesion(sesion(1));
  assert.equal(Farma.leerCarrito()[7].cantidad, 3);

  ls.setItem('farma_carrito', JSON.stringify({ 9: { id: 9, nombre: 'Producto anterior', cantidad: 1 } }));
  Farma.guardarSesion(sesion(3));
  assert.equal(Farma.leerCarrito()[9].nombre, 'Producto anterior');
  assert.equal(ls.getItem('farma_carrito'), null);
});

test('auth-guard - sin marca de sesión abre el login al iniciar la app', () => {
  const ls = memoria({ farma_sesion: JSON.stringify(sesion(1)) });
  const ss = memoria();

  assert.deepEqual(ejecutarGuard('index.html', ls, ss), ['login.html']);
});

test('auth-guard - con sesión activa navega y bloquea el panel a clientes', () => {
  const ls = memoria({ farma_sesion: JSON.stringify(sesion(1, 'CLIENTE')) });
  const ss = memoria({ farma_sesion_activa: '1' });

  assert.deepEqual(ejecutarGuard('index.html', ls, ss), []);
  assert.deepEqual(ejecutarGuard('admin.html', ls, ss), ['index.html?sinPermiso=1']);
});
