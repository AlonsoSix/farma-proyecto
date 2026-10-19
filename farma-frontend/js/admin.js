/**
 * FARMACIA FARMA - Panel de Administración (admin.js)
 * Aplica principios SOLID delegando operaciones CRUD y utilidades en servicios especializados.
 */

let adminUser = null;
let listaProductos = [];
let listaServicios = [];
let listaUsuarios = [];
let itemAEliminar = null; // { tipo: 'producto'|'servicio'|'usuario', id, nombre }

document.addEventListener('DOMContentLoaded', () => {
  verificarAccesoAdmin();
  inicializarNavegacion();
  inicializarFormularios();
  inicializarFiltros();
  cargarTodo();
});

/* ================= 1. VERIFICACIÓN DE SESIÓN ================= */
function verificarAccesoAdmin() {
  const authService = window.FarmaAuthService;
  if (!authService || !authService.isAdmin()) {
    alert('Acceso denegado. Tu cuenta no tiene privilegios de administrador.\nRedirigiendo a la tienda...');
    window.location.href = 'index.html';
    return;
  }

  adminUser = authService.getCurrentUser();
  const nombreCompleto = `${adminUser.nombre || 'Admin'} ${adminUser.apellido || ''}`.trim();
  document.getElementById('adminNombre').textContent = nombreCompleto;
  document.getElementById('adminAvatar').textContent = (adminUser.nombre || 'A').charAt(0).toUpperCase();
  document.getElementById('adminRol').textContent = adminUser.rol;

  document.getElementById('btnCerrarSesionAdmin')?.addEventListener('click', () => {
    if (confirm('¿Deseas cerrar tu sesión de administrador?')) {
      authService.logout();
      window.location.href = 'index.html';
    }
  });
}

/* ================= 2. NAVEGACIÓN ================= */
function inicializarNavegacion() {
  document.querySelectorAll('.sidebar-nav-link[data-tab]').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      cambiarTab(link.getAttribute('data-tab'));
    });
  });
}

