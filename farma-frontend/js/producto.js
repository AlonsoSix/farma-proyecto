/* =====================================================================
   Página de detalle: producto.html?id=N
   Muestra nombre, marca, descripción, fecha de vencimiento y precio.
   Usa lo que ya define main.js: productos, carrito, htmlTarjeta(), sincronizarTarjetas(),
   agregarAlCarrito(), esMasVendido(), rutaImagen(), esc(), soles(), mostrarAviso().
   ===================================================================== */

// El producto se busca por su código: producto.html?codigo=FAR-0001 (se acepta ?id= por compatibilidad)
const parametros = new URLSearchParams(location.search);
const codigoBuscado = (parametros.get('codigo') || '').trim().toUpperCase();
const idProducto = Number(parametros.get('id'));
let productoActual = null;
let cantidadElegida = 1;
let observandoCarrito = false;
const MIGAS_BASE = document.getElementById('migas').innerHTML;   // Inicio / Productos

// main.js avisa cuando llegan los productos del backend
document.addEventListener('productos:cargados', () => {
  productoActual = codigoBuscado
    ? productos.find(p => String(p.codigo || '').toUpperCase() === codigoBuscado) || null
    : productos.find(p => p.id === idProducto) || null;
  if (!productoActual) return mostrarNoEncontrado();
  pintarDetalle(productoActual);
  pintarRelacionados(productoActual);
});
document.addEventListener('productos:error', () => {
  document.getElementById('detalleContenido').innerHTML = `
    <div class="detalle-card detalle-cargando text-danger">
      <i class="bi bi-wifi-off fs-1"></i>
      <p class="mt-3 mb-0">${MENSAJE_SIN_SERVIDOR}</p>
    </div>`;
});

/* ---------- Utilidades ---------- */

// "2028-03-31" (o [2028, 3, 31]) -> "31 de marzo de 2028". null -> null
function formatoFecha(valor) {
  if (!valor) return null;
  const [a, m, d] = Array.isArray(valor) ? valor : String(valor).slice(0, 10).split('-').map(Number);
  if (!a || !m || !d) return null;
  // Se arma la fecha con año, mes y día para que la zona horaria no la mueva un día
  return new Date(a, m - 1, d).toLocaleDateString('es-PE', { day: 'numeric', month: 'long', year: 'numeric' });
}

function codigoProducto(p) {
  return p.codigo || 'FAR-' + String(p.id).padStart(4, '0');
}

function estadoStock(stock) {
  if (stock <= 0) return { clase: 'chip-out', icono: 'bi-x-circle', texto: 'Agotado' };
  if (stock <= 5) return { clase: 'chip-warn', icono: 'bi-exclamation-circle', texto: `Últimas ${stock} unidades` };
  return { clase: 'chip-ok', icono: 'bi-check-circle', texto: 'Disponible' };
}

/* ---------- Detalle ---------- */

