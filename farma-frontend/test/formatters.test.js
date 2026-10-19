const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const formatters = require('../js/utils/formatters.js');

describe('Formatters & UI Utils Unit Tests', () => {

  it('escapeHtml debe escapar caracteres peligrosos contra ataques XSS', () => {
    const raw = '<script>alert("XSS & \'hack\'")</script>';
    const safe = formatters.escapeHtml(raw);

    assert.equal(safe.includes('<'), false);
    assert.equal(safe.includes('>'), false);
    assert.equal(safe.includes('"'), false);
    assert.equal(safe.includes("'"), false);
    assert.equal(safe, '&lt;script&gt;alert(&quot;XSS &amp; &#39;hack&#39;&quot;)&lt;/script&gt;');
  });

  it('escapeHtml debe manejar valores nulos y no definidos', () => {
    assert.equal(formatters.escapeHtml(null), '');
    assert.equal(formatters.escapeHtml(undefined), '');
    assert.equal(formatters.escapeHtml(123), '123');
  });

  it('formatSoles debe formatear correctamente valores numéricos a soles peruanos', () => {
    assert.equal(formatters.formatSoles(10), 'S/ 10.00');
    assert.equal(formatters.formatSoles(8.5), 'S/ 8.50');
    assert.equal(formatters.formatSoles(123.456), 'S/ 123.46');
    assert.equal(formatters.formatSoles(0), 'S/ 0.00');
    assert.equal(formatters.formatSoles(null), 'S/ 0.00');
  });

  it('normalizeText debe remover tildes y convertir a minúsculas', () => {
    assert.equal(formatters.normalizeText('Atención Médica'), 'atencion medica');
    assert.equal(formatters.normalizeText('  Vitamina C   '), 'vitamina c');
    assert.equal(formatters.normalizeText('ÁÉÍÓÚ'), 'aeiou');
  });

  it('resolveImageUrl debe resolver rutas relativas según el contexto de subcarpeta', () => {
    const defaultPlaceholder = formatters.resolveImageUrl(null);
    assert.equal(defaultPlaceholder.startsWith('data:image/svg+xml'), true);

    const httpUrl = 'https://ejemplo.com/foto.jpg';
    assert.equal(formatters.resolveImageUrl(httpUrl, true), httpUrl);

    // En raíz (index.html)
    assert.equal(formatters.resolveImageUrl('/img/paracetamol.jpg', false), 'img/paracetamol.jpg');

    // En subcarpeta (paginas/productos.html)
    assert.equal(formatters.resolveImageUrl('img/paracetamol.jpg', true), '../img/paracetamol.jpg');
    assert.equal(formatters.resolveImageUrl('../img/paracetamol.jpg', true), '../img/paracetamol.jpg');
  });
});
