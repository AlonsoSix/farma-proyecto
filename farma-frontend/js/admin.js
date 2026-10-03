const API_URL = 'http://localhost:8081/api';

// Estados locales
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
  try {
    const raw = localStorage.getItem('farma_user');
    if (!raw) throw new Error('No hay sesión iniciada.');
    adminUser = JSON.parse(raw);
    if (!adminUser || adminUser.rol !== 'ADMIN') {
      throw new Error('Tu cuenta no tiene privilegios de administrador.');
    }

    // Configurar información de usuario en sidebar
    const nombreCompleto = `${adminUser.nombre || 'Admin'} ${adminUser.apellido || ''}`.trim();
    document.getElementById('adminNombre').textContent = nombreCompleto;
    document.getElementById('adminAvatar').textContent = (adminUser.nombre || 'A').charAt(0).toUpperCase();
    document.getElementById('adminRol').textContent = adminUser.rol;

    document.getElementById('btnCerrarSesionAdmin').addEventListener('click', () => {
      if (confirm('¿Deseas cerrar tu sesión de administrador?')) {
        localStorage.removeItem('farma_user');
        window.location.href = 'index.html';
      }
    });

  } catch (err) {
    alert(err.message + '\nRedirigiendo a la tienda...');
    window.location.href = 'index.html';
  }
}

/* ================= 2. NAVEGACIÓN ENTRE PESTAÑAS ================= */
function inicializarNavegacion() {
  const tabs = document.querySelectorAll('.sidebar-nav-link[data-tab]');
  tabs.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const targetTab = link.getAttribute('data-tab');
      cambiarTab(targetTab);
    });
  });
}