function pintarDetalle(p) {
  const stock = Number(p.stock ?? 0);
  const est = estadoStock(stock);
  const marca = p.marca ? esc(p.marca) : null;
  const vence = formatoFecha(p.fechaVencimiento);
  const categoria = esc(p.categoria || 'Farmacia');

  document.title = `${p.nombre} | Farmacia Farma`;

  // Ruta de navegación: Inicio / Productos / Categoría / Nombre
  document.getElementById('migas').innerHTML = MIGAS_BASE + `
    <li class="breadcrumb-item"><a href="productos.html?q=${encodeURIComponent(p.categoria || '')}">${categoria}</a></li>
    <li class="breadcrumb-item active" aria-current="page">${esc(p.nombre)}</li>`;

  document.getElementById('detalleContenido').innerHTML = `
    <article class="detalle-card">
      <div class="row g-4 g-lg-5">
        <!-- Imagen -->
        <div class="col-lg-6">
          <div class="detalle-imagen">
            ${esMasVendido(p) ? '<span class="pcard-badge">Más vendido</span>' : ''}
            <img src="${esc(rutaImagen(p.imagenUrl))}" alt="${esc(p.nombre)}"
                 onerror="this.onerror=null;this.src='${IMG_VACIA}'">
          </div>
        </div>

        <!-- Información principal -->
        <div class="col-lg-6">
          <div class="detalle-info">
            ${marca
              ? `<a class="detalle-marca" href="productos.html?q=${encodeURIComponent(p.marca)}">${marca}</a>`
              : '<span class="detalle-marca text-muted">Marca no registrada</span>'}
            <h1 class="detalle-nombre">${esc(p.nombre)}</h1>
            <div class="detalle-meta">
              <span>Código: <strong>${codigoProducto(p)}</strong></span>
              <span class="chip ${est.clase}"><i class="bi ${est.icono}"></i>${est.texto}</span>
            </div>

            <div class="detalle-precio">
              <span class="detalle-precio-label">Precio online</span>
              <span class="detalle-precio-valor">${soles(p.precio)}</span>
              <span class="detalle-precio-nota">Incluye IGV</span>
            </div>

            <p class="detalle-desc">${esc(p.descripcion || 'Sin descripción disponible.')}</p>

            <!-- Datos clave pedidos: marca, fecha, categoría -->
            <dl class="detalle-datos">
              <div><dt><i class="bi bi-award"></i>Marca</dt><dd>${marca ?? 'No registrada'}</dd></div>
              <div><dt><i class="bi bi-calendar-event"></i>Fecha de vencimiento</dt><dd>${vence ?? 'No aplica'}</dd></div>
              <div><dt><i class="bi bi-tag"></i>Categoría</dt><dd>${categoria}</dd></div>
            </dl>

            <!-- Cantidad + carrito -->
            <div class="detalle-compra">
              <div class="detalle-cantidad" role="group" aria-label="Cantidad">
                <button type="button" id="cantMenos" aria-label="Quitar uno"><i class="bi bi-dash-lg"></i></button>
                <span id="cantValor">1</span>
                <button type="button" id="cantMas" aria-label="Agregar uno"><i class="bi bi-plus-lg"></i></button>
              </div>
              <button type="button" class="detalle-btn-carrito" id="btnAgregarDetalle" ${stock <= 0 ? 'disabled' : ''}>
                <i class="bi bi-cart-plus me-2"></i>${stock <= 0 ? 'Producto agotado' : 'Agregar al carrito'}
              </button>
              <button type="button" class="btn-fav detalle-fav" aria-label="Favorito"><i class="bi bi-heart"></i></button>
            </div>
            <p class="detalle-en-carrito" id="enCarrito"></p>

            <!-- Métodos de entrega -->
            <div class="detalle-entrega">
              <h2>Métodos de entrega disponibles</h2>
              <div class="detalle-entrega-grid">
                <div class="detalle-entrega-item">
                  <i class="bi bi-truck"></i>
                  <div><strong>Despacho a domicilio</strong><span class="chip-entrega">Disponible</span></div>
                </div>
                <div class="detalle-entrega-item">
                  <i class="bi bi-shop"></i>
                  <div><strong>Retiro en botica (Gratis)</strong><span class="chip-entrega">Disponible</span></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </article>

    <!-- Pestañas: aquí se pueden agregar más secciones en el futuro -->
    <section class="detalle-card detalle-tabs">
      <ul class="nav nav-tabs" role="tablist">
        <li class="nav-item" role="presentation">
          <button class="nav-link active" data-bs-toggle="tab" data-bs-target="#tabDescripcion" type="button" role="tab">Descripción</button>
        </li>
        <li class="nav-item" role="presentation">
          <button class="nav-link" data-bs-toggle="tab" data-bs-target="#tabFicha" type="button" role="tab">Información del producto</button>
        </li>
      </ul>
      <div class="tab-content">
        <div class="tab-pane fade show active" id="tabDescripcion" role="tabpanel">
          <p>${esc(p.descripcion || 'Sin descripción disponible.')}</p>
          <div class="detalle-aviso">
            <i class="bi bi-info-circle"></i>
            <span>Lee las indicaciones del envase antes de usar el producto. Ante cualquier duda, consulta con nuestro químico farmacéutico.</span>
          </div>
        </div>
        <div class="tab-pane fade" id="tabFicha" role="tabpanel">
          <table class="table detalle-tabla mb-0">
            <tbody>
              <tr><th>Nombre</th><td>${esc(p.nombre)}</td></tr>
              <tr><th>Marca</th><td>${marca ?? 'No registrada'}</td></tr>
              <tr><th>Categoría</th><td>${categoria}</td></tr>
              <tr><th>Fecha de vencimiento</th><td>${vence ?? 'No aplica'}</td></tr>
              <tr><th>Precio</th><td>${soles(p.precio)}</td></tr>
              <tr><th>Código</th><td>${codigoProducto(p)}</td></tr>
              <tr><th>Stock disponible</th><td>${stock} ${stock === 1 ? 'unidad' : 'unidades'}</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>`;

  // Eventos de cantidad y carrito
  document.getElementById('cantMenos').addEventListener('click', () => cambiarCantidadElegida(-1));
  document.getElementById('cantMas').addEventListener('click', () => cambiarCantidadElegida(1));
  document.getElementById('btnAgregarDetalle').addEventListener('click', agregarDesdeDetalle);
  document.querySelector('.detalle-fav').addEventListener('click', (e) => e.currentTarget.classList.toggle('activo'));

  // Cuando el carrito cambia (aquí o en el panel lateral), se actualiza el texto "En tu carrito"
  if (!observandoCarrito) {
    new MutationObserver(actualizarEstadoCompra).observe(document.getElementById('cartCount'), { childList: true });
    observandoCarrito = true;
  }
  actualizarEstadoCompra();
}

