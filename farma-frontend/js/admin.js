/* =====================================================================
   Panel de administración: CRUD de productos
   - Registrar  -> POST   /api/productos
   - Editar     -> PUT    /api/productos/codigo/{codigo}
   - Eliminar   -> DELETE /api/productos/codigo/{codigo}
   - Búsqueda estática por código -> GET /api/productos/codigo/{codigo}
   - Búsqueda dinámica            -> GET /api/productos/buscar?texto=...
   Cada producto se identifica por su CÓDIGO (FAR-0001), no por su id.
   ===================================================================== */

const API = 'http://localhost:8081/api';
const IMG_VACIA = 'data:image/svg+xml;utf8,' + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 80 80">' +
  '<rect width="80" height="80" fill="#eef3f8"/><g fill="none" stroke="#9fb3c8" stroke-width="3" stroke-linecap="round">' +
  '<rect x="27" y="22" width="26" height="36" rx="5"/><path d="M33 22v-5h14v5M40 33v14M33 40h14"/></g></svg>'
);

let todos = [];            // catálogo completo (para el resumen y las categorías)
let vista = [];            // productos que se muestran en la tabla
let modo = { tipo: 'todos', valor: '' };   // 'todos' | 'codigo' | 'dinamica'
let editando = null;       // código del producto que se edita (null = registrar)
let porEliminar = null;    // producto que se va a eliminar
let porCambiar = null;     // producto que se va a dar de baja o activar
let filtroEstado = 'todos';   // 'todos' | 'activos' | 'inactivos'

const $ = (id) => document.getElementById(id);
let modalProducto, modalEliminar, modalEstado;

/* ---------- Sesión: solo entra el ADMIN ---------- */
function leerSesion() {
  try { return JSON.parse(localStorage.getItem('farma_sesion')); } catch (e) { return null; }
}
const sesion = leerSesion();
const esAdmin = !!sesion && String(sesion.rol).toUpperCase() === 'ADMIN';

document.addEventListener('DOMContentLoaded', () => {
  $('btnSalir').addEventListener('click', () => {
    try { localStorage.removeItem('farma_sesion'); } catch (e) { /* sin almacenamiento */ }
    location.href = 'index.html';
  });

  if (!esAdmin) {           // cliente o sin sesión: no se muestra el panel
    $('sinAcceso').classList.remove('d-none');
    $('btnSalir').classList.add('d-none');
    return;
  }
  $('panel').classList.remove('d-none');
  $('adminNombre').textContent = sesion.nombre || 'Administrador';

  modalProducto = new bootstrap.Modal($('modalProducto'));
  modalEliminar = new bootstrap.Modal($('modalEliminar'));
  modalEstado = new bootstrap.Modal($('modalEstado'));

  // Búsqueda ESTÁTICA por código (al presionar Buscar / Enter)
  $('formCodigo').addEventListener('submit', (e) => {
    e.preventDefault();
    $('busquedaDinamica').value = '';
    buscarPorCodigo($('busquedaCodigo').value);
  });

  // Búsqueda DINÁMICA (mientras se escribe, con una pequeña espera)
  let espera;
  $('busquedaDinamica').addEventListener('input', (e) => {
    clearTimeout(espera);
    $('busquedaCodigo').value = '';
    espera = setTimeout(() => buscarDinamico(e.target.value), 300);
  });

  $('btnTodos').addEventListener('click', verTodos);
  $('filtroActivo').addEventListener('click', (e) => { if (e.target.closest('button')) verTodos(); });

  // Acciones de la tabla
  $('tablaCuerpo').addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-accion]');
    if (!btn) return;
    const p = vista.find(x => x.codigo === btn.dataset.codigo);
    if (!p) return;
    if (btn.dataset.accion === 'editar') abrirFormulario(p);
    if (btn.dataset.accion === 'eliminar') pedirEliminar(p);
    if (btn.dataset.accion === 'estado') pedirCambioEstado(p);
  });

  // Formulario
  $('btnNuevo').addEventListener('click', () => abrirFormulario(null));
  $('formProducto').addEventListener('submit', guardar);
  $('fImagen').addEventListener('input', actualizarPreview);
  // El stock debe ser un número entero (0, 1, 2...)
  $('fStock').addEventListener('input', validarStock);
  $('fNoVence').addEventListener('change', (e) => {
    $('fVencimiento').disabled = e.target.checked;
    if (e.target.checked) $('fVencimiento').value = '';
  });
  $('btnConfirmarEliminar').addEventListener('click', eliminar);
  $('btnConfirmarEstado').addEventListener('click', cambiarEstado);
  $('filtroEstado').addEventListener('change', (e) => { filtroEstado = e.target.value; pintarTabla(); });

  cargarTodo();
});

