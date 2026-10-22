/* =====================================================================
   Página de productos: catálogo con búsqueda estática, búsqueda dinámica y filtros.
   Usa lo que ya define main.js: productos, htmlTarjeta(), sincronizarTarjetas(),
   esMasVendido(), esc() y MENSAJE_SIN_SERVIDOR.
   ===================================================================== */

// Estado actual de búsquedas y filtros
const filtros = {
  estatica: '',            // texto aplicado al presionar "Buscar"
  dinamica: '',            // texto que se aplica mientras se escribe
  categorias: new Set(),   // categorías marcadas
  marcas: new Set(),       // marcas marcadas
  min: null,
  max: null,
  soloStock: false,
  soloVendidos: false,
  orden: 'relevancia'
};

const $ = (id) => document.getElementById(id);
let catalogoListo = false;

document.addEventListener('DOMContentLoaded', () => {
  // ---- Búsqueda ESTÁTICA: solo se aplica al enviar el formulario (botón o Enter) ----
  $('formBusquedaEstatica').addEventListener('submit', (e) => {
    e.preventDefault();
    filtros.estatica = $('busquedaEstatica').value.trim();
    aplicarFiltros();
  });

  // ---- Búsqueda DINÁMICA: se aplica en cada tecla (con una pequeña espera para no recalcular de más) ----
  let espera;
  $('busquedaDinamica').addEventListener('input', (e) => {
    clearTimeout(espera);
    espera = setTimeout(() => {
      filtros.dinamica = e.target.value.trim();
      aplicarFiltros();
    }, 150);
  });

  // ---- Filtros ----
  $('filtroCategorias').addEventListener('change', (e) => {
    if (!e.target.matches('input[type=checkbox]')) return;
    e.target.checked ? filtros.categorias.add(e.target.value) : filtros.categorias.delete(e.target.value);
    aplicarFiltros();
  });
  $('filtroMarcas').addEventListener('change', (e) => {
    if (!e.target.matches('input[type=checkbox]')) return;
    e.target.checked ? filtros.marcas.add(e.target.value) : filtros.marcas.delete(e.target.value);
    aplicarFiltros();
  });
  $('precioMin').addEventListener('input', leerPrecios);
  $('precioMax').addEventListener('input', leerPrecios);
  $('soloStock').addEventListener('change', (e) => { filtros.soloStock = e.target.checked; aplicarFiltros(); });
  $('soloVendidos').addEventListener('change', (e) => { filtros.soloVendidos = e.target.checked; aplicarFiltros(); });
  $('ordenar').addEventListener('change', (e) => { filtros.orden = e.target.value; aplicarFiltros(); });
  $('btnLimpiar').addEventListener('click', limpiarTodo);

  // Quitar un filtro desde su etiqueta (chip) o limpiar todo desde el mensaje "sin resultados"
  $('filtrosActivos').addEventListener('click', (e) => {
    const chip = e.target.closest('[data-quitar]');
    if (chip) quitarFiltro(chip.dataset.quitar, chip.dataset.valor);
  });
  $('catalogo-grid').addEventListener('click', (e) => {
    if (e.target.closest('#btnLimpiarVacio')) limpiarTodo();
  });

  iniciarDestacados();

  // Buscador del navbar (ver main.js): funciona igual que la búsqueda estática
  document.addEventListener('buscador:navbar', (e) => {
    $('busquedaEstatica').value = e.detail;
    filtros.estatica = e.detail;
    aplicarFiltros();
    $('catalogo').scrollIntoView({ behavior: 'smooth' });
  });

  // Si se llega desde otra página con productos.html?q=..., se aplica como búsqueda estática
  const q = new URLSearchParams(location.search).get('q');
  if (q) {
    filtros.estatica = q.trim();
    $('busquedaEstatica').value = filtros.estatica;
    $('buscador').value = filtros.estatica;
    // Si el catálogo ya se mostró (copia guardada), se vuelve a filtrar con la búsqueda
    if (catalogoListo) { aplicarFiltros(); $('catalogo').scrollIntoView(); }
  }
});

// main.js avisa cuando el backend devolvió los productos
document.addEventListener('productos:cargados', () => {
  catalogoListo = true;
  construirFiltros();
  pintarDestacados();
  aplicarFiltros();
  if (filtros.estatica) $('catalogo').scrollIntoView();
});
document.addEventListener('productos:error', () => {
  $('resultadoTexto').textContent = 'Sin conexión con el servidor';
  $('filtroCategorias').innerHTML = '<p class="small text-muted mb-0">No disponible.</p>';
  $('filtroMarcas').innerHTML = '<p class="small text-muted mb-0">No disponible.</p>';
  $('destacados').innerHTML = `<div class="w-100 text-center text-danger py-4">${MENSAJE_SIN_SERVIDOR}</div>`;
  $('catalogo-grid').innerHTML = `<div class="catalogo-vacio text-danger">${MENSAJE_SIN_SERVIDOR}</div>`;
});