function cambiarTab(tabName) {
  document.querySelectorAll('.sidebar-nav-link[data-tab]').forEach(l => {
    l.classList.toggle('active', l.getAttribute('data-tab') === tabName);
  });

  document.querySelectorAll('.tab-pane-content').forEach(p => p.classList.add('d-none'));
  const targetPane = document.getElementById(`tab-${tabName}`);
  if (targetPane) targetPane.classList.remove('d-none');

  const titulos = {
    dashboard: { t: 'Dashboard', s: 'Resumen general y estadísticas del sistema' },
    productos: { t: 'Gestión de Productos', s: 'Catálogo de medicamentos, precios y control de inventario' },
    servicios: { t: 'Gestión de Servicios', s: 'Servicios farmacéuticos ofrecidos en tienda y en línea' },
    usuarios: { t: 'Gestión de Usuarios', s: 'Administración de cuentas de clientes y administradores' }
  };
  const info = titulos[tabName] || { t: 'Panel de Administración', s: '' };
  document.getElementById('seccionTitulo').textContent = info.t;
  document.getElementById('seccionSubtitulo').textContent = info.s;
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* ================= 3. CARGA GLOBAL DE DATOS ================= */
async function cargarTodo() {
  await Promise.all([
    cargarProductos(),
    cargarServicios(),
    cargarUsuarios()
  ]);
  actualizarEstadisticas();
  renderDashboardRecientes();
}

function actualizarEstadisticas() {
  document.getElementById('statTotalProductos').textContent = listaProductos.length;
  const stockCritico = listaProductos.filter(p => Number(p.stock || 0) <= 5).length;
  document.getElementById('statStockBajo').textContent = stockCritico;

  const serviciosActivos = listaServicios.filter(s => s.activo === true).length;
  document.getElementById('statTotalServicios').textContent = serviciosActivos;
  document.getElementById('statTotalUsuarios').textContent = listaUsuarios.length;
}

function renderDashboardRecientes() {
  const tbody = document.getElementById('dashboardRecentProducts');
  if (!tbody) return;

  const esc = window.FarmaFormatters.escapeHtml;
  const resolveImg = window.FarmaFormatters.resolveImageUrl;

  if (!listaProductos.length) {
    tbody.innerHTML = '<tr><td colspan="5" class="text-center py-4 text-muted">No hay productos registrados aún.</td></tr>';
    return;
  }
  const ultimos = [...listaProductos].slice(0, 5);
  tbody.innerHTML = ultimos.map(p => {
    const stock = Number(p.stock || 0);
    const chipStock = stock <= 0
      ? '<span class="badge bg-danger">Agotado</span>'
      : stock <= 5
        ? `<span class="badge bg-warning text-dark">Bajo (${stock})</span>`
        : `<span class="badge bg-success">Disponible (${stock})</span>`;

    return `
      <tr>
        <td>
          <div class="d-flex align-items-center gap-2">
            <img src="${resolveImg(p.imagenUrl, false)}" class="table-img-thumb" alt=""
                 onerror="this.onerror=null;this.src='${window.FarmaConfig.IMG_VACIA}'">
            <span class="fw-semibold">${esc(p.nombre)}</span>
          </div>
        </td>
        <td><span class="text-secondary small">${esc(p.categoria || 'Sin categoría')}</span></td>
        <td class="fw-bold">S/ ${Number(p.precio).toFixed(2)}</td>
        <td>${stock} unid.</td>
        <td>${chipStock}</td>
      </tr>`;
  }).join('');
}

/* ================= 4. CRUD PRODUCTOS ================= */
async function cargarProductos() {
  try {
    listaProductos = await window.FarmaProductoService.getAll();
    renderTablaProductos();
    actualizarCategoriasFiltro();
  } catch (err) {
    window.FarmaFormatters.showToast('No se pudieron cargar los productos: ' + err.message, 'error');
  }
}

function renderTablaProductos() {
  const tbody = document.getElementById('tablaProductosBody');
  if (!tbody) return;

  const esc = window.FarmaFormatters.escapeHtml;
  const resolveImg = window.FarmaFormatters.resolveImageUrl;
  const filtroTexto = (document.getElementById('filtroProdNombre').value || '').trim().toLowerCase();
  const filtroCat = document.getElementById('filtroProdCategoria').value;

  const filtrados = listaProductos.filter(p => {
    const coincideTexto = !filtroTexto || (p.nombre && p.nombre.toLowerCase().includes(filtroTexto)) || (p.descripcion && p.descripcion.toLowerCase().includes(filtroTexto));
    const coincideCat = !filtroCat || p.categoria === filtroCat;
    return coincideTexto && coincideCat;
  });

  if (!filtrados.length) {
    tbody.innerHTML = '<tr><td colspan="8" class="text-center py-4 text-muted">No se encontraron productos coincidentes.</td></tr>';
    return;
  }

  tbody.innerHTML = filtrados.map(p => {
    const stock = Number(p.stock || 0);
    const chipStock = stock <= 0
      ? '<span class="badge bg-danger">Agotado</span>'
      : stock <= 5
        ? `<span class="badge bg-warning text-dark">Últimas ${stock}</span>`
        : '<span class="badge bg-success">Disponible</span>';

    return `
      <tr>
        <td class="text-muted fw-bold">#${p.id}</td>
        <td>
          <img src="${resolveImg(p.imagenUrl, false)}" class="table-img-thumb" alt="${esc(p.nombre)}"
               onerror="this.onerror=null;this.src='${window.FarmaConfig.IMG_VACIA}'">
        </td>
        <td>
          <div class="fw-semibold">${esc(p.nombre)}</div>
          <div class="small text-muted text-truncate" style="max-width: 250px;">${esc(p.descripcion || '')}</div>
        </td>
        <td><span class="badge bg-light text-dark border">${esc(p.categoria || 'Sin categoría')}</span></td>
        <td class="fw-bold text-primary">S/ ${Number(p.precio).toFixed(2)}</td>
        <td><span class="fw-semibold">${stock}</span></td>
        <td>${chipStock}</td>
        <td class="text-end">
          <div class="d-inline-flex gap-1">
            <button class="btn-action btn-action-edit" title="Editar" onclick="abrirModalProducto(${p.id})">
              <i class="bi bi-pencil"></i>
            </button>
            <button class="btn-action btn-action-delete" title="Eliminar" onclick="confirmarEliminar('producto', ${p.id}, '${esc(p.nombre)}')">
              <i class="bi bi-trash3"></i>
            </button>
          </div>
        </td>
      </tr>`;
  }).join('');
}

function actualizarCategoriasFiltro() {
  const select = document.getElementById('filtroProdCategoria');
  if (!select) return;
  const esc = window.FarmaFormatters.escapeHtml;
  const categorias = Array.from(new Set(listaProductos.map(p => p.categoria).filter(Boolean))).sort();
  select.innerHTML = '<option value="">Todas las categorías</option>' +
    categorias.map(c => `<option value="${esc(c)}">${esc(c)}</option>`).join('');
}

function abrirModalProducto(id = null) {
  const modal = new bootstrap.Modal(document.getElementById('modalProducto'));
  const titulo = document.getElementById('modalProductoTitulo');
  const previewBox = document.getElementById('prodImgPreviewBox');

  document.getElementById('formProducto').reset();
  document.getElementById('prodId').value = '';

  if (id) {
    const prod = listaProductos.find(p => p.id === id);
    if (!prod) return;
    titulo.textContent = 'Editar Producto #' + prod.id;
    document.getElementById('prodId').value = prod.id;
    document.getElementById('prodNombre').value = prod.nombre || '';
    document.getElementById('prodPrecio').value = prod.precio || '';
    document.getElementById('prodStock').value = prod.stock ?? 0;
    document.getElementById('prodCategoria').value = prod.categoria || '';
    document.getElementById('prodDescripcion').value = prod.descripcion || '';
    document.getElementById('prodImagenUrl').value = prod.imagenUrl || '';
    actualizarVistaPreviaProducto(prod.imagenUrl);
  } else {
    titulo.textContent = 'Nuevo Producto';
    previewBox.innerHTML = '<span class="text-muted small">Vista previa de imagen</span>';
  }

  modal.show();
}

function actualizarVistaPreviaProducto(url) {
  const box = document.getElementById('prodImgPreviewBox');
  if (!box) return;
  const resolveImg = window.FarmaFormatters.resolveImageUrl;
  if (url && url.trim()) {
    box.innerHTML = `<img src="${resolveImg(url, false)}" alt="Preview" onerror="this.parentElement.innerHTML='<span class=\\\'text-danger small\\\'>No se pudo cargar la imagen</span>'">`;
  } else {
    box.innerHTML = '<span class="text-muted small">Vista previa de imagen</span>';
  }
}

async function guardarProducto(e) {
  e.preventDefault();
  const id = document.getElementById('prodId').value;
  const nombre = document.getElementById('prodNombre').value.trim();
  const precio = parseFloat(document.getElementById('prodPrecio').value);
  const stock = parseInt(document.getElementById('prodStock').value, 10);
  const categoria = document.getElementById('prodCategoria').value.trim();
  const descripcion = document.getElementById('prodDescripcion').value.trim();
  const imagenUrl = document.getElementById('prodImagenUrl').value.trim();

  const payload = { nombre, precio, stock, categoria, descripcion, imagenUrl };
  const esEdicion = !!id;
  const btn = document.getElementById('btnGuardarProducto');
  btn.disabled = true;

  try {
    if (esEdicion) {
      await window.FarmaProductoService.update(id, payload);
    } else {
      await window.FarmaProductoService.create(payload);
    }

    window.FarmaFormatters.showToast(`Producto ${esEdicion ? 'actualizado' : 'creado'} correctamente.`, 'success');
    bootstrap.Modal.getInstance(document.getElementById('modalProducto')).hide();
    await cargarProductos();
    actualizarEstadisticas();
    renderDashboardRecientes();
  } catch (err) {
    window.FarmaFormatters.showToast(err.message, 'error');
  } finally {
    btn.disabled = false;
  }
}

/* ================= 5. CRUD SERVICIOS ================= */
async function cargarServicios() {
  try {
    listaServicios = await window.FarmaServicioService.getAll(true);
    renderTablaServicios();
  } catch (err) {
    window.FarmaFormatters.showToast('No se pudieron cargar los servicios: ' + err.message, 'error');
  }
}

function renderTablaServicios() {
  const tbody = document.getElementById('tablaServiciosBody');
  if (!tbody) return;
  const esc = window.FarmaFormatters.escapeHtml;

  if (!listaServicios.length) {
    tbody.innerHTML = '<tr><td colspan="6" class="text-center py-4 text-muted">Aún no hay servicios registrados.</td></tr>';
    return;
  }

  tbody.innerHTML = listaServicios.map(s => {
    const badgeActivo = s.activo
      ? '<span class="badge badge-status-active"><i class="bi bi-check-circle me-1"></i>Activo</span>'
      : '<span class="badge badge-status-inactive"><i class="bi bi-slash-circle me-1"></i>Inactivo</span>';

    return `
      <tr>
        <td class="text-muted fw-bold">#${s.id}</td>
        <td>
          <div class="service-icon-box">
            <i class="bi ${esc(s.icono || 'bi-heart-pulse')}"></i>
          </div>
        </td>
        <td><div class="fw-semibold text-dark">${esc(s.titulo)}</div></td>
        <td><div class="small text-muted" style="max-width: 320px;">${esc(s.descripcion)}</div></td>
        <td>
          <button class="btn btn-sm p-0 border-0" onclick="toggleEstadoServicio(${s.id}, ${!s.activo})" title="Cambiar estado">
            ${badgeActivo}
          </button>
        </td>
        <td class="text-end">
          <div class="d-inline-flex gap-1">
            <button class="btn-action btn-action-edit" title="Editar" onclick="abrirModalServicio(${s.id})">
              <i class="bi bi-pencil"></i>
            </button>
            <button class="btn-action btn-action-delete" title="Eliminar" onclick="confirmarEliminar('servicio', ${s.id}, '${esc(s.titulo)}')">
              <i class="bi bi-trash3"></i>
            </button>
          </div>
        </td>
      </tr>`;
  }).join('');
}

function abrirModalServicio(id = null) {
  const modal = new bootstrap.Modal(document.getElementById('modalServicio'));
  const titulo = document.getElementById('modalServicioTitulo');
  document.getElementById('formServicio').reset();
  document.getElementById('servId').value = '';

  if (id) {
    const s = listaServicios.find(x => x.id === id);
    if (!s) return;
    titulo.textContent = 'Editar Servicio #' + s.id;
    document.getElementById('servId').value = s.id;
    document.getElementById('servTitulo').value = s.titulo || '';
    document.getElementById('servIcono').value = s.icono || 'bi-heart-pulse';
    document.getElementById('servDescripcion').value = s.descripcion || '';
    document.getElementById('servActivo').checked = !!s.activo;
  } else {
    titulo.textContent = 'Nuevo Servicio';
    document.getElementById('servIcono').value = 'bi-heart-pulse';
    document.getElementById('servActivo').checked = true;
  }

  actualizarIconoPreview();
  modal.show();
}

function actualizarIconoPreview() {
  const val = document.getElementById('servIcono').value.trim() || 'bi-heart-pulse';
  document.getElementById('servIconoPreview').innerHTML = `<i class="bi ${val}"></i>`;
}

async function guardarServicio(e) {
  e.preventDefault();
  const id = document.getElementById('servId').value;
  const titulo = document.getElementById('servTitulo').value.trim();
  const icono = document.getElementById('servIcono').value.trim() || 'bi-heart-pulse';
  const descripcion = document.getElementById('servDescripcion').value.trim();
  const activo = document.getElementById('servActivo').checked;

  const payload = { titulo, icono, descripcion, activo };
  const esEdicion = !!id;
  const btn = document.getElementById('btnGuardarServicio');
  btn.disabled = true;

  try {
    if (esEdicion) {
      await window.FarmaServicioService.update(id, payload);
    } else {
      await window.FarmaServicioService.create(payload);
    }

    window.FarmaFormatters.showToast(`Servicio ${esEdicion ? 'actualizado' : 'creado'} correctamente.`, 'success');
    bootstrap.Modal.getInstance(document.getElementById('modalServicio')).hide();
    await cargarServicios();
    actualizarEstadisticas();
  } catch (err) {
    window.FarmaFormatters.showToast(err.message, 'error');
  } finally {
    btn.disabled = false;
  }
}

async function toggleEstadoServicio(id, nuevoEstado) {
  try {
    await window.FarmaServicioService.toggleActive(id, nuevoEstado);
    window.FarmaFormatters.showToast('Estado del servicio actualizado.', 'info');
    await cargarServicios();
    actualizarEstadisticas();
  } catch (err) {
    window.FarmaFormatters.showToast(err.message, 'error');
  }
}

/* ================= 6. CRUD USUARIOS ================= */
async function cargarUsuarios() {
  try {
    listaUsuarios = await window.FarmaUsuarioService.getAll();
    renderTablaUsuarios();
  } catch (err) {
    window.FarmaFormatters.showToast('No se pudieron cargar los usuarios: ' + err.message, 'error');
  }
}

function renderTablaUsuarios() {
  const tbody = document.getElementById('tablaUsuariosBody');
  if (!tbody) return;
  const esc = window.FarmaFormatters.escapeHtml;
  const filtro = (document.getElementById('filtroUsuarioNombre').value || '').trim().toLowerCase();

  const filtrados = listaUsuarios.filter(u => {
    if (!filtro) return true;
    const full = `${u.nombre || ''} ${u.apellido || ''} ${u.correo || ''}`.toLowerCase();
    return full.includes(filtro);
  });

  if (!filtrados.length) {
    tbody.innerHTML = '<tr><td colspan="7" class="text-center py-4 text-muted">No se encontraron usuarios coincidentes.</td></tr>';
    return;
  }

  tbody.innerHTML = filtrados.map(u => {
    const esAdmin = u.rol === 'ADMIN';
    const badgeRol = esAdmin
      ? '<span class="badge badge-role-admin"><i class="bi bi-shield-check me-1"></i>ADMIN</span>'
      : '<span class="badge badge-role-cliente"><i class="bi bi-person me-1"></i>CLIENTE</span>';

    const fecha = u.fechaRegistro ? new Date(u.fechaRegistro).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

    return `
      <tr>
        <td class="text-muted fw-bold">#${u.id}</td>
        <td><div class="fw-semibold text-dark">${esc(u.nombre)} ${esc(u.apellido || '')}</div></td>
        <td><span class="text-secondary">${esc(u.correo)}</span></td>
        <td>${esc(u.telefono || '—')}</td>
        <td>${badgeRol}</td>
        <td><small class="text-muted">${fecha}</small></td>
        <td class="text-end">
          <div class="d-inline-flex gap-1">
            <button class="btn-action btn-action-edit" title="Editar" onclick="abrirModalUsuario(${u.id})">
              <i class="bi bi-pencil"></i>
            </button>
            <button class="btn-action btn-action-delete" title="Eliminar" onclick="confirmarEliminar('usuario', ${u.id}, '${esc(u.nombre)}')">
              <i class="bi bi-trash3"></i>
            </button>
          </div>
        </td>
      </tr>`;
  }).join('');
}

function abrirModalUsuario(id = null) {
  const modal = new bootstrap.Modal(document.getElementById('modalUsuario'));
  const titulo = document.getElementById('modalUsuarioTitulo');
  const labelPass = document.getElementById('labelUsuContrasena');
  const inputPass = document.getElementById('usuContrasena');
  const helpPass = document.getElementById('usuContrasenaHelp');

  document.getElementById('formUsuario').reset();
  document.getElementById('usuId').value = '';

  if (id) {
    const u = listaUsuarios.find(x => x.id === id);
    if (!u) return;
    titulo.textContent = 'Editar Usuario #' + u.id;
    document.getElementById('usuId').value = u.id;
    document.getElementById('usuNombre').value = u.nombre || '';
    document.getElementById('usuApellido').value = u.apellido || '';
    document.getElementById('usuCorreo').value = u.correo || '';
    document.getElementById('usuTelefono').value = u.telefono || '';
    document.getElementById('usuRol').value = u.rol || 'CLIENTE';

    labelPass.textContent = 'Contraseña (Opcional)';
    inputPass.required = false;
    inputPass.placeholder = 'Dejar vacío para conservar la contraseña';
    helpPass.classList.remove('d-none');
  } else {
    titulo.textContent = 'Nuevo Usuario';
    document.getElementById('usuRol').value = 'CLIENTE';
    labelPass.textContent = 'Contraseña *';
    inputPass.required = true;
    inputPass.placeholder = 'Mínimo 6 caracteres';
    helpPass.classList.add('d-none');
  }

  modal.show();
}

async function guardarUsuario(e) {
  e.preventDefault();
  const id = document.getElementById('usuId').value;
  const nombre = document.getElementById('usuNombre').value.trim();
  const apellido = document.getElementById('usuApellido').value.trim();
  const correo = document.getElementById('usuCorreo').value.trim();
  const telefono = document.getElementById('usuTelefono').value.trim();
  const rol = document.getElementById('usuRol').value;
  const contrasena = document.getElementById('usuContrasena').value.trim();

  const payload = { nombre, apellido, correo, telefono, rol };
  if (contrasena) payload.contrasena = contrasena;

  const esEdicion = !!id;
  const btn = document.getElementById('btnGuardarUsuario');
  btn.disabled = true;

  try {
    if (esEdicion) {
      await window.FarmaUsuarioService.update(id, payload);
    } else {
      await window.FarmaUsuarioService.create(payload);
    }

    window.FarmaFormatters.showToast(`Usuario ${esEdicion ? 'actualizado' : 'creado'} correctamente.`, 'success');
    bootstrap.Modal.getInstance(document.getElementById('modalUsuario')).hide();
    await cargarUsuarios();
    actualizarEstadisticas();
  } catch (err) {
    window.FarmaFormatters.showToast(err.message, 'error');
  } finally {
    btn.disabled = false;
  }
}

/* ================= 7. ELIMINACIÓN GENÉRICA ================= */
function confirmarEliminar(tipo, id, nombre) {
  if (tipo === 'usuario' && adminUser && adminUser.id === id) {
    alert('No puedes eliminar tu propia cuenta de administrador en sesión.');
    return;
  }

  itemAEliminar = { tipo, id, nombre };
  const titulos = {
    producto: '¿Eliminar Producto?',
    servicio: '¿Eliminar Servicio?',
    usuario: '¿Eliminar Usuario?'
  };

  document.getElementById('eliminarTitulo').textContent = titulos[tipo] || '¿Eliminar registro?';
  document.getElementById('eliminarMensaje').textContent = `¿Estás seguro de que deseas eliminar permanentemente "${nombre}"? Esta acción no se puede deshacer.`;

  const modal = new bootstrap.Modal(document.getElementById('modalConfirmarEliminar'));
  modal.show();
}

async function ejecutarEliminar() {
  if (!itemAEliminar) return;
  const { tipo, id } = itemAEliminar;
  const btn = document.getElementById('btnConfirmarEliminar');
  btn.disabled = true;

  try {
    if (tipo === 'producto') await window.FarmaProductoService.delete(id);
    else if (tipo === 'servicio') await window.FarmaServicioService.delete(id);
    else if (tipo === 'usuario') await window.FarmaUsuarioService.delete(id);

    window.FarmaFormatters.showToast(`${tipo.charAt(0).toUpperCase() + tipo.slice(1)} eliminado correctamente.`, 'success');
    bootstrap.Modal.getInstance(document.getElementById('modalConfirmarEliminar')).hide();

    if (tipo === 'producto') await cargarProductos();
    else if (tipo === 'servicio') await cargarServicios();
    else if (tipo === 'usuario') await cargarUsuarios();

    actualizarEstadisticas();
    renderDashboardRecientes();
  } catch (err) {
    window.FarmaFormatters.showToast(err.message, 'error');
  } finally {
    btn.disabled = false;
    itemAEliminar = null;
  }
}

/* ================= 8. INICIALIZACIÓN ================= */
function inicializarFormularios() {
  document.getElementById('formProducto').addEventListener('submit', guardarProducto);
  document.getElementById('formServicio').addEventListener('submit', guardarServicio);
  document.getElementById('formUsuario').addEventListener('submit', guardarUsuario);
  document.getElementById('btnConfirmarEliminar').addEventListener('click', ejecutarEliminar);

  document.getElementById('prodImagenUrl').addEventListener('input', (e) => {
    actualizarVistaPreviaProducto(e.target.value);
  });
  document.getElementById('servIcono').addEventListener('input', actualizarIconoPreview);
}

function inicializarFiltros() {
  document.getElementById('filtroProdNombre').addEventListener('input', renderTablaProductos);
  document.getElementById('filtroProdCategoria').addEventListener('change', renderTablaProductos);
  document.getElementById('filtroUsuarioNombre').addEventListener('input', renderTablaUsuarios);
}
