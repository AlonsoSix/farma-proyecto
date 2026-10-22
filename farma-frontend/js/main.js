const API_URL = 'http://localhost:8081/api';
// Los primeros productos del catálogo (id 1 al 6) son los "más vendidos": se muestran en el inicio
// y en la página de productos llevan la etiqueta "Más vendido".
const MAX_MAS_VENDIDOS = 6;
const IMG_VACIA = 'data:image/svg+xml;utf8,' + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="300" height="240" viewBox="0 0 300 240">' +
  '<rect width="300" height="240" fill="#eef3f8"/>' +
  '<g fill="none" stroke="#9fb3c8" stroke-width="8" stroke-linecap="round">' +
  '<rect x="105" y="70" width="90" height="110" rx="14"/><path d="M125 70v-16h50v16M150 105v50M125 130h50"/></g></svg>'
);

let productos = [];   // todos los productos que devuelve el backend
let carrito = {};     // { id: { id, nombre, precio, imagen, cantidad } }

document.addEventListener('DOMContentLoaded', () => {
  iniciarPantallaCarga();  // logo + "Cargando..." al pasar de una página a otra
  cargarCarrito();
  pintarSesion();
  iniciarSugerencias();   // buscador del navbar con productos sugeridos

  // Formulario de contacto (contacto.html): por ahora solo valida y muestra un aviso, no envía nada
  const formContacto = document.getElementById('formContacto');
  if (formContacto) {
    formContacto.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!formContacto.checkValidity()) { formContacto.classList.add('was-validated'); return; }
      mostrarAviso('¡Gracias! El envío de mensajes estará disponible próximamente.');
      formContacto.reset();
      formContacto.classList.remove('was-validated');
    });
  }
  actualizarCarritoUI();
  cargarProductos();

  document.getElementById('loginForm').addEventListener('submit', manejarLogin);
  document.getElementById('registroForm').addEventListener('submit', manejarRegistro);

  // Buscador del navbar: en la página de productos lo maneja productos.js;
  // en cualquier otra página lleva a productos.html?q=lo-que-escribiste
  document.getElementById('buscadorForm').addEventListener('submit', (e) => {
    e.preventDefault();
    // Si se eligió una sugerencia con las flechas, Enter abre su detalle
    const marcada = document.querySelector('.sug-item.activa');
    if (marcada) { irA(marcada.dataset.href); return; }
    cerrarSugerencias();
    const q = document.getElementById('buscador').value.trim();
    if (document.getElementById('catalogo')) {
      document.dispatchEvent(new CustomEvent('buscador:navbar', { detail: q }));
    } else {
      irA('productos.html' + (q ? '?q=' + encodeURIComponent(q) : ''));
    }
  });

  // Flechas del carrusel de "más vendidos" (solo existe en el inicio)
  const track = document.getElementById('productos-container');
  if (track) {
    const btnPrev = document.getElementById('prodPrev');
    const btnNext = document.getElementById('prodNext');
    const paso = () => track.clientWidth + parseFloat(getComputedStyle(track).columnGap || 0); // una "página" de tarjetas
    const estadoFlechas = () => {
      btnPrev.disabled = track.scrollLeft <= 4;
      btnNext.disabled = track.scrollLeft + track.clientWidth >= track.scrollWidth - 4;
    };
    btnPrev.addEventListener('click', () => track.scrollBy({ left: -paso(), behavior: 'smooth' }));
    btnNext.addEventListener('click', () => track.scrollBy({ left: paso(), behavior: 'smooth' }));
    track.addEventListener('scroll', estadoFlechas, { passive: true });
    window.addEventListener('resize', estadoFlechas);
    new MutationObserver(estadoFlechas).observe(track, { childList: true });
  }

  // Botones dentro de las tarjetas (agregar / cantidad / favorito), en cualquier página
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.pcard')) return;
    const add = e.target.closest('.btn-add');
    const fav = e.target.closest('.btn-fav');
    const qty = e.target.closest('.qty-pill button');
    if (add) agregarAlCarrito(Number(add.dataset.id));
    if (qty) {
      const id = Number(qty.closest('.pcard').dataset.id);
      if (qty.dataset.accion === 'mas') agregarAlCarrito(id);
      else if ((carrito[id]?.cantidad ?? 0) <= 1) eliminarDelCarrito(id, true);
      else cambiarCantidad(id, -1);
    }
    if (fav) fav.classList.toggle('activo');
  });

  // Carrito
  document.getElementById('carritoItems').addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-accion]');
    if (!btn) return;
    const id = Number(btn.dataset.id);
    if (btn.dataset.accion === 'eliminar') eliminarDelCarrito(id);
    else cambiarCantidad(id, btn.dataset.accion === 'mas' ? 1 : -1);
  });
  // "Ir a mi carrito": todavía sin página propia, solo muestra un aviso
  document.getElementById('btnIrCarrito').addEventListener('click', () => {
    mostrarAviso('La página de tu carrito estará disponible próximamente.');
  });
  document.getElementById('btnPagar').addEventListener('click', () => {
    mostrarAviso('El pago en línea estará disponible próximamente.');
  });
});