/* ---------- Utilidades ---------- */
function esc(t) {
  return String(t ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function soles(n) { return 'S/ ' + Number(n).toFixed(2); }
function rutaImagen(url) {
  if (!url) return IMG_VACIA;
  return /^(https?:|data:)/i.test(url) ? url : String(url).trim().replace(/^\/+/, '');
}
function formatoFecha(v) {
  if (!v) return null;
  const [a, m, d] = Array.isArray(v) ? v : String(v).slice(0, 10).split('-').map(Number);
  return new Date(a, m - 1, d).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' });
}
function aviso(texto) {
  $('toastTexto').textContent = texto;
  bootstrap.Toast.getOrCreateInstance($('toastAviso'), { delay: 2800 }).show();
}
// "5", "0005", "far5" o "FAR-0005" -> "FAR-0005"
function normalizarCodigo(texto) {
  const limpio = String(texto).trim().toUpperCase();
  const numero = limpio.replace(/^FAR-?/, '');
  return /^\d+$/.test(numero) ? 'FAR-' + numero.padStart(4, '0') : limpio;
}
// Marca el texto buscado con <mark> (todo escapado)
function resaltar(texto, q) {
  const t = String(texto ?? '');
  if (!q) return esc(t);
  const i = t.toLowerCase().indexOf(q.toLowerCase());
  if (i < 0) return esc(t);
  return esc(t.slice(0, i)) + '<mark>' + esc(t.slice(i, i + q.length)) + '</mark>' + esc(t.slice(i + q.length));
}

// fetch con manejo de errores: el backend responde {"error": "..."}
async function api(ruta, opciones = {}) {
  let res;
  try {
    res = await fetch(API + ruta, opciones);
  } catch (e) {
    throw new Error('No se pudo conectar con el servidor. Verifica que el backend esté corriendo en el puerto 8081.');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || `Error del servidor (${res.status}).`);
    err.status = res.status;
    throw err;
  }
  return data;
}
const cabecerasAdmin = () => ({ 'Content-Type': 'application/json', 'X-Usuario-Id': String(sesion.id) });

/* ---------- Carga y vistas ---------- */
// El panel pide TODOS los productos (también los dados de baja); la tienda solo recibe los activos
const cargarCatalogoAdmin = () => api('/productos/admin', { headers: cabecerasAdmin() });
const estaActivo = (p) => p.activo !== false;
async function cargarTodo() {
  try {
    todos = await cargarCatalogoAdmin();
    pintarResumen();
    await refrescarVista();
  } catch (e) {
    $('resultadoTexto').textContent = 'Sin conexión';
    $('tablaCuerpo').innerHTML = `<tr><td colspan="8" class="text-center text-danger py-5">${esc(e.message)}</td></tr>`;
  }
}

// Vuelve a aplicar la búsqueda que estaba activa (después de registrar, editar o eliminar)
async function refrescarVista() {
  if (modo.tipo === 'codigo') return buscarPorCodigo(modo.valor, true);
  if (modo.tipo === 'dinamica') return buscarDinamico(modo.valor);
  vista = todos;
  pintarTabla();
}

function verTodos() {
  $('busquedaCodigo').value = '';
  $('busquedaDinamica').value = '';
  modo = { tipo: 'todos', valor: '' };
  vista = todos;
  pintarTabla();
}

async function buscarPorCodigo(texto, silencioso = false) {
  const codigo = normalizarCodigo(texto);
  if (!codigo) return verTodos();
  $('busquedaCodigo').value = codigo;
  modo = { tipo: 'codigo', valor: codigo };
  try {
    vista = [await api('/productos/codigo/' + encodeURIComponent(codigo))];
    pintarTabla();
  } catch (e) {
    vista = [];
    pintarTabla(e.status === 404 ? `No existe un producto con el código ${codigo}.` : e.message);
    if (!silencioso && e.status !== 404) aviso(e.message);
  }
}

async function buscarDinamico(texto) {
  const q = texto.trim();
  if (!q) return verTodos();
  modo = { tipo: 'dinamica', valor: q };
  try {
    const resultado = await api('/productos/buscar?texto=' + encodeURIComponent(q));
    if (modo.valor !== q) return;      // llegó una respuesta vieja: se ignora
    vista = resultado;
    pintarTabla();
  } catch (e) {
    vista = [];
    pintarTabla(e.message);
  }
}

/* ---------- Pintar ---------- */
function pintarResumen() {
  $('statTotal').textContent = todos.length;
  $('statBaja').textContent = todos.filter(p => !estaActivo(p)).length;
  $('statBajo').textContent = todos.filter(p => p.stock > 0 && p.stock <= 5).length;
  $('statAgotados').textContent = todos.filter(p => p.stock <= 0).length;
  // Categorías existentes como sugerencias en el formulario
  const cats = [...new Set(todos.map(p => p.categoria).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'es'));
  $('listaCategorias').innerHTML = cats.map(c => `<option value="${esc(c)}"></option>`).join('');
}

function pintarTabla(mensajeVacio) {
  const q = modo.tipo === 'dinamica' ? modo.valor : '';
  // Filtro "Mostrar": todos / solo activos / solo dados de baja
  const lista = vista.filter(p => filtroEstado === 'todos' || (filtroEstado === 'activos') === estaActivo(p));
  $('resultadoTexto').innerHTML = modo.tipo === 'todos' && filtroEstado === 'todos'
    ? `<strong>${lista.length}</strong> productos registrados`
    : `<strong>${lista.length}</strong> ${lista.length === 1 ? 'resultado' : 'resultados'} de ${todos.length} productos`;
  $('filtroActivo').innerHTML = modo.tipo === 'todos' ? '' : `
    <button type="button" class="filtro-chip">
      ${modo.tipo === 'codigo' ? 'Código' : 'Búsqueda'}: “${esc(modo.valor)}” <i class="bi bi-x"></i>
    </button>`;

  if (!lista.length) {
    if (vista.length && !mensajeVacio) mensajeVacio = filtroEstado === 'activos' ? 'No hay productos activos con este filtro.' : 'No hay productos dados de baja con este filtro.';
    $('tablaCuerpo').innerHTML = `
      <tr><td colspan="8" class="admin-vacio">
        <i class="bi bi-search"></i>
        <p class="mb-0">${esc(mensajeVacio || 'No hay productos que coincidan con la búsqueda.')}</p>
      </td></tr>`;
    return;
  }

  $('tablaCuerpo').innerHTML = lista.map(p => {
    const stock = Number(p.stock ?? 0);
    const chip = stock <= 0 ? 'chip-out' : stock <= 5 ? 'chip-warn' : 'chip-ok';
    const activo = estaActivo(p);
    return `
      <tr class="${activo ? '' : 'fila-inactiva'}">
        <td><span class="admin-codigo">${resaltar(p.codigo, q)}</span></td>
        <td>
          <div class="admin-prod">
            <img src="${esc(rutaImagen(p.imagenUrl))}" alt="" onerror="this.onerror=null;this.src='${IMG_VACIA}'">
            <div>
              <a class="admin-prod-nombre" href="producto.html?codigo=${encodeURIComponent(p.codigo)}" target="_blank" rel="noopener">${resaltar(p.nombre, q)}</a>
              <small>${p.marca ? resaltar(p.marca, q) : '<span class="text-muted">Sin marca</span>'}</small>
            </div>
          </div>
        </td>
        <td>${resaltar(p.categoria || '—', q)}</td>
        <td class="fw-semibold text-nowrap">${soles(p.precio)}</td>
        <td><span class="chip ${chip}">${stock}</span></td>
        <td class="text-nowrap">${formatoFecha(p.fechaVencimiento) ?? '<span class="text-muted">No aplica</span>'}</td>
        <td>${activo
          ? '<span class="estado estado-activo"><i class="bi bi-circle-fill"></i>Activo</span>'
          : '<span class="estado estado-baja"><i class="bi bi-circle-fill"></i>De baja</span>'}</td>
        <td class="text-nowrap">
          <button type="button" class="admin-accion" data-accion="editar" data-codigo="${esc(p.codigo)}" title="Editar" aria-label="Editar ${esc(p.nombre)}"><i class="bi bi-pencil"></i></button>
          ${activo
            ? `<button type="button" class="admin-accion admin-accion-baja" data-accion="estado" data-codigo="${esc(p.codigo)}" title="Dar de baja" aria-label="Dar de baja ${esc(p.nombre)}"><i class="bi bi-eye-slash"></i></button>`
            : `<button type="button" class="admin-accion admin-accion-activar" data-accion="estado" data-codigo="${esc(p.codigo)}" title="Activar" aria-label="Activar ${esc(p.nombre)}"><i class="bi bi-eye"></i></button>`}
          <button type="button" class="admin-accion admin-accion-borrar" data-accion="eliminar" data-codigo="${esc(p.codigo)}" title="Eliminar" aria-label="Eliminar ${esc(p.nombre)}"><i class="bi bi-trash3"></i></button>
        </td>
      </tr>`;
  }).join('');
}

/* ---------- Registrar / Editar ---------- */
function validarStock() {
  $('fStock').setCustomValidity(/^\d+$/.test($('fStock').value) ? '' : 'entero');
}

function abrirFormulario(p) {
  editando = p ? p.codigo : null;
  const f = $('formProducto');
  f.reset();
  $('fStock').setCustomValidity('');
  f.classList.remove('was-validated');
  $('formError').classList.add('d-none');
  $('modalProductoTitulo').textContent = p ? 'Editar producto' : 'Registrar producto';
  $('modalProductoSub').textContent = p ? `Modificando ${p.codigo}. El código no se puede cambiar.` : 'Completa los datos. Los campos con * son obligatorios.';
  $('fCodigo').value = p ? p.codigo : 'Automático';
  $('fNombre').value = p?.nombre ?? '';
  $('fMarca').value = p?.marca ?? '';
  $('fCategoria').value = p?.categoria ?? '';
  $('fPrecio').value = p ? Number(p.precio).toFixed(2) : '';
  $('fStock').value = p?.stock ?? '';
  $('fVencimiento').value = p?.fechaVencimiento ? String(p.fechaVencimiento).slice(0, 10) : '';
  $('fNoVence').checked = !!p && !p.fechaVencimiento;
  $('fVencimiento').disabled = $('fNoVence').checked;
  $('fImagen').value = p?.imagenUrl ?? '';
  $('fDescripcion').value = p?.descripcion ?? '';
  actualizarPreview();
  modalProducto.show();
}

function actualizarPreview() {
  const img = $('fPreview');
  img.onerror = () => { img.onerror = null; img.src = IMG_VACIA; };
  img.src = rutaImagen($('fImagen').value);
}

async function guardar(e) {
  e.preventDefault();
  const f = $('formProducto');
  $('formError').classList.add('d-none');
  validarStock();
  if (!f.checkValidity()) { f.classList.add('was-validated'); return; }

  const datos = {
    nombre: $('fNombre').value.trim(),
    marca: $('fMarca').value.trim(),
    categoria: $('fCategoria').value.trim(),
    precio: Number($('fPrecio').value),
    stock: Number($('fStock').value),
    fechaVencimiento: $('fNoVence').checked ? null : ($('fVencimiento').value || null),
    imagenUrl: $('fImagen').value.trim(),
    descripcion: $('fDescripcion').value.trim()
  };

  ocupado(true);
  try {
    const guardado = editando
      ? await api('/productos/codigo/' + encodeURIComponent(editando), { method: 'PUT', headers: cabecerasAdmin(), body: JSON.stringify(datos) })
      : await api('/productos', { method: 'POST', headers: cabecerasAdmin(), body: JSON.stringify(datos) });
    modalProducto.hide();
    aviso(editando ? `Producto ${guardado.codigo} actualizado.` : `Producto ${guardado.codigo} registrado.`);
    todos = await cargarCatalogoAdmin();
    pintarResumen();
    await refrescarVista();
  } catch (err) {
    $('formError').textContent = err.message;
    $('formError').classList.remove('d-none');
  } finally {
    ocupado(false);
  }
}

function ocupado(si) {
  $('btnGuardar').disabled = si;
  $('guardarSpinner').classList.toggle('d-none', !si);
}

/* ---------- Eliminar ---------- */
function pedirEliminar(p) {
  porEliminar = p;
  $('eliminarNombre').textContent = p.nombre;
  $('eliminarCodigo').textContent = p.codigo;
  $('eliminarError').classList.add('d-none');
  modalEliminar.show();
}

async function eliminar() {
  if (!porEliminar) return;
  const btn = $('btnConfirmarEliminar');
  btn.disabled = true;
  try {
    const r = await api('/productos/codigo/' + encodeURIComponent(porEliminar.codigo), { method: 'DELETE', headers: cabecerasAdmin() });
    modalEliminar.hide();
    aviso(r.mensaje || 'Producto eliminado.');
    todos = await cargarCatalogoAdmin();
    pintarResumen();
    await refrescarVista();
  } catch (err) {
    $('eliminarError').textContent = err.message;
    $('eliminarError').classList.remove('d-none');
  } finally {
    btn.disabled = false;
  }
}

/* ---------- Dar de baja / Activar (sin borrar el producto) ---------- */
function pedirCambioEstado(p) {
  porCambiar = p;
  const darDeBaja = estaActivo(p);
  $('modalEstadoTitulo').textContent = darDeBaja ? '¿Dar de baja este producto?' : '¿Activar este producto?';
  $('estadoNombre').textContent = `${p.nombre} (${p.codigo})`;
  $('estadoTexto').textContent = darDeBaja
    ? 'Dejará de mostrarse en la tienda, pero no se borra: podrás activarlo cuando quieras.'
    : 'Volverá a mostrarse en la tienda para que los clientes puedan comprarlo.';
  $('estadoIco').className = 'admin-estado-ico ' + (darDeBaja ? 'baja' : 'activar');
  $('estadoIco').innerHTML = `<i class="bi ${darDeBaja ? 'bi-eye-slash' : 'bi-eye'}"></i>`;
  const btn = $('btnConfirmarEstado');
  btn.textContent = darDeBaja ? 'Sí, dar de baja' : 'Sí, activar';
  btn.className = 'btn rounded-pill px-4 ' + (darDeBaja ? 'btn-warning' : 'btn-success');
  $('estadoError').classList.add('d-none');
  modalEstado.show();
}

async function cambiarEstado() {
  if (!porCambiar) return;
  const nuevoEstado = !estaActivo(porCambiar);
  const btn = $('btnConfirmarEstado');
  btn.disabled = true;
  try {
    const p = await api('/productos/codigo/' + encodeURIComponent(porCambiar.codigo) + '/estado', {
      method: 'PATCH', headers: cabecerasAdmin(), body: JSON.stringify({ activo: nuevoEstado })
    });
    modalEstado.hide();
    aviso(nuevoEstado ? `Producto ${p.codigo} activado. Ya se muestra en la tienda.` : `Producto ${p.codigo} dado de baja. Ya no se muestra en la tienda.`);
    todos = await cargarCatalogoAdmin();
    pintarResumen();
    await refrescarVista();
  } catch (err) {
    $('estadoError').textContent = err.message;
    $('estadoError').classList.remove('d-none');
  } finally {
    btn.disabled = false;
  }
}
