/**
 * FARMACIA FARMA - Catálogo de Productos (productos.js)
 * Aplica principios SOLID delegando el estado en CartService, AuthService, ProductoService y Formatters.
 */

const PRODUCTOS_POR_PAGINA = 9;
const EN_PAGINAS = true; // esta página se encuentra en paginas/

let productos = [];
let paginaActual = 1;
let categoriaActual = '';
let busquedaActual = '';
let precioMinimo = null;
let precioMaximo = null;
let ordenActual = '';

document.addEventListener('DOMContentLoaded', () => {
  inicializarCatalogo();
});

function inicializarCatalogo() {
  actualizarNavbarUsuario();
  actualizarCarritoUI();

  // Suscribirse a cambios en el carrito (Observer Pattern)
  if (window.FarmaCartService) {
    window.FarmaCartService.subscribe(() => {
      actualizarCarritoUI();
      renderCatalogo();
    });
  }

  configurarEventos();
  cargarProductos();
}

function configurarEventos() {
  const buscador = document.getElementById('buscador');
  const formularioBusqueda = document.getElementById('buscadorForm');

  buscador?.addEventListener('input', () => {
    busquedaActual = buscador.value.trim();
    paginaActual = 1;
    renderCatalogo();
  });

  formularioBusqueda?.addEventListener('submit', (e) => {
    e.preventDefault();
    busquedaActual = buscador?.value.trim() || '';
    paginaActual = 1;
    renderCatalogo();
  });

  // Categorías de la barra lateral
  document.querySelectorAll('aside .list-group-item a').forEach(enlace => {
    enlace.addEventListener('click', (e) => {
      e.preventDefault();
      const texto = enlace.textContent.trim();
      categoriaActual = texto.toLowerCase() === 'todas' ? '' : texto;
      paginaActual = 1;
      actualizarCategorias();
      renderCatalogo();
    });
  });

  // Filtro por precio
  const formularioFiltros = document.querySelector('aside');
  const entradasPrecio = formularioFiltros ? formularioFiltros.querySelectorAll('input[type="number"]') : [];
  const botonFiltro = formularioFiltros?.querySelector('button.btn-outline-primary');

  botonFiltro?.addEventListener('click', () => {
    const minVal = entradasPrecio[0]?.value;
    const maxVal = entradasPrecio[1]?.value;

    const min = (minVal !== '' && minVal != null) ? Number(minVal) : null;
    const max = (maxVal !== '' && maxVal != null) ? Number(maxVal) : null;

    if (min !== null && max !== null && min > max) {
      window.FarmaFormatters.showToast('El precio mínimo no puede superar al máximo.');
      return;
    }
    if ((min !== null && min < 0) || (max !== null && max < 0)) {
      window.FarmaFormatters.showToast('Los precios no pueden ser negativos.');
      return;
    }

    precioMinimo = min;
    precioMaximo = max;
    paginaActual = 1;
    renderCatalogo();
  });

  // Ordenamiento
  const selectorOrden = document.querySelector('main select.form-select');
  selectorOrden?.addEventListener('change', () => {
    ordenActual = selectorOrden.value;
    paginaActual = 1;
    renderCatalogo();
  });

  // Acciones en catálogo (Agregar al carrito)
  document.getElementById('catalogo-productos')?.addEventListener('click', (e) => {
    const boton = e.target.closest('.btn-add-cart');
    if (!boton || boton.disabled) return;
    agregarProductoAlCarrito(Number(boton.dataset.id));
  });

  // Paginación
  document.querySelector('main .pagination')?.addEventListener('click', (e) => {
    const enlace = e.target.closest('[data-page]');
    if (!enlace) return;
    e.preventDefault();
    const pag = Number(enlace.dataset.page);
    if (!pag || enlace.closest('.disabled')) return;

    paginaActual = pag;
    renderCatalogo();
    document.getElementById('catalogo-productos')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  // Acciones en carrito lateral (+, -, eliminar)
  document.getElementById('carritoItems')?.addEventListener('click', (e) => {
    const boton = e.target.closest('button[data-accion]');
    if (!boton || boton.disabled) return;

    const id = Number(boton.dataset.id);
    const accion = boton.dataset.accion;
    const prod = productos.find(p => Number(p.id) === id);
    const stock = prod ? Number(prod.stock ?? 0) : null;

    if (accion === 'eliminar') {
      window.FarmaCartService.removeItem(id);
      window.FarmaFormatters.showToast('Has eliminado este producto de tu carrito.');
    } else if (accion === 'mas') {
      const ok = window.FarmaCartService.updateQuantity(id, 1, stock);
      if (!ok) window.FarmaFormatters.showToast('No hay más unidades disponibles.');
    } else if (accion === 'menos') {
      window.FarmaCartService.updateQuantity(id, -1);
    }
  });

  document.getElementById('btnIrCarrito')?.addEventListener('click', () => {
    window.FarmaFormatters.showToast('La página de detalle de compra estará disponible próximamente.');
  });

  document.getElementById('btnPagar')?.addEventListener('click', () => {
    window.FarmaFormatters.showToast('El pago en línea estará disponible próximamente.');
  });

  // Auth en modales
  document.getElementById('loginForm')?.addEventListener('submit', manejarLogin);
  document.getElementById('registroForm')?.addEventListener('submit', manejarRegistro);
}

/* ---------- Carga de Productos ---------- */
async function cargarProductos() {
  const contenedor = document.getElementById('catalogo-productos');
  if (!contenedor || !window.FarmaProductoService) return;

  try {
    const datos = await window.FarmaProductoService.getAll();
    if (!Array.isArray(datos)) throw new Error('El servidor no devolvió una lista de productos.');

    productos = datos;
    actualizarCategorias();
    renderCatalogo();
  } catch (err) {
    contenedor.innerHTML = `
      <div class="col-12 text-center text-danger py-5">
        <i class="bi bi-exclamation-triangle fs-1"></i>
        <p class="mt-3">No se pudo conectar con el servidor.</p>
        <p class="small">Verifica que el backend esté funcionando en el puerto 8081.</p>
        <button class="btn btn-outline-primary rounded-pill" type="button" onclick="cargarProductos()">
          Intentar nuevamente
        </button>
      </div>`;
  }
}

/* ---------- Filtrado y Ordenamiento ---------- */
function obtenerProductosFiltrados() {
  const { normalizeText } = window.FarmaFormatters;
  let lista = [...productos];

  if (categoriaActual) {
    const cat = normalizeText(categoriaActual);
    lista = lista.filter(p => normalizeText(p.categoria).includes(cat));
  }

  if (busquedaActual) {
    const txt = normalizeText(busquedaActual);
    lista = lista.filter(p => {
      const contenido = normalizeText(`${p.nombre ?? ''} ${p.categoria ?? ''} ${p.descripcion ?? ''}`);
      return contenido.includes(txt);
    });
  }

  if (precioMinimo !== null) {
    lista = lista.filter(p => Number(p.precio) >= precioMinimo);
  }

  if (precioMaximo !== null) {
    lista = lista.filter(p => Number(p.precio) <= precioMaximo);
  }

  if (ordenActual === 'asc') {
    lista.sort((a, b) => Number(a.precio) - Number(b.precio));
  } else if (ordenActual === 'desc') {
    lista.sort((a, b) => Number(b.precio) - Number(a.precio));
  } else if (ordenActual === 'az') {
    lista.sort((a, b) => String(a.nombre ?? '').localeCompare(String(b.nombre ?? ''), 'es', { sensitivity: 'base' }));
  }

  return lista;
}

/* ---------- Render del Catálogo ---------- */
function renderCatalogo() {
  const contenedor = document.getElementById('catalogo-productos');
  if (!contenedor || !window.FarmaFormatters) return;

  const { escapeHtml: esc, formatSoles: soles, resolveImageUrl } = window.FarmaFormatters;
  const cartService = window.FarmaCartService;
  const lista = obtenerProductosFiltrados();

  const totalPaginas = Math.ceil(lista.length / PRODUCTOS_POR_PAGINA);
  if (totalPaginas > 0 && paginaActual > totalPaginas) paginaActual = totalPaginas;
  if (totalPaginas === 0) paginaActual = 1;

  const inicio = (paginaActual - 1) * PRODUCTOS_POR_PAGINA;
  const productosPagina = lista.slice(inicio, inicio + PRODUCTOS_POR_PAGINA);

  if (!productosPagina.length) {
    contenedor.innerHTML = `
      <div class="col-12 text-center text-muted py-5">
        <i class="bi bi-search fs-1"></i>
        <p class="mt-3">No encontramos productos con esos criterios.</p>
      </div>`;
  } else {
    contenedor.innerHTML = productosPagina.map(p => {
      const id = Number(p.id);
      const stock = Number(p.stock ?? 0);
      const cartItem = cartService ? cartService.getItem(id) : null;

      const estadoStock = stock <= 0
        ? '<span class="badge text-bg-danger mb-2">Agotado</span>'
        : stock <= 5
          ? `<span class="badge text-bg-warning mb-2">Últimas ${stock} unidades</span>`
          : '<span class="badge text-bg-success mb-2">Disponible</span>';

      return `
        <div class="col">
          <article class="product-card">
            <div class="product-card-img-container">
              <img src="${esc(resolveImageUrl(p.imagenUrl, EN_PAGINAS))}" alt="${esc(p.nombre)}"
                   loading="lazy" onerror="this.onerror=null;this.src='${window.FarmaConfig.IMG_VACIA}'">
            </div>
            <div class="product-card-body">
              <span class="product-category">${esc(p.categoria || 'Farmacia')}</span>
              <h3 class="product-title">${esc(p.nombre)}</h3>
              <p class="product-description">${esc(p.descripcion || '')}</p>
              <div class="product-stock">${estadoStock}</div>
              <div class="product-price">${soles(p.precio)}</div>
              <button type="button" class="btn-add-cart" data-id="${id}" ${stock <= 0 ? 'disabled' : ''}>
                ${
                  stock <= 0
                    ? 'Sin stock'
                    : cartItem
                      ? `Agregar otra unidad (${cartItem.cantidad})`
                      : 'Agregar al carrito'
                }
              </button>
            </div>
          </article>
        </div>`;
    }).join('');
  }

  const resumen = document.querySelector('main > .d-flex.flex-wrap p');
  if (resumen) {
    resumen.textContent = lista.length
      ? `Mostrando ${inicio + 1}-${Math.min(inicio + PRODUCTOS_POR_PAGINA, lista.length)} de ${lista.length} productos`
      : 'No hay productos para mostrar';
  }

  renderPaginacion(totalPaginas);
}

function renderPaginacion(totalPaginas) {
  const paginacion = document.querySelector('main .pagination');
  if (!paginacion) return;

  if (totalPaginas <= 1) {
    paginacion.innerHTML = '';
    return;
  }

  let html = `
    <li class="page-item ${paginaActual === 1 ? 'disabled' : ''}">
      <a class="page-link rounded-start-pill px-3" href="#" data-page="${paginaActual - 1}">Anterior</a>
    </li>`;

  for (let p = 1; p <= totalPaginas; p++) {
    html += `
      <li class="page-item ${p === paginaActual ? 'active' : ''}">
        <a class="page-link" href="#" data-page="${p}">${p}</a>
      </li>`;
  }

  html += `
    <li class="page-item ${paginaActual === totalPaginas ? 'disabled' : ''}">
      <a class="page-link rounded-end-pill px-3" href="#" data-page="${paginaActual + 1}">Siguiente</a>
    </li>`;

  paginacion.innerHTML = html;
}

function actualizarCategorias() {
  const { normalizeText } = window.FarmaFormatters;
  const enlaces = document.querySelectorAll('aside .list-group-item a');

  enlaces.forEach(enlace => {
    const texto = enlace.textContent.trim();
    const esTodas = normalizeText(texto) === 'todas';
    const activa = esTodas ? !categoriaActual : normalizeText(texto) === normalizeText(categoriaActual);

    enlace.classList.toggle('categoria-activa', activa);
    enlace.classList.toggle('fw-semibold', activa);

    const insignia = enlace.parentElement.querySelector('.badge');
    if (!insignia) return;

    const cantidad = esTodas
      ? productos.length
      : productos.filter(p => normalizeText(p.categoria).includes(normalizeText(texto))).length;

    insignia.textContent = cantidad;
    insignia.className = activa ? 'badge bg-primary rounded-pill' : 'badge bg-light text-dark rounded-pill';
  });
}

function agregarProductoAlCarrito(id) {
  const prod = productos.find(p => Number(p.id) === id);
  if (!prod) return;

  const agregado = window.FarmaCartService.addItem(prod);
  if (!agregado) {
    window.FarmaFormatters.showToast('No hay más unidades disponibles de este producto.');
  }
}

function actualizarCarritoUI() {
  if (!window.FarmaCartService || !window.FarmaFormatters) return;

  const { items, totalUnits, totalPrice } = window.FarmaCartService.getSummary();
  const { escapeHtml: esc, formatSoles: soles, resolveImageUrl } = window.FarmaFormatters;

  const contador = document.getElementById('cartCount');
  const subtotal = document.getElementById('carritoTotal');
  const botonPagar = document.getElementById('btnPagar');
  const pie = document.getElementById('carritoPie');
  const contenedor = document.getElementById('carritoItems');

  if (contador) contador.textContent = totalUnits;
  if (subtotal) subtotal.textContent = soles(totalPrice);
  if (botonPagar) botonPagar.disabled = items.length === 0;
  if (pie) pie.classList.toggle('d-none', items.length === 0);
  if (!contenedor) return;

  if (!items.length) {
    contenedor.innerHTML = `
      <div class="cart-empty">
        <div class="cart-empty-icon"><i class="bi bi-cart3"></i></div>
        <h6>Tu carrito está vacío</h6>
        <p>Agrega productos para iniciar tu compra.</p>
      </div>`;
    return;
  }

  contenedor.innerHTML = `<div class="cart-store">Farmacia Farma (${totalUnits})</div>` +
    items.map(item => {
      const prod = productos.find(p => Number(p.id) === Number(item.id));
      const sinStock = prod && item.cantidad >= Number(prod.stock ?? 0);

      return `
        <div class="cart-row">
          <img src="${esc(resolveImageUrl(item.imagen, EN_PAGINAS))}" alt="${esc(item.nombre)}"
               onerror="this.onerror=null;this.src='${window.FarmaConfig.IMG_VACIA}'">
          <div class="cart-info">
            <div class="cart-name">${esc(item.nombre)}</div>
            ${item.categoria ? `<div class="cart-cat">${esc(item.categoria)}</div>` : ''}
            <div class="cart-qty">
              <span>Cantidad:</span>
              <button type="button" data-accion="menos" data-id="${item.id}" aria-label="Quitar uno"
                      ${item.cantidad <= 1 ? 'disabled' : ''}>−</button>
              <span>${item.cantidad}</span>
              <button type="button" data-accion="mas" data-id="${item.id}" aria-label="Agregar uno"
                      ${sinStock ? 'disabled' : ''}>+</button>
            </div>
          </div>
          <div class="cart-side">
            <div class="cart-price">${soles(item.cantidad * item.precio)}</div>
            <button type="button" class="cart-del" data-accion="eliminar" data-id="${item.id}">Eliminar</button>
          </div>
        </div>`;
    }).join('');
}

function actualizarNavbarUsuario() {
  const contenedor = document.getElementById('navAuthContainer');
  if (!contenedor || !window.FarmaAuthService) return;

  const user = window.FarmaAuthService.getCurrentUser();
  const esc = window.FarmaFormatters.escapeHtml;

  if (!user || !user.id) {
    contenedor.innerHTML = `
      <a href="../login.html" class="btn btn-outline-primary rounded-pill px-3">Iniciar sesión</a>
      <a href="../login.html" class="btn btn-primary rounded-pill px-3">Registrarse</a>`;
    return;
  }

  const esAdmin = user.rol === 'ADMIN';
  contenedor.innerHTML = `
    ${esAdmin ? `<a href="../admin.html" class="btn btn-warning rounded-pill px-3 fw-semibold"><i class="bi bi-shield-lock-fill"></i> Panel Admin</a>` : ''}
    <div class="dropdown">
      <button class="btn btn-light rounded-pill px-3 dropdown-toggle" type="button" data-bs-toggle="dropdown">
        <i class="bi bi-person-circle text-primary me-1"></i>
        ${esc(user.nombre || 'Mi Cuenta')}
      </button>
      <ul class="dropdown-menu dropdown-menu-end shadow border-0">
        <li class="px-3 py-2 small">
          <strong>${esc(user.nombre)} ${esc(user.apellido || '')}</strong>
          <div><span class="badge ${esAdmin ? 'bg-primary' : 'bg-secondary'}">${esc(user.rol)}</span></div>
        </li>
        ${esAdmin ? `<li><a class="dropdown-item" href="../admin.html">Panel de administración</a></li>` : ''}
        <li><hr class="dropdown-divider"></li>
        <li>
          <a class="dropdown-item text-danger" href="#" onclick="cerrarSesionUsuario(event)">
            <i class="bi bi-box-arrow-right me-2"></i>Cerrar sesión
          </a>
        </li>
      </ul>
    </div>`;
}

function cerrarSesionUsuario(e) {
  if (e) e.preventDefault();
  window.FarmaAuthService.logout();
  actualizarNavbarUsuario();
  window.FarmaFormatters.showToast('Has cerrado sesión correctamente.');
}

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
    window.FarmaFormatters.showToast(`Bienvenido ${user.nombre || ''}.`);
  } catch (err) {
    if (errorBox) {
      errorBox.textContent = err.message || 'Error al iniciar sesión.';
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
    alert('Cuenta creada correctamente. Ahora puedes iniciar sesión.');
    const modal = document.getElementById('registroModal');
    if (modal && window.bootstrap) bootstrap.Modal.getOrCreateInstance(modal).hide();
    e.target.reset();
  } catch (err) {
    if (errorBox) {
      errorBox.textContent = err.message || 'Error al registrarse.';
      errorBox.classList.remove('d-none');
    }
  }
}