// Unidades que todavía se pueden agregar sin pasar el stock
function disponibles() {
  return Math.max(0, Number(productoActual.stock ?? 0) - (carrito[productoActual.id]?.cantidad ?? 0));
}

function cambiarCantidadElegida(delta) {
  cantidadElegida = Math.min(Math.max(1, cantidadElegida + delta), Math.max(1, disponibles()));
  actualizarEstadoCompra();
}

function agregarDesdeDetalle() {
  const n = Math.min(cantidadElegida, disponibles());
  if (n <= 0) { mostrarAviso('Ya tienes en tu carrito todas las unidades disponibles.'); return; }
  for (let i = 0; i < n; i++) agregarAlCarrito(productoActual.id);
  mostrarAviso(n === 1 ? 'Agregaste 1 unidad a tu carrito' : `Agregaste ${n} unidades a tu carrito`);
  cantidadElegida = 1;
  actualizarEstadoCompra();
}

function actualizarEstadoCompra() {
  if (!productoActual) return;
  const libres = disponibles();
  const enCarrito = carrito[productoActual.id]?.cantidad ?? 0;
  if (cantidadElegida > Math.max(1, libres)) cantidadElegida = Math.max(1, libres);

  document.getElementById('cantValor').textContent = cantidadElegida;
  document.getElementById('cantMenos').disabled = cantidadElegida <= 1;
  document.getElementById('cantMas').disabled = cantidadElegida >= libres;
  const sinStock = Number(productoActual.stock ?? 0) <= 0;
  document.getElementById('btnAgregarDetalle').disabled = sinStock || libres <= 0;
  document.getElementById('enCarrito').innerHTML = enCarrito
    ? `<i class="bi bi-check-circle-fill"></i>Tienes ${enCarrito} ${enCarrito === 1 ? 'unidad' : 'unidades'} en tu carrito`
    : '';
}

/* ---------- Relacionados ---------- */

function pintarRelacionados(p) {
  // Primero los de la misma categoría; si faltan, se completa con los más vendidos y luego con el resto
  const misma = productos.filter(x => x.id !== p.id && x.categoria === p.categoria);
  const extra = productos.filter(x => x.id !== p.id && x.categoria !== p.categoria && esMasVendido(x));
  const resto = productos.filter(x => x.id !== p.id && !misma.includes(x) && !extra.includes(x));
  const lista = [...misma, ...extra, ...resto].slice(0, 5);   // siempre 5 productos
  if (!lista.length) return;
  document.getElementById('relacionados').innerHTML = lista.map(x =>
    htmlTarjeta(x, { etiqueta: esMasVendido(x) ? 'Más vendido' : '' })).join('');
  document.getElementById('relacionadosSeccion').classList.remove('d-none');
  sincronizarTarjetas();
}

function mostrarNoEncontrado() {
  document.getElementById('detalleContenido').innerHTML = `
    <div class="detalle-card detalle-cargando">
      <i class="bi bi-search fs-1 text-primary"></i>
      <h1 class="h5 fw-bold mt-3">No encontramos este producto</h1>
      <p class="text-muted">Es posible que el enlace esté incompleto o que el producto ya no esté disponible.</p>
      <a href="productos.html" class="btn btn-primary rounded-pill px-4">Ver catálogo</a>
    </div>`;
}