/* ---------- Utilidades ---------- */
function esc(texto) {
  return String(texto ?? '').replace(/[&<>"']/g, c => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}
function soles(n) { return 'S/ ' + Number(n).toFixed(2); }

// La base de datos puede guardar la ruta como '/img/...' o 'img/...'. Una ruta que empieza con '/'
// apunta a la raíz del disco (o del servidor) y no encuentra la imagen al abrir index.html;
// por eso se le quita esa barra inicial. Las URL completas (http, https, data) no se tocan.
function rutaImagen(url) {
  if (!url) return IMG_VACIA;
  return /^(https?:|data:)/i.test(url) ? url : String(url).trim().replace(/^\/+/, '');
}

function mostrarAviso(texto) {
  document.getElementById('toastTexto').textContent = texto;
  bootstrap.Toast.getOrCreateInstance(document.getElementById('toastAviso'), { delay: 2500 }).show();
}

function mostrarAvisoEsquina(texto) {
  document.getElementById('toastEsquinaTexto').textContent = texto;
  bootstrap.Toast.getOrCreateInstance(document.getElementById('toastEsquina'), { delay: 3500 }).show();
}

/* ---------- Productos ---------- */
const MENSAJE_SIN_SERVIDOR = 'No se pudo conectar con el servidor. Verifica que el backend esté corriendo en el puerto 8081.';

// Los productos se guardan en sessionStorage: al cambiar de página (por ejemplo, de un producto a otro)
// se muestran al instante con la copia guardada, sin esperar al servidor ni ver "Cargando...".
// Luego se consulta el backend y, si algo cambió, se vuelve a pintar.
function leerCacheProductos() {
  try { return JSON.parse(sessionStorage.getItem('farma_productos')); } catch (e) { return null; }
}
function guardarCacheProductos(lista) {
  try { sessionStorage.setItem('farma_productos', JSON.stringify(lista)); } catch (e) { /* sin almacenamiento */ }
}

async function cargarProductos() {
  const contenedor = document.getElementById('productos-container');
  const cache = leerCacheProductos();
  if (Array.isArray(cache) && cache.length) {
    productos = cache;
    if (contenedor) renderMasVendidos();
    document.dispatchEvent(new CustomEvent('productos:cargados'));
  }
  try {
    const res = await fetch(`${API_URL}/productos`);
    if (!res.ok) throw new Error('Respuesta inválida');
    const nuevos = await res.json();
    guardarCacheProductos(nuevos);
    if (cache && JSON.stringify(cache) === JSON.stringify(nuevos)) return;   // nada cambió
    productos = nuevos;
    if (contenedor) renderMasVendidos();
    // Avisa a las otras páginas (productos.js, producto.js) que el catálogo ya llegó
    document.dispatchEvent(new CustomEvent('productos:cargados'));
  } catch (err) {
    if (cache) return;   // sin servidor, pero se sigue mostrando la copia guardada
    if (contenedor) contenedor.innerHTML = `<div class="w-100 text-center text-danger py-5">${MENSAJE_SIN_SERVIDOR}</div>`;
    document.dispatchEvent(new CustomEvent('productos:error'));
  }
}

function esMasVendido(p) {
  return productos.indexOf(p) > -1 && productos.indexOf(p) < MAX_MAS_VENDIDOS;
}

// Carrusel del inicio: solo los más vendidos
function renderMasVendidos() {
  const contenedor = document.getElementById('productos-container');
  const lista = productos.slice(0, MAX_MAS_VENDIDOS);
  contenedor.innerHTML = lista.length
    ? lista.map(p => htmlTarjeta(p)).join('')
    : '<div class="w-100 text-center text-muted py-5">Aún no hay productos registrados.</div>';
  sincronizarTarjetas();
}

// HTML de una tarjeta de producto. Se usa en el inicio, en la página de productos y en "relacionados".
// La imagen y el nombre llevan a la página de detalle (producto.html?id=...).
// "nombreHtml" permite pasar el nombre ya resaltado (búsqueda dinámica); si no, se usa el nombre normal.
function htmlTarjeta(p, { nombreHtml, etiqueta } = {}) {
    const stock = Number(p.stock ?? 0);
    const chipStock = stock <= 0
      ? '<span class="chip chip-out"><i class="bi bi-x-circle"></i>Agotado</span>'
      : stock <= 5
        ? `<span class="chip chip-warn"><i class="bi bi-exclamation-circle"></i>Últimas ${stock} unidades</span>`
        : '<span class="chip chip-ok"><i class="bi bi-check-circle"></i>Disponible</span>';

    // Página de detalle: se identifica por el CÓDIGO del producto (FAR-0001), no por su id
    const enlace = p.codigo
      ? `producto.html?codigo=${encodeURIComponent(p.codigo)}`
      : `producto.html?id=${encodeURIComponent(p.id)}`;
    return `
      <article class="pcard" data-id="${p.id}">
        <a href="${enlace}" class="pcard-img" aria-label="Ver detalle de ${esc(p.nombre)}">
          ${etiqueta ? `<span class="pcard-badge">${esc(etiqueta)}</span>` : ''}
          <img src="${esc(rutaImagen(p.imagenUrl))}" alt="${esc(p.nombre)}" loading="lazy"
               onerror="this.onerror=null;this.src='${IMG_VACIA}'">
        </a>
        <span class="pcard-cat">${esc(p.categoria || 'Farmacia')}</span>
        <h3 class="pcard-name"><a href="${enlace}">${nombreHtml ?? esc(p.nombre)}</a></h3>
        <p class="pcard-desc">${esc(p.descripcion)}</p>
        <div class="pcard-status">${chipStock}</div>
        <div class="pcard-price">
          <span class="price">${soles(p.precio)}</span><small>Precio online</small>
        </div>
        <div class="pcard-actions">
          <button type="button" class="btn-add" data-id="${p.id}" ${stock <= 0 ? 'disabled' : ''}>
            ${stock <= 0 ? 'Sin stock' : 'Agregar al carrito'}
          </button>
          <div class="qty-pill" role="group" aria-label="Cantidad en el carrito">
            <button type="button" data-accion="menos"></button>
            <span class="qty-num">1</span>
            <button type="button" data-accion="mas" aria-label="Agregar uno"><i class="bi bi-plus-lg"></i></button>
          </div>
          <button type="button" class="btn-fav" aria-label="Favorito"><i class="bi bi-heart"></i></button>
        </div>
      </article>`;
}

// Muestra en cada tarjeta si el producto ya está en el carrito (selector de cantidad) o no (botón "Agregar")
function sincronizarTarjetas() {
  document.querySelectorAll('.pcard').forEach(card => {
    const id = Number(card.dataset.id);
    const cant = carrito[id]?.cantidad ?? 0;
    card.classList.toggle('en-carrito', cant > 0);
    if (!cant) return;
    const p = productos.find(x => x.id === id);
    const menos = card.querySelector('[data-accion="menos"]');
    const mas = card.querySelector('[data-accion="mas"]');
    card.querySelector('.qty-num').textContent = cant;
    menos.innerHTML = cant <= 1 ? '<i class="bi bi-trash3"></i>' : '<i class="bi bi-dash-lg"></i>';
    menos.setAttribute('aria-label', cant <= 1 ? 'Quitar del carrito' : 'Quitar uno');
    mas.disabled = !!p && cant >= p.stock;
  });
}

/* ---------- Carrito ---------- */
function cargarCarrito() {
  try { carrito = JSON.parse(localStorage.getItem('farma_carrito')) || {}; }
  catch (e) { carrito = {}; }
}
function guardarCarrito() {
  try { localStorage.setItem('farma_carrito', JSON.stringify(carrito)); } catch (e) { /* sin almacenamiento */ }
}

function agregarAlCarrito(id) {
  const p = productos.find(x => x.id === id);
  if (!p) return;
  const enCarrito = carrito[id]?.cantidad ?? 0;
  if (enCarrito >= p.stock) {
    mostrarAviso('No hay más unidades disponibles de este producto.');
    return;
  }
  carrito[id] = carrito[id] || { id, nombre: p.nombre, precio: Number(p.precio), imagen: rutaImagen(p.imagenUrl), categoria: p.categoria || '', cantidad: 0 };
  carrito[id].cantidad++;
  guardarCarrito();
  actualizarCarritoUI();
}

function cambiarCantidad(id, delta) {
  if (!carrito[id]) return;
  const p = productos.find(x => x.id === id);
  const nueva = carrito[id].cantidad + delta;
  if (p && nueva > p.stock) { mostrarAviso('No hay más unidades disponibles.'); return; }
  if (nueva <= 0) delete carrito[id]; else carrito[id].cantidad = nueva;
  guardarCarrito();
  actualizarCarritoUI();
}

let temporizadorAtenuado;
function atenuarCarrito(ms) {
  const cuerpo = document.querySelector('#carritoPanel .offcanvas-body');
  cuerpo.classList.add('cart-atenuado');
  clearTimeout(temporizadorAtenuado);
  temporizadorAtenuado = setTimeout(() => cuerpo.classList.remove('cart-atenuado'), ms);
}

function eliminarDelCarrito(id, desdeTarjeta = false) {
  const item = carrito[id];
  if (!item) return;
  delete carrito[id];
  guardarCarrito();
  actualizarCarritoUI();
  if (desdeTarjeta) {  // desde la tarjeta del producto: aviso en la esquina, sin atenuar el panel
    mostrarAvisoEsquina('Has eliminado este producto de tu carrito');
    return;
  }
  if (Object.keys(carrito).length) atenuarCarrito(1200);  // solo se atenúa si quedan productos en el carrito
  mostrarAviso('Has eliminado un producto de tu carrito');
}

function actualizarCarritoUI() {
  const items = Object.values(carrito);
  const totalUnidades = items.reduce((s, i) => s + i.cantidad, 0);
  const totalPrecio = items.reduce((s, i) => s + i.cantidad * i.precio, 0);

  document.getElementById('cartCount').textContent = totalUnidades;
  sincronizarTarjetas();
  document.getElementById('carritoTotal').textContent = soles(totalPrecio);
  document.getElementById('btnPagar').disabled = !items.length;
  document.getElementById('carritoPie').classList.toggle('d-none', !items.length);

  document.getElementById('carritoItems').innerHTML = items.length
    ? `<div class="cart-store">PorTuSalud (${totalUnidades})</div>` + items.map(i => `
        <div class="cart-row">
          <img src="${esc(rutaImagen(i.imagen))}" alt="" onerror="this.onerror=null;this.src='${IMG_VACIA}'">
          <div class="cart-info">
            <div class="cart-name">${esc(i.nombre)}</div>
            ${i.categoria ? `<div class="cart-cat">${esc(i.categoria)}</div>` : ''}
            <div class="cart-qty">
              <span>Cantidad:</span>
              <button type="button" data-accion="menos" data-id="${i.id}" aria-label="Quitar uno" ${i.cantidad <= 1 ? 'disabled' : ''}>−</button>
              <span>${i.cantidad}</span>
              <button type="button" data-accion="mas" data-id="${i.id}" aria-label="Agregar uno">+</button>
            </div>
          </div>
          <div class="cart-side">
            <div class="cart-price">${soles(i.cantidad * i.precio)}</div>
            <button type="button" class="cart-del" data-accion="eliminar" data-id="${i.id}">Eliminar</button>
          </div>
        </div>`).join('')
    : `<div class="cart-empty">
        <div class="cart-empty-icon"><i class="bi bi-cart3"></i><span class="cart-empty-badge"><i class="bi bi-info-lg"></i></span></div>
        <h6>Tu carrito está vacío</h6>
        <p>Agrega productos y da el primer paso para iniciar tu compra.</p>
      </div>`;
}

/* ---------- Sesión ---------- */
// Se guarda en el navegador: { id, nombre, rol }. El rol ADMIN da acceso a admin.html
function leerSesion() {
  try { return JSON.parse(localStorage.getItem('farma_sesion')); } catch (e) { return null; }
}
function guardarSesion(sesion) {
  try { localStorage.setItem('farma_sesion', JSON.stringify(sesion)); } catch (e) { /* sin almacenamiento */ }
}
function cerrarSesion() {
  try { localStorage.removeItem('farma_sesion'); } catch (e) { /* sin almacenamiento */ }
  pintarSesion();
  mostrarAviso('Cerraste sesión correctamente.');
}

// Cambia los botones "Iniciar sesión / Registrarse" por el menú del usuario
function pintarSesion() {
  const zona = document.querySelector('#navMenu > div');
  if (!zona) return;
  if (!zona.dataset.original) zona.dataset.original = zona.innerHTML;
  const sesion = leerSesion();
  if (!sesion) { zona.innerHTML = zona.dataset.original; return; }
  const esAdmin = String(sesion.rol).toUpperCase() === 'ADMIN';
  zona.innerHTML = `
    <div class="dropdown">
      <button class="btn btn-outline-primary rounded-pill px-3 dropdown-toggle" type="button" data-bs-toggle="dropdown" aria-expanded="false">
        <i class="bi bi-person-circle me-1"></i>Hola, ${esc(sesion.nombre)}
      </button>
      <ul class="dropdown-menu dropdown-menu-end shadow-sm">
        ${esAdmin ? '<li><a class="dropdown-item" href="admin.html"><i class="bi bi-speedometer2 me-2"></i>Panel de administración</a></li><li><hr class="dropdown-divider"></li>' : ''}
        <li><button class="dropdown-item" type="button" id="btnCerrarSesion"><i class="bi bi-box-arrow-right me-2"></i>Cerrar sesión</button></li>
      </ul>
    </div>`;
  document.getElementById('btnCerrarSesion').addEventListener('click', cerrarSesion);
}

/* ---------- Login / Registro ---------- */
async function manejarLogin(e) {
  e.preventDefault();
  const correo = document.getElementById('loginCorreo').value;
  const contrasena = document.getElementById('loginContrasena').value;
  const errorBox = document.getElementById('loginError');
  errorBox.classList.add('d-none');

  try {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ correo, contrasena })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error al iniciar sesión');

    // Se guarda la sesión (id, nombre y rol) para el resto de páginas
    guardarSesion({ id: data.id, nombre: data.nombre, rol: data.rol });
    if (String(data.rol).toUpperCase() === 'ADMIN') {
      location.href = 'admin.html';      // el administrador va directo a su panel
      return;
    }
    bootstrap.Modal.getInstance(document.getElementById('loginModal')).hide();
    e.target.reset();
    pintarSesion();
    mostrarAviso(data.mensaje);
  } catch (err) {
    errorBox.textContent = err.message;
    errorBox.classList.remove('d-none');
  }
}

async function manejarRegistro(e) {
  e.preventDefault();
  const nombre = document.getElementById('regNombre').value;
  const apellido = document.getElementById('regApellido').value;
  const correo = document.getElementById('regCorreo').value;
  const contrasena = document.getElementById('regContrasena').value;
  const telefono = document.getElementById('regTelefono').value;
  const errorBox = document.getElementById('registroError');
  errorBox.classList.add('d-none');

  try {
    const res = await fetch(`${API_URL}/auth/registro`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre, apellido, correo, contrasena, telefono })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error al registrarse');

    alert('¡Cuenta creada correctamente! Ahora puedes iniciar sesión.');
    bootstrap.Modal.getInstance(document.getElementById('registroModal')).hide();
    e.target.reset();
  } catch (err) {
    errorBox.textContent = err.message;
    errorBox.classList.remove('d-none');
  }
}

