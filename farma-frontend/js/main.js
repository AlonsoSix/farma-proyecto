/**
 * FARMACIA FARMA - Control Principal (main.js)
 * Aplica principios SOLID delegando autenticación, carrito y utilidades en servicios especializados.
 */

// Detección de subcarpeta
const EN_PAGINAS = /\/paginas\//.test(window.location.pathname);
const RUTA = (archivo) => (EN_PAGINAS ? '../' + archivo : archivo);

document.addEventListener('DOMContentLoaded', () => {
  inicializarUI();
  configurarEventosGenerales();
  cargarServicios();
});

function inicializarUI() {
  actualizarNavbarUsuario();

  // Suscribir render del carrito a los cambios en CartService
  if (window.FarmaCartService) {
    window.FarmaCartService.subscribe(() => {
      actualizarCarritoUI();
    });
  }
  actualizarCarritoUI();
}

function configurarEventosGenerales() {
  const loginForm = document.getElementById('loginForm');
  const registroForm = document.getElementById('registroForm');
  if (loginForm) loginForm.addEventListener('submit', manejarLogin);
  if (registroForm) registroForm.addEventListener('submit', manejarRegistro);

  const buscadorForm = document.getElementById('buscadorForm');
  if (buscadorForm) buscadorForm.addEventListener('submit', (e) => e.preventDefault());

  const btnIrCarrito = document.getElementById('btnIrCarrito');
  if (btnIrCarrito) {
    btnIrCarrito.addEventListener('click', () => {
      window.FarmaFormatters.showToast('Ve al catálogo de productos para gestionar tu carrito.');
    });
  }

  const btnPagar = document.getElementById('btnPagar');
  if (btnPagar) {
    btnPagar.addEventListener('click', () => {
      window.FarmaFormatters.showToast('El pago en línea estará disponible próximamente.');
    });
  }

  const contactoForm = document.getElementById('contactoForm');
  if (contactoForm) {
    contactoForm.addEventListener('submit', (e) => {
      e.preventDefault();
      contactoForm.reset();
      window.FarmaFormatters.showToast('¡Gracias por escribirnos! Te responderemos lo antes posible.');
    });
  }
}

/* ---------- Barra de Navegación y Sesión ---------- */
function cerrarSesionUsuario(e) {
  if (e) e.preventDefault();
  if (window.FarmaAuthService) {
    window.FarmaAuthService.logout();
  }
  window.location.href = RUTA('login.html');
}

function actualizarNavbarUsuario() {
  const nav = document.getElementById('navAuthContainer');
  if (!nav) return;

  const authService = window.FarmaAuthService;
  const user = authService ? authService.getCurrentUser() : null;
  const esc = window.FarmaFormatters.escapeHtml;

  if (!user || !user.id) {
    nav.innerHTML = `
      <a href="${RUTA('login.html')}" class="btn btn-primary rounded-pill px-3">Iniciar sesión</a>
    `;
    return;
  }

  const esAdmin = user.rol === 'ADMIN';
  const botonAdmin = esAdmin
    ? `<a href="${RUTA('admin.html')}" class="btn btn-warning rounded-pill px-3 fw-semibold text-dark d-flex align-items-center gap-1">
         <i class="bi bi-shield-lock-fill"></i> Panel Admin
       </a>`
    : '';

  nav.innerHTML = `
    ${botonAdmin}
    <div class="dropdown">
      <button class="btn btn-light rounded-pill px-3 dropdown-toggle d-flex align-items-center gap-2 border" type="button" data-bs-toggle="dropdown" aria-expanded="false">
        <i class="bi bi-person-circle text-primary fs-5"></i>
        <span class="fw-semibold">${esc(user.nombre || 'Mi Cuenta')}</span>
      </button>
      <ul class="dropdown-menu dropdown-menu-end shadow rounded-3 border-0 mt-2">
        <li class="px-3 py-1 text-muted small border-bottom mb-1">
          <div><strong>${esc(user.nombre)} ${esc(user.apellido || '')}</strong></div>
          <span class="badge ${esAdmin ? 'bg-primary' : 'bg-secondary'} mt-1">${esc(user.rol)}</span>
        </li>
        <li><a class="dropdown-item py-2 text-danger" href="#" onclick="cerrarSesionUsuario(event)"><i class="bi bi-box-arrow-right me-2"></i>Cerrar sesión</a></li>
      </ul>
    </div>
  `;
}

