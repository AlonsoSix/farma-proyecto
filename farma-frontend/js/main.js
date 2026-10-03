const API_URL = 'http://localhost:8081/api';
const MAX_MAS_VENDIDOS = 12;
const IMG_VACIA = 'data:image/svg+xml;utf8,' + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="300" height="240" viewBox="0 0 300 240">' +
  '<rect width="300" height="240" fill="#eef3f8"/>' +
  '<g fill="none" stroke="#9fb3c8" stroke-width="8" stroke-linecap="round">' +
  '<rect x="105" y="70" width="90" height="110" rx="14"/><path d="M125 70v-16h50v16M150 105v50M125 130h50"/></g></svg>'
);

let productos = [];   // todos los productos que devuelve el backend
let carrito = {};     // { id: { id, nombre, precio, imagen, cantidad } }

document.addEventListener('DOMContentLoaded', () => {
  actualizarNavbarUsuario();
  cargarCarrito();
  actualizarCarritoUI();
  cargarProductos();
  cargarServicios();

  document.getElementById('loginForm').addEventListener('submit', manejarLogin);
  document.getElementById('registroForm').addEventListener('submit', manejarRegistro);

  // Buscador: solo visual, sin funcionalidad. Se evita que al presionar Enter la página se recargue.
  document.getElementById('buscadorForm').addEventListener('submit', (e) => e.preventDefault());

  // Flechas del carrusel de productos
  const track = document.getElementById('productos-container');
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

  // Botones dentro de las tarjetas (agregar / favorito)
  track.addEventListener('click', (e) => {
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
async function cargarProductos() {
  const contenedor = document.getElementById('productos-container');
  try {
    const res = await fetch(`${API_URL}/productos`);
    if (!res.ok) throw new Error('Respuesta inválida');
    productos = await res.json();
    renderProductos('');
  } catch (err) {
    contenedor.innerHTML = `<div class="w-100 text-center text-danger py-5">
      No se pudo conectar con el servidor. Verifica que el backend esté corriendo en el puerto 8081.
    </div>`;
  }
}

/* ---------- Servicios (Dinámicos) ---------- */
async function cargarServicios() {
  const contenedor = document.getElementById('servicios-container');
  if (!contenedor) return;

  try {
    const res = await fetch(`${API_URL}/servicios`);
    if (!res.ok) throw new Error('Respuesta inválida');
    const servicios = await res.json();
    if (!servicios || !servicios.length) return; // Mantiene los estáticos de respaldo

    contenedor.innerHTML = servicios.map(s => `
      <div class="col-md-6 col-lg-4">
        <div class="service-card">
          <div class="service-icon"><i class="bi ${esc(s.icono || 'bi-heart-pulse')}"></i></div>
          <h3>${esc(s.titulo)}</h3>
          <p>${esc(s.descripcion)}</p>
        </div>
      </div>
    `).join('');
  } catch (err) {
    // Si no conecta, se conservan los servicios estáticos definidos en el HTML
    console.warn('Cargando servicios por defecto:', err);
  }
}

function renderProductos(filtro) {
  const contenedor = document.getElementById('productos-container');
  const q = (filtro || '').trim().toLowerCase();

  // Sin búsqueda: se muestran los primeros. Con búsqueda: se filtra todo el catálogo.
  let lista = q
    ? productos.filter(p => `${p.nombre} ${p.categoria ?? ''} ${p.descripcion ?? ''}`.toLowerCase().includes(q))
    : productos.slice(0, MAX_MAS_VENDIDOS);

  if (!lista.length) {
    contenedor.innerHTML = `<div class="w-100 text-center text-muted py-5">
      ${q ? 'No encontramos productos con esa búsqueda.' : 'Aún no hay productos registrados.'}
    </div>`;
    return;
  }

  contenedor.innerHTML = lista.map(p => {
    const stock = Number(p.stock ?? 0);
    const chipStock = stock <= 0
      ? '<span class="chip chip-out"><i class="bi bi-x-circle"></i>Agotado</span>'
      : stock <= 5
        ? `<span class="chip chip-warn"><i class="bi bi-exclamation-circle"></i>Últimas ${stock} unidades</span>`
        : '<span class="chip chip-ok"><i class="bi bi-check-circle"></i>Disponible</span>';

    return `
      <article class="pcard" data-id="${p.id}">
        <div class="pcard-img">
          <img src="${esc(rutaImagen(p.imagenUrl))}" alt="${esc(p.nombre)}" loading="lazy"
               onerror="this.onerror=null;this.src='${IMG_VACIA}'">
        </div>
        <span class="pcard-cat">${esc(p.categoria || 'Farmacia')}</span>
        <h3 class="pcard-name">${esc(p.nombre)}</h3>
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
  }).join('');
  sincronizarTarjetas();
}

// Muestra en cada tarjeta si el producto ya está en el carrito (selector de cantidad) o no (botón "Agregar")
function sincronizarTarjetas() {
  document.querySelectorAll('#productos-container .pcard').forEach(card => {
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
    ? `<div class="cart-store">Farmacia Farma (${totalUnidades})</div>` + items.map(i => `
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

/* ---------- Login / Registro y Sesión ---------- */
function actualizarNavbarUsuario() {
  const navContainer = document.getElementById('navAuthContainer');
  if (!navContainer) return;

  let user = null;
  try {
    user = JSON.parse(localStorage.getItem('farma_user') || 'null');
  } catch (e) {
    user = null;
  }

  if (!user) {
    navContainer.innerHTML = `
      <button class="btn btn-outline-primary rounded-pill px-3" data-bs-toggle="modal" data-bs-target="#loginModal">Iniciar sesión</button>
      <button class="btn btn-primary rounded-pill px-3" data-bs-toggle="modal" data-bs-target="#registroModal">Registrarse</button>
    `;
    return;
  }

  const esAdmin = user.rol === 'ADMIN';
  const botonAdmin = esAdmin
    ? `<a href="admin.html" class="btn btn-warning rounded-pill px-3 fw-semibold text-dark shadow-sm d-flex align-items-center gap-1">
         <i class="bi bi-shield-lock-fill text-dark"></i> Panel Admin
       </a>`
    : '';

  navContainer.innerHTML = `
    ${botonAdmin}
    <div class="dropdown">
      <button class="btn btn-light rounded-pill px-3 dropdown-toggle d-flex align-items-center gap-2 border" type="button" data-bs-toggle="dropdown" aria-expanded="false">
        <i class="bi bi-person-circle text-primary fs-5"></i>
        <span class="fw-semibold">${esc(user.nombre || 'Mi Cuenta')}</span>
      </button>
      <ul class="dropdown-menu dropdown-menu-end shadow rounded-3 border-0 mt-2">
        <li class="px-3 py-1 text-muted small border-bottom mb-1">
          <div><strong>${esc(user.nombre)} ${esc(user.apellido || '')}</strong></div>
          <span class="badge ${esAdmin ? 'bg-primary' : 'bg-secondary'} mt-1">${user.rol}</span>
        </li>
        ${esAdmin ? '<li><a class="dropdown-item py-2" href="admin.html"><i class="bi bi-speedometer2 me-2 text-primary"></i>Ir al Panel Admin</a></li>' : ''}
        <li><hr class="dropdown-divider"></li>
        <li><a class="dropdown-item py-2 text-danger" href="#" onclick="cerrarSesionUsuario(event)"><i class="bi bi-box-arrow-right me-2"></i>Cerrar sesión</a></li>
      </ul>
    </div>
  `;
}

function cerrarSesionUsuario(e) {
  if (e) e.preventDefault();
  localStorage.removeItem('farma_user');
  actualizarNavbarUsuario();
  mostrarAviso('Has cerrado sesión correctamente.');
}

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

    // Guardar sesión de usuario
    localStorage.setItem('farma_user', JSON.stringify(data));

    bootstrap.Modal.getInstance(document.getElementById('loginModal')).hide();
    e.target.reset();
    actualizarNavbarUsuario();

    if (data.rol === 'ADMIN') {
      mostrarAviso(`¡Bienvenido Administrador ${data.nombre}! Ahora tienes acceso al Panel Admin.`);
    } else {
      mostrarAviso(`¡Bienvenido ${data.nombre}!`);
    }
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