function cambiarTab(tabName) {
  // Cambiar estilos de sidebar
  document.querySelectorAll('.sidebar-nav-link[data-tab]').forEach(l => {
    l.classList.toggle('active', l.getAttribute('data-tab') === tabName);
  });

  // Ocultar todos los paneles y mostrar el seleccionado
  document.querySelectorAll('.tab-pane-content').forEach(p => p.classList.add('d-none'));
  const targetPane = document.getElementById(`tab-${tabName}`);
  if (targetPane) targetPane.classList.remove('d-none');

  // Actualizar encabezado
  const titulos = {
    dashboard: { t: 'Dashboard', s: 'Resumen general y estadísticas del sistema' },
    productos: { t: 'Gestión de Productos', s: 'Catálogo de medicamentos, precios y control de inventario' },
    servicios: { t: 'Gestión de Servicios', s: 'Servicios farmacéuticos ofrecidos en tienda y en línea' },
    usuarios: { t: 'Gestión de Usuarios', s: 'Administración de cuentas de clientes y administradores' }
  };
  const info = titulos[tabName] || { t: 'Panel de Administración', s: '' };
  document.getElementById('seccionTitulo').textContent = info.t;
  document.getElementById('seccionSubtitulo').textContent = info.s;

  // Scroll arriba
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
            <img src="${formatearRutaImg(p.imagenUrl)}" class="table-img-thumb" alt="" onerror="this.onerror=null;this.src='data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'40\' height=\'40\' fill=\'%23ccc\' viewBox=\'0 0 16 16\'><rect width=\'16\' height=\'16\' fill=\'%23f0f4f8\'/></svg>'">
            <span class="fw-semibold">${escapeHtml(p.nombre)}</span>
          </div>
        </td>
        <td><span class="text-secondary small">${escapeHtml(p.categoria || 'Sin categoría')}</span></td>
        <td class="fw-bold">S/ ${Number(p.precio).toFixed(2)}</td>
        <td>${stock} unid.</td>
        <td>${chipStock}</td>
      </tr>
    `;
  }).join('');
}

/* ================= 4. CRUD PRODUCTOS ================= */
async function cargarProductos() {
  try {
    const res = await fetch(`${API_URL}/productos`);
    if (!res.ok) throw new Error('Error al obtener productos.');
    listaProductos = await res.json();
    renderTablaProductos();
    actualizarCategoriasFiltro();
  } catch (err) {
    mostrarToast('No se pudieron cargar los productos: ' + err.message, 'error');
  }
}

function renderTablaProductos() {
  const tbody = document.getElementById('tablaProductosBody');
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
        : `<span class="badge bg-success">Disponible</span>`;

    return `
      <tr>
        <td class="text-muted fw-bold">#${p.id}</td>
        <td>
          <img src="${formatearRutaImg(p.imagenUrl)}" class="table-img-thumb" alt="${escapeHtml(p.nombre)}"
               onerror="this.onerror=null;this.src='data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'40\' height=\'40\' fill=\'%23ccc\' viewBox=\'0 0 16 16\'><rect width=\'16\' height=\'16\' fill=\'%23f0f4f8\'/></svg>'">
        </td>
        <td>
          <div class="fw-semibold">${escapeHtml(p.nombre)}</div>
          <div class="small text-muted text-truncate" style="max-width: 250px;">${escapeHtml(p.descripcion || '')}</div>
        </td>
        <td><span class="badge bg-light text-dark border">${escapeHtml(p.categoria || 'Sin categoría')}</span></td>
        <td class="fw-bold text-primary">S/ ${Number(p.precio).toFixed(2)}</td>
        <td><span class="fw-semibold">${stock}</span></td>
        <td>${chipStock}</td>
        <td class="text-end">
          <div class="d-inline-flex gap-1">
            <button class="btn-action btn-action-edit" title="Editar" onclick="abrirModalProducto(${p.id})">
              <i class="bi bi-pencil"></i>
            </button>
            <button class="btn-action btn-action-delete" title="Eliminar" onclick="confirmarEliminar('producto', ${p.id}, '${escapeHtml(p.nombre)}')">
              <i class="bi bi-trash3"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function actualizarCategoriasFiltro() {
  const select = document.getElementById('filtroProdCategoria');
  const categorias = Array.from(new Set(listaProductos.map(p => p.categoria).filter(Boolean))).sort();
  select.innerHTML = '<option value="">Todas las categorías</option>' +
    categorias.map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('');
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
  if (url && url.trim()) {
    box.innerHTML = `<img src="${formatearRutaImg(url)}" alt="Preview" onerror="this.onerror=null;this.parentElement.innerHTML='<span class=\\\'text-danger small\\\'>No se pudo cargar la imagen</span>'">`;
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
  const url = esEdicion ? `${API_URL}/productos/${id}` : `${API_URL}/productos`;
  const metodo = esEdicion ? 'PUT' : 'POST';

  const btn = document.getElementById('btnGuardarProducto');
  btn.disabled = true;

  try {
    const res = await fetch(url, {
      method: metodo,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error al guardar producto.');

    mostrarToast(`Producto ${esEdicion ? 'actualizado' : 'creado'} correctamente.`, 'success');
    bootstrap.Modal.getInstance(document.getElementById('modalProducto')).hide();
    await cargarProductos();
    actualizarEstadisticas();
    renderDashboardRecientes();
  } catch (err) {
    mostrarToast(err.message, 'error');
  } finally {
    btn.disabled = false;
  }
}

/* ================= 5. CRUD SERVICIOS ================= */
async function cargarServicios() {
  try {
    const res = await fetch(`${API_URL}/servicios?todos=true`);
    if (!res.ok) throw new Error('Error al obtener servicios.');
    listaServicios = await res.json();
    renderTablaServicios();
  } catch (err) {
    mostrarToast('No se pudieron cargar los servicios: ' + err.message, 'error');
  }
}

function renderTablaServicios() {
  const tbody = document.getElementById('tablaServiciosBody');
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
            <i class="bi ${escapeHtml(s.icono || 'bi-heart-pulse')}"></i>
          </div>
        </td>
        <td>
          <div class="fw-semibold text-dark">${escapeHtml(s.titulo)}</div>
        </td>
        <td>
          <div class="small text-muted" style="max-width: 320px;">${escapeHtml(s.descripcion)}</div>
        </td>
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
            <button class="btn-action btn-action-delete" title="Eliminar" onclick="confirmarEliminar('servicio', ${s.id}, '${escapeHtml(s.titulo)}')">
              <i class="bi bi-trash3"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
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
  const url = esEdicion ? `${API_URL}/servicios/${id}` : `${API_URL}/servicios`;
  const metodo = esEdicion ? 'PUT' : 'POST';

  const btn = document.getElementById('btnGuardarServicio');
  btn.disabled = true;

  try {
    const res = await fetch(url, {
      method: metodo,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error al guardar servicio.');

    mostrarToast(`Servicio ${esEdicion ? 'actualizado' : 'creado'} correctamente.`, 'success');
    bootstrap.Modal.getInstance(document.getElementById('modalServicio')).hide();
    await cargarServicios();
    actualizarEstadisticas();
  } catch (err) {
    mostrarToast(err.message, 'error');
  } finally {
    btn.disabled = false;
  }
}

async function toggleEstadoServicio(id, nuevoEstado) {
  try {
    const res = await fetch(`${API_URL}/servicios/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ activo: nuevoEstado })
    });
    if (!res.ok) throw new Error('No se pudo cambiar el estado del servicio.');
    mostrarToast('Estado del servicio actualizado.', 'info');
    await cargarServicios();
    actualizarEstadisticas();
  } catch (err) {
    mostrarToast(err.message, 'error');
  }
}

/* ================= 6. CRUD USUARIOS ================= */
async function cargarUsuarios() {
  try {
    const res = await fetch(`${API_URL}/usuarios`);
    if (!res.ok) throw new Error('Error al obtener usuarios.');
    listaUsuarios = await res.json();
    renderTablaUsuarios();
  } catch (err) {
    mostrarToast('No se pudieron cargar los usuarios: ' + err.message, 'error');
  }
}

function renderTablaUsuarios() {
  const tbody = document.getElementById('tablaUsuariosBody');
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
        <td>
          <div class="fw-semibold text-dark">${escapeHtml(u.nombre)} ${escapeHtml(u.apellido || '')}</div>
        </td>
        <td><span class="text-secondary">${escapeHtml(u.correo)}</span></td>
        <td>${escapeHtml(u.telefono || '—')}</td>
        <td>${badgeRol}</td>
        <td><small class="text-muted">${fecha}</small></td>
        <td class="text-end">
          <div class="d-inline-flex gap-1">
            <button class="btn-action btn-action-edit" title="Editar" onclick="abrirModalUsuario(${u.id})">
              <i class="bi bi-pencil"></i>
            </button>
            <button class="btn-action btn-action-delete" title="Eliminar" onclick="confirmarEliminar('usuario', ${u.id}, '${escapeHtml(u.nombre)}')">
              <i class="bi bi-trash3"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
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
  if (contrasena) {
    payload.contrasena = contrasena;
  }

  const esEdicion = !!id;
  const url = esEdicion ? `${API_URL}/usuarios/${id}` : `${API_URL}/usuarios`;
  const metodo = esEdicion ? 'PUT' : 'POST';

  const btn = document.getElementById('btnGuardarUsuario');
  btn.disabled = true;

  try {
    const res = await fetch(url, {
      method: metodo,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error al guardar usuario.');

    mostrarToast(`Usuario ${esEdicion ? 'actualizado' : 'creado'} correctamente.`, 'success');
    bootstrap.Modal.getInstance(document.getElementById('modalUsuario')).hide();
    await cargarUsuarios();
    actualizarEstadisticas();
  } catch (err) {
    mostrarToast(err.message, 'error');
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
  const endpoint = tipo === 'producto' ? 'productos' : (tipo === 'servicio' ? 'servicios' : 'usuarios');

  const btn = document.getElementById('btnConfirmarEliminar');
  btn.disabled = true;

  try {
    const res = await fetch(`${API_URL}/${endpoint}/${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error al eliminar.');

    mostrarToast(`${tipo.charAt(0).toUpperCase() + tipo.slice(1)} eliminado correctamente.`, 'success');
    bootstrap.Modal.getInstance(document.getElementById('modalConfirmarEliminar')).hide();

    if (tipo === 'producto') await cargarProductos();
    else if (tipo === 'servicio') await cargarServicios();
    else if (tipo === 'usuario') await cargarUsuarios();

    actualizarEstadisticas();
    renderDashboardRecientes();
  } catch (err) {
    mostrarToast(err.message, 'error');
  } finally {
    btn.disabled = false;
    itemAEliminar = null;
  }
}

/* ================= 8. INICIALIZACIÓN DE FORMULARIOS Y EVENTOS ================= */
function inicializarFormularios() {
  document.getElementById('formProducto').addEventListener('submit', guardarProducto);
  document.getElementById('formServicio').addEventListener('submit', guardarServicio);
  document.getElementById('formUsuario').addEventListener('submit', guardarUsuario);

  document.getElementById('btnConfirmarEliminar').addEventListener('click', ejecutarEliminar);

  // Previsualizaciones reactivas
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

/* ================= 9. UTILIDADES Y TOASTS ================= */
function mostrarToast(mensaje, tipo = 'info') {
  const toastEl = document.getElementById('adminToast');
  const toastMsg = document.getElementById('adminToastMsg');
  const toastIcon = document.getElementById('adminToastIcon');

  toastMsg.textContent = mensaje;

  toastEl.classList.remove('bg-dark', 'bg-success', 'bg-danger', 'bg-warning', 'text-dark');

  if (tipo === 'success') {
    toastEl.classList.add('bg-success');
    toastIcon.className = 'bi bi-check-circle fs-5';
  } else if (tipo === 'error') {
    toastEl.classList.add('bg-danger');
    toastIcon.className = 'bi bi-exclamation-octagon fs-5';
  } else if (tipo === 'warning') {
    toastEl.classList.add('bg-warning', 'text-dark');
    toastIcon.className = 'bi bi-exclamation-triangle fs-5';
  } else {
    toastEl.classList.add('bg-dark');
    toastIcon.className = 'bi bi-info-circle fs-5';
  }

  bootstrap.Toast.getOrCreateInstance(toastEl, { delay: 3500 }).show();
}

function escapeHtml(texto) {
  return String(texto ?? '').replace(/[&<>"']/g, c => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

function formatearRutaImg(url) {
  if (!url) return '';
  return /^(https?:|data:)/i.test(url) ? url : String(url).trim().replace(/^\/+/, '');
}