/* ---------- Utilidades de texto ---------- */

// Minúsculas y sin tildes, para que "vitamína" encuentre "Vitamina"
function normalizar(texto) {
  return String(texto ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

// Separa la búsqueda en palabras: "vitamina c" -> ["vitamina", "c"]
function palabras(texto) {
  return normalizar(texto).split(/\s+/).filter(Boolean);
}

// El producto coincide si TODAS las palabras aparecen en su código, nombre, marca, categoría o descripción
function coincide(p, terminos) {
  if (!terminos.length) return true;
  const texto = normalizar(`${p.codigo ?? ''} ${p.nombre} ${p.marca ?? ''} ${p.categoria ?? ''} ${p.descripcion ?? ''}`);
  return terminos.every(t => texto.includes(t));
}

// Devuelve el nombre con las palabras buscadas envueltas en <mark> (todo escapado)
function resaltar(nombre, terminos) {
  if (!terminos.length) return esc(nombre);
  const chars = [...String(nombre)];
  const norm = chars.map(c => normalizar(c));  // misma posición carácter por carácter
  const plano = norm.join('');
  const marcar = new Array(chars.length).fill(false);
  // índice en "plano" -> índice del carácter original
  const mapa = [];
  norm.forEach((n, i) => { for (let k = 0; k < n.length; k++) mapa.push(i); });
  terminos.forEach(t => {
    let desde = 0, pos;
    while ((pos = plano.indexOf(t, desde)) !== -1) {
      for (let k = pos; k < pos + t.length; k++) marcar[mapa[k]] = true;
      desde = pos + t.length;
    }
  });
  let html = '', abierto = false;
  chars.forEach((c, i) => {
    if (marcar[i] && !abierto) { html += '<mark>'; abierto = true; }
    if (!marcar[i] && abierto) { html += '</mark>'; abierto = false; }
    html += esc(c);
  });
  return abierto ? html + '</mark>' : html;
}

/* ---------- Filtros ---------- */

// Lista de casillas (categorías o marcas) con cuántos productos hay en cada una.
// Conserva las casillas que ya estaban marcadas.
function construirLista(idContenedor, idConteo, campo, marcadas, prefijo) {
  const conteo = {};
  productos.forEach(p => {
    const v = p[campo] || 'Otros';
    conteo[v] = (conteo[v] || 0) + 1;
  });
  const nombres = Object.keys(conteo).sort((a, b) => a.localeCompare(b, 'es'));
  $(idConteo).textContent = `(${nombres.length})`;
  $(idContenedor).innerHTML = nombres.map((v, i) => `
    <div class="form-check">
      <input class="form-check-input" type="checkbox" value="${esc(v)}" id="${prefijo}${i}" ${marcadas.has(v) ? 'checked' : ''}>
      <label class="form-check-label d-flex justify-content-between" for="${prefijo}${i}">
        <span>${esc(v)}</span><span class="filtro-conteo">${conteo[v]}</span>
      </label>
    </div>`).join('');
}

function construirFiltros() {
  construirLista('filtroCategorias', 'conteoCategorias', 'categoria', filtros.categorias, 'cat');
  construirLista('filtroMarcas', 'conteoMarcas', 'marca', filtros.marcas, 'mar');
}

function leerPrecios() {
  const min = $('precioMin').value === '' ? null : Number($('precioMin').value);
  const max = $('precioMax').value === '' ? null : Number($('precioMax').value);
  const invalido = min !== null && max !== null && min > max;
  $('precioMin').classList.toggle('is-invalid', invalido);
  $('precioMax').classList.toggle('is-invalid', invalido);
  $('precioError').classList.toggle('d-none', !invalido);
  if (invalido) return;          // no se aplica un rango imposible
  filtros.min = min;
  filtros.max = max;
  aplicarFiltros();
}

function aplicarFiltros() {
  if (!catalogoListo) return;   // todavía no llegan los productos del backend
  const tEstatica = palabras(filtros.estatica);
  const tDinamica = palabras(filtros.dinamica);
  const todos = [...tEstatica, ...tDinamica];

  let lista = productos.filter(p =>
    coincide(p, tEstatica) &&
    coincide(p, tDinamica) &&
    (!filtros.categorias.size || filtros.categorias.has(p.categoria || 'Otros')) &&
    (!filtros.marcas.size || filtros.marcas.has(p.marca || 'Otros')) &&
    (filtros.min === null || Number(p.precio) >= filtros.min) &&
    (filtros.max === null || Number(p.precio) <= filtros.max) &&
    (!filtros.soloStock || Number(p.stock) > 0) &&
    (!filtros.soloVendidos || esMasVendido(p))
  );

  if (filtros.orden === 'precio-asc') lista.sort((a, b) => a.precio - b.precio);
  else if (filtros.orden === 'precio-desc') lista.sort((a, b) => b.precio - a.precio);
  else if (filtros.orden === 'nombre') lista.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
  // "relevancia": se respeta el orden del backend (los más vendidos van primero)

  $('resultadoTexto').innerHTML = lista.length === 1
    ? 'Encontramos <strong>1</strong> producto'
    : `Encontramos <strong>${lista.length}</strong> productos`;
  pintarChips();

  $('catalogo-grid').innerHTML = lista.length
    ? lista.map(p => htmlTarjeta(p, {
        nombreHtml: resaltar(p.nombre, todos),
        etiqueta: esMasVendido(p) ? 'Más vendido' : ''
      })).join('')
    : `<div class="catalogo-vacio">
         <i class="bi bi-search"></i>
         <h6>No encontramos productos</h6>
         <p class="text-muted">Prueba con otras palabras o quita algunos filtros.</p>
         <button type="button" class="btn btn-primary rounded-pill px-4" id="btnLimpiarVacio">Limpiar búsqueda y filtros</button>
       </div>`;
  sincronizarTarjetas();
}

// Etiquetas de los filtros activos, cada una con su "x" para quitarla
function pintarChips() {
  const chips = [];
  const chip = (texto, tipo, valor = '') =>
    `<button type="button" class="filtro-chip" data-quitar="${tipo}" data-valor="${esc(valor)}">
       ${texto}<i class="bi bi-x"></i></button>`;

  if (filtros.estatica) chips.push(chip(`Búsqueda: “${esc(filtros.estatica)}”`, 'estatica'));
  if (filtros.dinamica) chips.push(chip(`En vivo: “${esc(filtros.dinamica)}”`, 'dinamica'));
  filtros.categorias.forEach(c => chips.push(chip(esc(c), 'categoria', c)));
  filtros.marcas.forEach(m => chips.push(chip(esc(m), 'marca', m)));
  if (filtros.min !== null || filtros.max !== null) {
    const txt = filtros.min !== null && filtros.max !== null ? `S/ ${filtros.min} – ${filtros.max}`
      : filtros.min !== null ? `Desde S/ ${filtros.min}` : `Hasta S/ ${filtros.max}`;
    chips.push(chip(txt, 'precio'));
  }
  if (filtros.soloStock) chips.push(chip('Con stock', 'stock'));
  if (filtros.soloVendidos) chips.push(chip('Más vendidos', 'vendidos'));

  $('filtrosActivos').innerHTML = chips.join('');
}

function quitarFiltro(tipo, valor) {
  switch (tipo) {
    case 'estatica': filtros.estatica = ''; $('busquedaEstatica').value = ''; $('buscador').value = ''; break;
    case 'dinamica': filtros.dinamica = ''; $('busquedaDinamica').value = ''; break;
    case 'categoria':
      filtros.categorias.delete(valor);
      $('filtroCategorias').querySelectorAll('input').forEach(i => { if (i.value === valor) i.checked = false; });
      break;
    case 'marca':
      filtros.marcas.delete(valor);
      $('filtroMarcas').querySelectorAll('input').forEach(i => { if (i.value === valor) i.checked = false; });
      break;
    case 'precio':
      filtros.min = filtros.max = null;
      $('precioMin').value = $('precioMax').value = '';
      leerPrecios();
      return;
    case 'stock': filtros.soloStock = false; $('soloStock').checked = false; break;
    case 'vendidos': filtros.soloVendidos = false; $('soloVendidos').checked = false; break;
  }
  aplicarFiltros();
}

function limpiarTodo() {
  filtros.estatica = filtros.dinamica = '';
  filtros.categorias.clear();
  filtros.marcas.clear();
  filtros.min = filtros.max = null;
  filtros.soloStock = filtros.soloVendidos = false;
  filtros.orden = 'relevancia';
  ['busquedaEstatica', 'busquedaDinamica', 'buscador', 'precioMin', 'precioMax'].forEach(id => { $(id).value = ''; });
  $('filtroCategorias').querySelectorAll('input').forEach(i => { i.checked = false; });
  $('filtroMarcas').querySelectorAll('input').forEach(i => { i.checked = false; });
  $('soloStock').checked = $('soloVendidos').checked = false;
  $('ordenar').value = 'relevancia';
  leerPrecios();   // quita el aviso de precio inválido y vuelve a pintar
}

/* ---------- Carrusel "Los más vendidos" ---------- */

function iniciarDestacados() {
  const track = $('destacados');
  const pagina = () => track.clientWidth + 16;   // una "página" de tarjetas
  $('destPrev').addEventListener('click', () => track.scrollBy({ left: -pagina(), behavior: 'smooth' }));
  $('destNext').addEventListener('click', () => track.scrollBy({ left: pagina(), behavior: 'smooth' }));
  track.addEventListener('scroll', actualizarPuntos, { passive: true });
  window.addEventListener('resize', actualizarPuntos);
  $('destPuntos').addEventListener('click', (e) => {
    const b = e.target.closest('button[data-pag]');
    if (b) track.scrollTo({ left: Number(b.dataset.pag) * pagina(), behavior: 'smooth' });
  });

  // Agregar al carrito / favorito desde el carrusel
  track.addEventListener('click', (e) => {
    const add = e.target.closest('.dest-add');
    const fav = e.target.closest('.dest-fav');
    if (add) {
      const id = Number(add.dataset.id);
      const antes = carrito[id]?.cantidad ?? 0;
      agregarAlCarrito(id);
      if ((carrito[id]?.cantidad ?? 0) > antes) mostrarAviso('Producto agregado a tu carrito');
    }
    if (fav) fav.classList.toggle('activo');
  });
  // Si el carrito cambia (aquí, en una tarjeta o en el panel), se actualizan los botones
  new MutationObserver(sincronizarDestacados).observe($('cartCount'), { childList: true });
}

function pintarDestacados() {
  const lista = productos.filter(esMasVendido);
  $('destacados').innerHTML = lista.map(p => {
    const href = p.codigo ? `producto.html?codigo=${encodeURIComponent(p.codigo)}` : `producto.html?id=${p.id}`;
    return `
      <article class="dest-card" data-id="${p.id}">
        <div class="dest-fila">
          <a class="dest-img" href="${href}">
            <img src="${esc(rutaImagen(p.imagenUrl))}" alt="${esc(p.nombre)}" loading="lazy"
                 onerror="this.onerror=null;this.src='${IMG_VACIA}'">
          </a>
          <div class="dest-info">
            <span class="dest-cat">${esc(p.categoria || 'Farmacia')}</span>
            <a class="dest-nombre" href="${href}">${esc(p.nombre)}</a>
            ${p.marca ? `<span class="dest-marca"><i class="bi bi-patch-check-fill"></i>${esc(p.marca)}</span>` : ''}
            <div class="dest-precio">${soles(p.precio)} <small>Precio online</small></div>
          </div>
        </div>
        <div class="dest-acciones">
          <button type="button" class="dest-add" data-id="${p.id}">Agregar al carrito</button>
          <button type="button" class="btn-fav dest-fav" aria-label="Favorito"><i class="bi bi-heart"></i></button>
        </div>
      </article>`;
  }).join('');
  sincronizarDestacados();
  actualizarPuntos();
}

// Texto del botón según lo que ya hay en el carrito
function sincronizarDestacados() {
  document.querySelectorAll('.dest-add').forEach(b => {
    const p = productos.find(x => x.id === Number(b.dataset.id));
    if (!p) return;
    const stock = Number(p.stock ?? 0);
    const enCarrito = carrito[p.id]?.cantidad ?? 0;
    b.disabled = stock <= 0 || enCarrito >= stock;
    b.classList.toggle('en-carrito', enCarrito > 0);
    b.textContent = stock <= 0 ? 'Agotado' : enCarrito >= stock ? 'Sin más stock' : enCarrito ? `En carrito (${enCarrito})` : 'Agregar al carrito';
  });
}

// Puntos debajo del carrusel (uno por "página") y estado de las flechas
function actualizarPuntos() {
  const track = $('destacados');
  const paginas = Math.max(1, Math.round(track.scrollWidth / (track.clientWidth + 16)));
  const actual = Math.min(paginas - 1, Math.round(track.scrollLeft / (track.clientWidth + 16)));
  $('destPuntos').innerHTML = paginas > 1
    ? Array.from({ length: paginas }, (_, i) =>
        `<button type="button" data-pag="${i}" class="${i === actual ? 'activo' : ''}" aria-label="Página ${i + 1}"></button>`).join('')
    : '';
  $('destPrev').disabled = track.scrollLeft <= 4;
  $('destNext').disabled = track.scrollLeft + track.clientWidth >= track.scrollWidth - 4;
}