/* ---------- Servicios ---------- */
async function cargarServicios() {
  const contenedor = document.getElementById('servicios-container');
  if (!contenedor || !window.FarmaServicioService) return;

  const esc = window.FarmaFormatters.escapeHtml;

  try {
    const servicios = await window.FarmaServicioService.getAll(false);
    if (!servicios || !servicios.length) {
      contenedor.innerHTML = '<div class="col-12 text-center text-muted py-5">No hay servicios registrados.</div>';
      return;
    }

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
    contenedor.innerHTML = `
      <div class="col-12 text-center text-danger py-5">
        No se pudo conectar con el servidor. Verifica que el backend esté corriendo en el puerto 8081.
      </div>`;
  }
}

/* ---------- Manejo de Auth en Modales ---------- */
async function manejarLogin(e) {
  e.preventDefault();
  const correo = document.getElementById('loginCorreo').value.trim();
  const contrasena = document.getElementById('loginContrasena').value;
  const errorBox = document.getElementById('loginError');
  errorBox?.classList.add('d-none');

  try {
    const user = await window.FarmaAuthService.login(correo, contrasena);
    const modal = document.getElementById('loginModal');
    if (modal && window.bootstrap) bootstrap.Modal.getOrCreateInstance(modal).hide();
    e.target.reset();
    actualizarNavbarUsuario();
    window.FarmaFormatters.showToast(`¡Bienvenido ${user.nombre}!`);
  } catch (err) {
    if (errorBox) {
      errorBox.textContent = err.message || 'Error al iniciar sesión';
      errorBox.classList.remove('d-none');
    }
  }
}

async function manejarRegistro(e) {
  e.preventDefault();
  const nombre = document.getElementById('regNombre').value.trim();
  const apellido = document.getElementById('regApellido').value.trim();
  const correo = document.getElementById('regCorreo').value.trim();
  const contrasena = document.getElementById('regContrasena').value;
  const telefono = document.getElementById('regTelefono').value.trim();
  const errorBox = document.getElementById('registroError');
  errorBox?.classList.add('d-none');

  try {
    await window.FarmaAuthService.register({ nombre, apellido, correo, contrasena, telefono });
    alert('¡Cuenta creada correctamente! Ahora puedes iniciar sesión.');
    const modal = document.getElementById('registroModal');
    if (modal && window.bootstrap) bootstrap.Modal.getOrCreateInstance(modal).hide();
    e.target.reset();
  } catch (err) {
    if (errorBox) {
      errorBox.textContent = err.message || 'Error al registrarse';
      errorBox.classList.remove('d-none');
    }
  }
}

/* ---------- Carrito (Vista lateral) ---------- */
function actualizarCarritoUI() {
  if (!window.FarmaCartService || !window.FarmaFormatters) return;

  const { items, totalUnits, totalPrice } = window.FarmaCartService.getSummary();
  const { escapeHtml: esc, formatSoles: soles, resolveImageUrl } = window.FarmaFormatters;

  const contador = document.getElementById('cartCount');
  const subtotal = document.getElementById('carritoTotal');
  const botonPagar = document.getElementById('btnPagar');
  const pie = document.getElementById('carritoPie');
  const contenedor = document.getElementById('carritoItems');

  if (contador) {
    const anterior = Number(contador.dataset.valor ?? 0);
    contador.textContent = totalUnits;
    if (anterior !== totalUnits) {
      contador.dataset.valor = totalUnits;
      if (window.FarmaFormatters.pulse) window.FarmaFormatters.pulse(contador);
    }
  }
  if (subtotal) subtotal.textContent = soles(totalPrice);
  if (botonPagar) botonPagar.disabled = items.length === 0;
  if (pie) pie.classList.toggle('d-none', items.length === 0);
  if (!contenedor) return;

  if (!items.length) {
    contenedor.innerHTML = `
      <div class="cart-empty">
        <div class="cart-empty-icon"><i class="bi bi-cart3"></i></div>
        <h6>Tu carrito está vacío</h6>
        <p>Agrega productos y da el primer paso para iniciar tu compra.</p>
      </div>`;
    return;
  }

  contenedor.innerHTML = `<div class="cart-store">Boticas Por tu Salud (${totalUnits})</div>` +
    items.map(i => `
      <div class="cart-row">
        <img src="${esc(resolveImageUrl(i.imagen, EN_PAGINAS))}" alt="${esc(i.nombre)}"
             onerror="this.onerror=null;this.src='${window.FarmaConfig ? window.FarmaConfig.IMG_VACIA : ''}'">
        <div class="cart-info">
          <div class="cart-name">${esc(i.nombre)}</div>
          ${i.categoria ? `<div class="cart-cat">${esc(i.categoria)}</div>` : ''}
          <div class="cart-qty"><span>Cantidad:</span> <span>${i.cantidad}</span></div>
        </div>
        <div class="cart-side">
          <div class="cart-price">${soles(Number(i.cantidad) * Number(i.precio))}</div>
        </div>
      </div>`).join('');
}
