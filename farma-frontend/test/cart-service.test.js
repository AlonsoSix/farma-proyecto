const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');

// Mock simple de localStorage para entorno Node si no está definido
if (typeof globalThis.localStorage === 'undefined') {
  const store = new Map();
  globalThis.localStorage = {
    getItem: (key) => store.get(key) || null,
    setItem: (key, val) => store.set(key, String(val)),
    removeItem: (key) => store.delete(key),
    clear: () => store.clear()
  };
}

const CartServiceFactory = require('../js/services/cart-service.js');

describe('CartService Unit Tests (Observer & Business Logic)', () => {
  let cartService;

  beforeEach(() => {
    globalThis.localStorage.clear();
    cartService = new (CartServiceFactory.constructor)('test_cart_key');
    cartService.clear();
  });

  it('addItem debe agregar un nuevo producto al carrito e incrementar su cantidad', () => {
    const producto = { id: 1, nombre: 'Paracetamol', precio: 8.50, stock: 10 };

    const ok = cartService.addItem(producto);
    assert.equal(ok, true);

    const items = cartService.getItems();
    assert.equal(items.length, 1);
    assert.equal(items[0].nombre, 'Paracetamol');
    assert.equal(items[0].cantidad, 1);

    // Agregar segunda unidad
    cartService.addItem(producto);
    assert.equal(cartService.getItem(1).cantidad, 2);
  });

  it('addItem no debe permitir agregar productos si no hay stock disponible', () => {
    const producto = { id: 2, nombre: 'Termómetro', precio: 20.0, stock: 1 };

    cartService.addItem(producto);
    assert.equal(cartService.getItem(2).cantidad, 1);

    // Intentar agregar otra unidad con stock 1
    const agregado = cartService.addItem(producto);
    assert.equal(agregado, false);
    assert.equal(cartService.getItem(2).cantidad, 1);
  });

  it('updateQuantity debe modificar cantidad y eliminar el item si llega a 0', () => {
    const producto = { id: 3, nombre: 'Alcohol en gel', precio: 12.0, stock: 5 };
    cartService.addItem(producto);

    cartService.updateQuantity(3, 1, 5); // cantidad 2
    assert.equal(cartService.getItem(3).cantidad, 2);

    cartService.updateQuantity(3, -1, 5); // cantidad 1
    assert.equal(cartService.getItem(3).cantidad, 1);

    cartService.updateQuantity(3, -1, 5); // cantidad 0 -> se elimina
    assert.equal(cartService.getItem(3), null);
  });

  it('updateQuantity no debe superar el stock máximo especificado', () => {
    const producto = { id: 4, nombre: 'Vitamina C', precio: 25.0, stock: 2 };
    cartService.addItem(producto);
    cartService.addItem(producto); // cantidad 2

    const resultado = cartService.updateQuantity(4, 1, 2);
    assert.equal(resultado, false);
    assert.equal(cartService.getItem(4).cantidad, 2);
  });

  it('removeItem debe eliminar el item completamente del carrito', () => {
    cartService.addItem({ id: 5, nombre: 'Mascarillas', precio: 15.0, stock: 10 });
    assert.equal(cartService.getItems().length, 1);

    cartService.removeItem(5);
    assert.equal(cartService.getItems().length, 0);
  });

  it('getSummary debe calcular las unidades totales y el precio subtotal correctamente', () => {
    cartService.addItem({ id: 1, nombre: 'P1', precio: 10.0, stock: 5 });
    cartService.addItem({ id: 1, nombre: 'P1', precio: 10.0, stock: 5 }); // 2 x 10 = 20
    cartService.addItem({ id: 2, nombre: 'P2', precio: 15.5, stock: 5 }); // 1 x 15.5 = 15.5

    const { totalUnits, totalPrice } = cartService.getSummary();
    assert.equal(totalUnits, 3);
    assert.equal(totalPrice, 35.5);
  });

  it('subscribe debe notificar a los oyentes registrados cuando cambia el carrito (Observer Pattern)', () => {
    let notificado = false;
    let unidadesNotificadas = 0;

    const unsubscribe = cartService.subscribe((summary) => {
      notificado = true;
      unidadesNotificadas = summary.totalUnits;
    });

    cartService.addItem({ id: 1, nombre: 'Item', precio: 5.0, stock: 10 });
    assert.equal(notificado, true);
    assert.equal(unidadesNotificadas, 1);

    unsubscribe();
    notificado = false;
    cartService.addItem({ id: 1, nombre: 'Item', precio: 5.0, stock: 10 });
    assert.equal(notificado, false); // Ya no se notifica tras desuscribir
  });
});
