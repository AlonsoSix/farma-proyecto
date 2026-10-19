(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    const config = require('./config.js');
    module.exports = factory(config);
  } else {
    root.FarmaCartService = factory(root.FarmaConfig);
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (config) {
  'use strict';

  const CART_KEY = (config && config.STORAGE_KEYS && config.STORAGE_KEYS.CART) || 'farma_carrito';

  class CartService {
    constructor(storageKey = CART_KEY) {
      this.storageKey = storageKey;
      this.listeners = [];
      this.cart = this.load();
    }

    load() {
      try {
        if (typeof localStorage === 'undefined') return {};
        const raw = localStorage.getItem(this.storageKey);
        return raw ? JSON.parse(raw) : {};
      } catch (e) {
        return {};
      }
    }

    save() {
      try {
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem(this.storageKey, JSON.stringify(this.cart));
        }
      } catch (e) {
        console.warn('No se pudo guardar el carrito en almacenamiento local.', e);
      }
      this.notify();
    }

    subscribe(listener) {
      if (typeof listener === 'function') {
        this.listeners.push(listener);
      }
      return () => {
        this.listeners = this.listeners.filter(l => l !== listener);
      };
    }

    notify() {
      const summary = this.getSummary();
      this.listeners.forEach(fn => {
        try {
          fn(summary, this.cart);
        } catch (e) {
          console.error('Error en listener del carrito:', e);
        }
      });
    }

    getItems() {
      return Object.values(this.cart);
    }

    getItem(id) {
      return this.cart[Number(id)] || null;
    }

    getSummary() {
      const items = this.getItems();
      const totalUnits = items.reduce((sum, item) => sum + Number(item.cantidad || 0), 0);
      const totalPrice = items.reduce(
        (sum, item) => sum + Number(item.cantidad || 0) * Number(item.precio || 0),
        0
      );
      return {
        items,
        totalUnits,
        totalPrice
      };
    }

    addItem(product) {
      if (!product || product.id == null) return false;
      const id = Number(product.id);
      const stock = Number(product.stock ?? 0);
      const currentQty = this.cart[id] ? Number(this.cart[id].cantidad || 0) : 0;

      if (stock > 0 && currentQty >= stock) {
        return false; // Sin stock suficiente
      }

      if (!this.cart[id]) {
        this.cart[id] = {
          id,
          nombre: product.nombre || '',
          precio: Number(product.precio || 0),
          imagen: product.imagenUrl || product.imagen || '',
          categoria: product.categoria || '',
          cantidad: 0
        };
      }

      this.cart[id].cantidad++;
      this.save();
      return true;
    }

    updateQuantity(id, delta, maxStock = null) {
      const numId = Number(id);
      if (!this.cart[numId]) return false;

      const newQty = Number(this.cart[numId].cantidad || 0) + delta;

      if (maxStock !== null && maxStock !== undefined && newQty > Number(maxStock)) {
        return false; // Excede stock
      }

      if (newQty <= 0) {
        delete this.cart[numId];
      } else {
        this.cart[numId].cantidad = newQty;
      }

      this.save();
      return true;
    }

    removeItem(id) {
      const numId = Number(id);
      if (this.cart[numId]) {
        delete this.cart[numId];
        this.save();
        return true;
      }
      return false;
    }

    clear() {
      this.cart = {};
      this.save();
    }
  }

  return new CartService();
});
