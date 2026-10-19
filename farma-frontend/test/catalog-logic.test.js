const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const formatters = require('../js/utils/formatters.js');

describe('Catalog Filter, Search and Sort Logic Tests', () => {

  const productosMock = [
    { id: 1, nombre: 'Paracetamol 500mg', categoria: 'Medicamentos', precio: 8.50, descripcion: 'Analgésico' },
    { id: 2, nombre: 'Ibuprofeno 400mg', categoria: 'Medicamentos', precio: 10.90, descripcion: 'Antiinflamatorio' },
    { id: 3, nombre: 'Vitamina C 1000mg', categoria: 'Suplementos', precio: 25.00, descripcion: 'Inmunidad' },
    { id: 4, nombre: 'Alcohol en gel 500ml', categoria: 'Cuidado Personal', precio: 12.00, descripcion: 'Antiséptico' },
    { id: 5, nombre: 'Termómetro digital', categoria: 'Equipos Médicos', precio: 18.50, descripcion: 'Clínico' }
  ];

  function filtrarProductos(lista, { categoria = '', busqueda = '', minPrecio = null, maxPrecio = null, orden = '' } = {}) {
    let res = [...lista];

    if (categoria) {
      const cat = formatters.normalizeText(categoria);
      res = res.filter(p => formatters.normalizeText(p.categoria).includes(cat));
    }

    if (busqueda) {
      const txt = formatters.normalizeText(busqueda);
      res = res.filter(p => {
        const contenido = formatters.normalizeText(`${p.nombre} ${p.categoria} ${p.descripcion}`);
        return contenido.includes(txt);
      });
    }

    if (minPrecio !== null) {
      res = res.filter(p => p.precio >= minPrecio);
    }

    if (maxPrecio !== null) {
      res = res.filter(p => p.precio <= maxPrecio);
    }

    if (orden === 'asc') {
      res.sort((a, b) => a.precio - b.precio);
    } else if (orden === 'desc') {
      res.sort((a, b) => b.precio - a.precio);
    } else if (orden === 'az') {
      res.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' }));
    }

    return res;
  }

  it('debe filtrar correctamente por categoría', () => {
    const med = filtrarProductos(productosMock, { categoria: 'Medicamentos' });
    assert.equal(med.length, 2);
    assert.equal(med.every(p => p.categoria === 'Medicamentos'), true);

    const sup = filtrarProductos(productosMock, { categoria: 'Suplementos' });
    assert.equal(sup.length, 1);
    assert.equal(sup[0].nombre, 'Vitamina C 1000mg');
  });

  it('debe buscar insensible a mayúsculas y acentos en nombre o descripción', () => {
    const res = filtrarProductos(productosMock, { busqueda: 'termometro' }); // sin tilde
    assert.equal(res.length, 1);
    assert.equal(res[0].nombre, 'Termómetro digital');

    const porDesc = filtrarProductos(productosMock, { busqueda: 'antiinflamatorio' });
    assert.equal(porDesc.length, 1);
    assert.equal(porDesc[0].nombre, 'Ibuprofeno 400mg');
  });

  it('debe filtrar dentro de rango de precio mínimo y máximo', () => {
    const enRango = filtrarProductos(productosMock, { minPrecio: 10.0, maxPrecio: 20.0 });
    assert.equal(enRango.length, 3); // Ibuprofeno (10.90), Alcohol (12.00), Termómetro (18.50)
  });

  it('debe ordenar ascendente, descendente y alfabéticamente (A-Z)', () => {
    const asc = filtrarProductos(productosMock, { orden: 'asc' });
    assert.equal(asc[0].precio, 8.50);
    assert.equal(asc[asc.length - 1].precio, 25.00);

    const desc = filtrarProductos(productosMock, { orden: 'desc' });
    assert.equal(desc[0].precio, 25.00);
    assert.equal(desc[desc.length - 1].precio, 8.50);

    const az = filtrarProductos(productosMock, { orden: 'az' });
    assert.equal(az[0].nombre, 'Alcohol en gel 500ml');
  });
});
