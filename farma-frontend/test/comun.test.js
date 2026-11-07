const test = require('node:test');
const assert = require('node:assert/strict');
const Farma = require('../js/comun.js');

test('comun.js - Formateador soles()', async (t) => {
  await t.test('debe formatear números enteros con dos decimales', () => {
    assert.equal(Farma.soles(25), 'S/ 25.00');
  });

  await t.test('debe formatear decimales redondeando correctamente', () => {
    assert.equal(Farma.soles(12.3456), 'S/ 12.35');
    assert.equal(Farma.soles(12.3444), 'S/ 12.34');
  });

  await t.test('debe manejar cadenas numéricas', () => {
    assert.equal(Farma.soles('49.90'), 'S/ 49.90');
  });

  await t.test('debe retornar S/ 0.00 ante valores nulos, indefinidos o no numéricos', () => {
    assert.equal(Farma.soles(null), 'S/ 0.00');
    assert.equal(Farma.soles(undefined), 'S/ 0.00');
    assert.equal(Farma.soles('texto_invalido'), 'S/ 0.00');
    assert.equal(Farma.soles(NaN), 'S/ 0.00');
  });
});

test('comun.js - Sanitizador esc() para prevención de XSS', async (t) => {
  await t.test('debe reemplazar caracteres peligrosos de HTML', () => {
    const entrada = '<script>alert("xss")</script> & \'test\' `code`';
    const salida = Farma.esc(entrada);
    assert.equal(salida.includes('<'), false);
    assert.equal(salida.includes('>'), false);
    assert.equal(salida.includes('"'), false);
    assert.equal(salida.includes("'"), false);
    assert.equal(salida.includes('`'), false);
    assert.equal(salida, '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt; &amp; &#39;test&#39; &#96;code&#96;');
  });

  await t.test('debe retornar cadena vacía si el valor es nulo o indefinido', () => {
    assert.equal(Farma.esc(null), '');
    assert.equal(Farma.esc(undefined), '');
  });
});

test('comun.js - Normalizador rutaImagen()', async (t) => {
  await t.test('debe retornar IMG_VACIA si la url es nula o vacía', () => {
    assert.equal(Farma.rutaImagen(null), Farma.IMG_VACIA);
    assert.equal(Farma.rutaImagen('   '), Farma.IMG_VACIA);
  });

  await t.test('debe conservar URLs absolutas HTTP y HTTPS', () => {
    const urlHttp = 'http://ejemplo.com/foto.jpg';
    const urlHttps = 'https://ejemplo.com/foto.png';
    assert.equal(Farma.rutaImagen(urlHttp), urlHttp);
    assert.equal(Farma.rutaImagen(urlHttps), urlHttps);
  });

  await t.test('debe remover barra inicial en rutas relativas locales', () => {
    assert.equal(Farma.rutaImagen('/img/productos/paracetamol.jpg'), 'img/productos/paracetamol.jpg');
    assert.equal(Farma.rutaImagen('img/productos/ibuprofeno.jpg'), 'img/productos/ibuprofeno.jpg');
  });
});

test('comun.js - Validadores de formulario', async (t) => {
  await t.test('esDniValido debe aceptar únicamente 8 dígitos numéricos', () => {
    assert.equal(Farma.esDniValido('71829304'), true);
    assert.equal(Farma.esDniValido('1234567'), false); // 7 dígitos
    assert.equal(Farma.esDniValido('123456789'), false); // 9 dígitos
    assert.equal(Farma.esDniValido('7182930A'), false); // con letras
    assert.equal(Farma.esDniValido(null), false);
  });

  await t.test('esCorreoValido debe comprobar formato estándar', () => {
    assert.equal(Farma.esCorreoValido('cliente@farma.com'), true);
    assert.equal(Farma.esCorreoValido('usuario.nombre@dominio.com.pe'), true);
    assert.equal(Farma.esCorreoValido('invalido@'), false);
    assert.equal(Farma.esCorreoValido('invalido.com'), false);
    assert.equal(Farma.esCorreoValido(''), false);
  });

  await t.test('esContrasenaValida debe exigir mínimo 6 caracteres', () => {
    assert.equal(Farma.esContrasenaValida('123456'), true);
    assert.equal(Farma.esContrasenaValida('segura2026'), true);
    assert.equal(Farma.esContrasenaValida('12345'), false);
    assert.equal(Farma.esContrasenaValida(''), false);
    assert.equal(Farma.esContrasenaValida(null), false);
  });
});

test('comun.js - Cálculos de negocio del Carrito de Compras (SRP / Pure Functions)', async (t) => {
  await t.test('calcularPrecioFinal debe restar el porcentaje de descuento', () => {
    // S/ 100 con 20% descuento -> S/ 80.00
    assert.equal(Farma.calcularPrecioFinal(100, 20), 80.00);
    // S/ 15.50 con 10% descuento -> S/ 13.95
    assert.equal(Farma.calcularPrecioFinal(15.50, 10), 13.95);
    // Sin descuento (0)
    assert.equal(Farma.calcularPrecioFinal(50, 0), 50.00);
  });

  await t.test('calcularSubtotalItem debe multiplicar precio final por cantidad', () => {
    // 3 unidades a S/ 10 con 10% desc (9.00 c/u) = S/ 27.00
    assert.equal(Farma.calcularSubtotalItem(10, 10, 3), 27.00);
    // Cantidad 0 retorna 0
    assert.equal(Farma.calcularSubtotalItem(10, 10, 0), 0);
  });

  await t.test('calcularTotalesCarrito debe calcular montos, descuentos y desglose fiscal IGV 18%', () => {
    const items = [
      { id: 1, nombre: 'Paracetamol', precio: 10.00, descuento: 10, cantidad: 2 }, // 2 * 9.00 = 18.00 (sin desc: 20.00)
      { id: 2, nombre: 'Ibuprofeno', precio: 20.00, descuento: 0, cantidad: 1 }    // 1 * 20.00 = 20.00 (sin desc: 20.00)
    ];

    const totales = Farma.calcularTotalesCarrito(items);

    assert.equal(totales.subtotalSinDescuento, 40.00);
    assert.equal(totales.total, 38.00);
    assert.equal(totales.descuentoTotal, 2.00);
    assert.equal(totales.totalUnidades, 3);

    // IGV 18%: 38 / 1.18 = 32.20 opGravada; igv = 38 - 32.20 = 5.80
    assert.equal(totales.opGravada, 32.20);
    assert.equal(totales.igv, 5.80);
    assert.equal(Math.round((totales.opGravada + totales.igv) * 100) / 100, 38.00);
  });

  await t.test('calcularTotalesCarrito con carrito vacío debe devolver ceros', () => {
    const totales = Farma.calcularTotalesCarrito([]);
    assert.equal(totales.total, 0);
    assert.equal(totales.subtotalSinDescuento, 0);
    assert.equal(totales.descuentoTotal, 0);
    assert.equal(totales.opGravada, 0);
    assert.equal(totales.igv, 0);
    assert.equal(totales.totalUnidades, 0);
  });
});