/* ---------- Buscador del navbar: productos sugeridos ----------
   Mientras escribes aparece una lista con los productos que coinciden.
   Al hacer clic en uno se abre su detalle (producto.html?codigo=...).
   "Mostrar todos los resultados" o Enter llevan al catálogo filtrado. */
const MAX_SUGERENCIAS = 6;

function normalizarTexto(t) {
  return String(t ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

function iniciarSugerencias() {
  const caja = document.getElementById('buscadorForm');
  const input = document.getElementById('buscador');
  if (!caja || !input) return;

  // Panel de sugerencias y fondo oscuro (se crean una sola vez)
  caja.insertAdjacentHTML('beforeend', '<div class="sug-panel d-none" id="sugPanel" role="listbox"></div>');
  // El fondo va dentro del navbar para que oscurezca toda la página (incluido el navbar) menos el buscador
  (document.querySelector('.main-nav') || document.body)
    .insertAdjacentHTML('beforeend', '<div class="sug-fondo d-none" id="sugFondo"></div>');

  let espera;
  input.addEventListener('input', () => {
    clearTimeout(espera);
    espera = setTimeout(() => mostrarSugerencias(input.value), 120);
  });
  // Al entrar al buscador se oscurece y difumina todo lo demás (como en Inkafarma)
  input.addEventListener('focus', () => {
    document.getElementById('sugFondo').classList.remove('d-none');
    caja.classList.add('enfocado');
    if (input.value.trim()) mostrarSugerencias(input.value);
  });

  // Flechas arriba/abajo para moverse, Esc para cerrar
  input.addEventListener('keydown', (e) => {
    const items = [...document.querySelectorAll('.sug-item')];
    if (e.key === 'Escape') {
      // Si la lista está abierta, Esc solo la cierra (sin borrar lo escrito)
      if (!document.getElementById('sugPanel').classList.contains('d-none')) e.preventDefault();
      cerrarSugerencias();
      input.blur();
      return;
    }
    if (!items.length || !['ArrowDown', 'ArrowUp'].includes(e.key)) return;
    e.preventDefault();
    let i = items.findIndex(x => x.classList.contains('activa'));
    items[i]?.classList.remove('activa');
    i = e.key === 'ArrowDown' ? (i + 1) % items.length : (i <= 0 ? items.length - 1 : i - 1);
    items[i].classList.add('activa');
    items[i].scrollIntoView({ block: 'nearest' });
  });

  document.getElementById('sugFondo').addEventListener('click', cerrarSugerencias);
  document.addEventListener('click', (e) => { if (!e.target.closest('#buscadorForm')) cerrarSugerencias(); });

  // Clics dentro del panel
  document.getElementById('sugPanel').addEventListener('click', (e) => {
    const add = e.target.closest('.sug-add');
    const fav = e.target.closest('.sug-fav');
    if (add) {
      e.preventDefault();
      const id = Number(add.dataset.id);
      const antes = carrito[id]?.cantidad ?? 0;
      agregarAlCarrito(id);
      if ((carrito[id]?.cantidad ?? 0) > antes) mostrarAviso('Producto agregado a tu carrito');
      mostrarSugerencias(input.value);      // actualiza el texto del botón
      return;
    }
    if (fav) { e.preventDefault(); fav.classList.toggle('activo'); return; }
    const item = e.target.closest('.sug-item');
    if (item) irA(item.dataset.href);
  });
}

function mostrarSugerencias(texto) {
  const panel = document.getElementById('sugPanel');
  const q = texto.trim();
  if (!q) { panel.classList.add('d-none'); return; }   // sin texto: solo queda el fondo oscuro

  const palabras = normalizarTexto(q).split(/\s+/).filter(Boolean);
  const coinciden = productos.filter(p => {
    const t = normalizarTexto(`${p.codigo ?? ''} ${p.nombre} ${p.marca ?? ''} ${p.categoria ?? ''}`);
    return palabras.every(w => t.includes(w));
  });
  const verTodos = `productos.html?q=${encodeURIComponent(q)}`;

  let html = '<div class="sug-titulo">Productos sugeridos</div>';
  if (!productos.length) {
    html += '<p class="sug-vacio">Cargando productos... Si no aparecen, verifica que el backend esté encendido.</p>';
  } else if (!coinciden.length) {
    html += `<p class="sug-vacio">No encontramos productos para “${esc(q)}”.</p>`;
  } else {
    html += '<div class="sug-lista">' + coinciden.slice(0, MAX_SUGERENCIAS).map(p => {
      const stock = Number(p.stock ?? 0);
      const enCarrito = carrito[p.id]?.cantidad ?? 0;
      const href = p.codigo ? `producto.html?codigo=${encodeURIComponent(p.codigo)}` : `producto.html?id=${p.id}`;
      const boton = stock <= 0 ? 'Agotado' : enCarrito >= stock ? 'Sin más stock' : enCarrito ? `En carrito (${enCarrito})` : 'Agregar al carrito';
      return `
        <div class="sug-item" role="option" data-href="${href}">
          <img src="${esc(rutaImagen(p.imagenUrl))}" alt="" onerror="this.onerror=null;this.src='${IMG_VACIA}'">
          <div class="sug-info">
            <span class="sug-marca">${esc(p.marca || p.categoria || 'Farmacia')}</span>
            <span class="sug-nombre">${resaltarSugerencia(p.nombre, palabras)}</span>
            <span class="sug-cat">${esc(p.categoria || '')}</span>
          </div>
          <span class="sug-precio">${soles(p.precio)}</span>
          <div class="sug-acciones">
            <button type="button" class="sug-add${enCarrito ? ' en-carrito' : ''}" data-id="${p.id}" ${stock <= 0 || enCarrito >= stock ? 'disabled' : ''}>${boton}</button>
            <button type="button" class="sug-fav" aria-label="Favorito"><i class="bi bi-heart"></i></button>
          </div>
        </div>`;
    }).join('') + '</div>';
  }
  html += `<a class="sug-todos" href="${verTodos}">Mostrar todos los resultados${coinciden.length ? ` (${coinciden.length})` : ''}</a>`;

  panel.innerHTML = html;
  panel.classList.remove('d-none');
  document.getElementById('sugFondo').classList.remove('d-none');
}

function cerrarSugerencias() {
  document.getElementById('sugPanel')?.classList.add('d-none');
  document.getElementById('sugFondo')?.classList.add('d-none');
  document.getElementById('buscadorForm')?.classList.remove('enfocado');
}

// Resalta en negrita las palabras buscadas dentro del nombre (sin importar tildes)
function resaltarSugerencia(nombre, palabras) {
  const chars = [...String(nombre)];
  const norm = chars.map(c => normalizarTexto(c));
  const plano = norm.join('');
  const mapa = [];
  norm.forEach((n, i) => { for (let k = 0; k < n.length; k++) mapa.push(i); });
  const marcar = new Array(chars.length).fill(false);
  palabras.forEach(w => {
    let desde = 0, pos;
    while (w && (pos = plano.indexOf(w, desde)) !== -1) {
      for (let k = pos; k < pos + w.length; k++) marcar[mapa[k]] = true;
      desde = pos + w.length;
    }
  });
  let html = '', abierto = false;
  chars.forEach((c, i) => {
    if (marcar[i] && !abierto) { html += '<strong>'; abierto = true; }
    if (!marcar[i] && abierto) { html += '</strong>'; abierto = false; }
    html += esc(c);
  });
  return abierto ? html + '</strong>' : html;
}

/* ---------- Pantalla de carga entre páginas ----------
   Al hacer clic en un enlace interno (navbar, botones, tarjetas...) se muestra el logo con "Cargando..."
   y se deja una marca en sessionStorage; la página nueva la ve en su <head> y muestra la pantalla
   hasta que termina de cargar. También se muestra al recargar la página (F5).
   NO se muestra al hacer clic en el logo del navbar ni al entrar o pasar entre productos (producto.html). */
const CARGA_MINIMA_MS = 500;

function mostrarPantallaCarga() {
  try { sessionStorage.setItem('farma_cargando', '1'); } catch (e) { /* sin almacenamiento */ }
  document.documentElement.classList.remove('carga-saliendo');
  document.documentElement.classList.add('cargando-pagina');
}

function irA(url) {
  if (!esDetalleProducto(url)) mostrarPantallaCarga();
  location.href = url;
}

// El detalle de un producto (producto.html) se abre sin pantalla de carga
function esDetalleProducto(url) {
  return /(^|\/)producto\.html/i.test(String(url));
}

function ocultarPantallaCarga() {
  const html = document.documentElement;
  if (!html.classList.contains('cargando-pagina')) return;
  html.classList.add('carga-saliendo');                       // se desvanece
  setTimeout(() => html.classList.remove('cargando-pagina', 'carga-saliendo'), 300);
}

function iniciarPantallaCarga() {
  // La marca solo sirve para esta carga
  try { sessionStorage.removeItem('farma_cargando'); } catch (e) { /* sin almacenamiento */ }

  // Se oculta cuando la página terminó de cargar (con un mínimo para que no "parpadee")
  const ocultar = () => setTimeout(ocultarPantallaCarga, Math.max(0, CARGA_MINIMA_MS - performance.now()));
  if (document.readyState === 'complete') ocultar(); else window.addEventListener('load', ocultar);

  // Al volver con el botón "atrás" el navegador puede restaurar la página con la pantalla visible
  window.addEventListener('pageshow', (e) => { if (e.persisted) ocultarPantallaCarga(); });

  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href]');
    if (!a || e.defaultPrevented || e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
    const href = a.getAttribute('href');
    if (!href || href.startsWith('#') || /^(mailto:|tel:|javascript:)/i.test(href)) return;
    if (a.target === '_blank' || a.hasAttribute('download') || a.dataset.bsToggle) return;
    if (a.closest('.navbar-brand')) return;                                   // el logo no la muestra
    if (esDetalleProducto(a.pathname)) return;                                // entrar a un producto tampoco
    if (a.protocol !== location.protocol || a.host !== location.host) return;  // enlaces externos
    if (a.pathname === location.pathname && a.search === location.search) return; // misma página
    mostrarPantallaCarga();
  });
}
