/* =====================================================================
   Mis pedidos: historial de compras del usuario que inició sesión.
   Datos: GET /api/ventas/usuario/{idUsuario}
   ===================================================================== */

const API_PEDIDOS = (window.Farma && Farma.config) ? Farma.config.API_URL : 'http://localhost:8081/api';
const $ = (id) => document.getElementById(id);

const escPedidos = (window.Farma && typeof Farma.esc === 'function')
  ? Farma.esc
  : (t) => String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const solesPedidos = (window.Farma && typeof Farma.soles === 'function')
  ? Farma.soles
  : (n) => 'S/ ' + Number(n || 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const sesion = (() => {
  if (window.Farma && typeof Farma.leerSesion === 'function') return Farma.leerSesion();
  try { return JSON.parse(localStorage.getItem('farma_sesion')); } catch (e) { return null; }
})();

document.addEventListener('DOMContentLoaded', () => {
  if (!sesion || sesion.id == null) return;   // auth-guard.js ya redirige al login
  const nombre = [sesion.nombre, sesion.apellido].filter(Boolean).join(' ').trim()
    || sesion.correo || 'tu cuenta';
  $('pedidosUsuario').textContent = nombre;
  cargarPedidos();
});

async function cargarPedidos() {
  try {
    const res = await fetch(`${API_PEDIDOS}/ventas/usuario/${encodeURIComponent(sesion.id)}`, { cache: 'no-store' });
    const json = await res.json().catch(() => null);
    if (!res.ok) {
      throw new Error((json && json.error) || `No se pudieron cargar tus pedidos (${res.status}).`);
    }
    pintarPedidos(Array.isArray(json) ? json : []);
  } catch (err) {
    const mensaje = err.message === 'Failed to fetch'
      ? 'No se pudo conectar con el servidor. Verifica que el backend esté corriendo en el puerto 8081.'
      : err.message;
    $('pedidosError').textContent = mensaje;
    $('pedidosError').classList.remove('d-none');
    $('pedidosLista').innerHTML = `
      <div class="pedidos-vacio">
        <i class="bi bi-wifi-off"></i>
        <h2>No pudimos cargar tus pedidos</h2>
        <p>Revisa tu conexión e inténtalo de nuevo.</p>
        <button type="button" class="btn btn-primary rounded-pill px-4" id="btnReintentarPedidos">
          <i class="bi bi-arrow-clockwise me-1"></i>Reintentar
        </button>
      </div>`;
    $('btnReintentarPedidos').addEventListener('click', () => {
      $('pedidosError').classList.add('d-none');
      $('pedidosLista').innerHTML = '<div class="pedidos-cargando"><span class="spinner-border text-primary" role="status" aria-hidden="true"></span><p class="mb-0 mt-3 text-muted">Cargando tus pedidos...</p></div>';
      cargarPedidos();
    });
  }
}

function pintarPedidos(lista) {
  if (!lista.length) {
    $('pedidosResumen').classList.add('d-none');
    $('pedidosLista').innerHTML = `
      <div class="pedidos-vacio">
        <i class="bi bi-bag-x"></i>
        <h2>Aún no tienes pedidos</h2>
        <p>Cuando completes una compra, aparecerá aquí con su boleta y su detalle.</p>
        <a href="productos.html" class="btn btn-primary rounded-pill px-4">
          <i class="bi bi-bag-plus me-1"></i>Explorar productos
        </a>
      </div>`;
    return;
  }

  // Resumen de la cuenta
  const totalGastado = lista.reduce((s, v) => s + Number(v.total || 0), 0);
  $('pedidosTotal').textContent = lista.length;
  $('pedidosGastado').textContent = solesPedidos(totalGastado);
  $('pedidosUltimo').textContent = fechaCorta(lista[0].fecha);
  $('pedidosResumen').classList.remove('d-none');

  $('pedidosLista').innerHTML = lista.map(htmlPedido).join('');
}

function htmlPedido(v) {
  const detalles = Array.isArray(v.detalles) ? v.detalles : [];
  const numero = v.numero || `Pedido #${v.id ?? ''}`;
  const estado = String(v.pagoEstado || '').toUpperCase();
  const estadoClase = estado === 'APROBADO' ? 'pedido-estado-ok' : estado === 'PENDIENTE' ? 'pedido-estado-pendiente' : 'pedido-estado-neutro';
  const iconoPago = String(v.metodoPago || '').toUpperCase() === 'YAPE' ? 'bi-phone'
    : String(v.metodoPago || '').toUpperCase() === 'TARJETA' ? 'bi-credit-card'
    : 'bi-cash-coin';
  const referencia = v.pagoReferencia
    ? `<span class="pedido-referencia">Ref. <code>${escPedidos(v.pagoReferencia)}</code></span>`
    : '';

  return `
    <article class="pedido-card">
      <header class="pedido-cabecera">
        <div class="pedido-cabecera-datos">
          <span class="pedido-numero"><i class="bi bi-receipt me-1"></i>${escPedidos(numero)}</span>
          <span class="pedido-fecha"><i class="bi bi-calendar3 me-1"></i>${escPedidos(fechaHora(v.fecha))}</span>
        </div>
        <span class="pedido-estado ${estadoClase}">
          <i class="bi ${estado === 'APROBADO' ? 'bi-check-circle' : estado === 'PENDIENTE' ? 'bi-clock' : 'bi-info-circle'}"></i>
          ${escPedidos(etiquetaEstado(v))}
        </span>
      </header>

      <ul class="pedido-items">
        ${detalles.length ? detalles.map((d) => `
          <li>
            <span class="pedido-item-cant">${Number(d.cantidad || 0)}×</span>
            <span class="pedido-item-nombre">${escPedidos(d.nombre || 'Producto')}</span>
            <span class="pedido-item-importe">${solesPedidos(d.importe ?? (Number(d.precioFinal || 0) * Number(d.cantidad || 0)))}</span>
          </li>`).join('') : '<li class="pedido-item-vacio">Esta compra no tiene detalle de productos.</li>'}
      </ul>

      <footer class="pedido-pie">
        <div class="pedido-pago">
          <span><i class="bi ${iconoPago} me-1"></i>${escPedidos(etiquetaMetodo(v))}</span>
          ${referencia}
        </div>
        <div class="pedido-total">
          <span>Total</span>
          <strong>${solesPedidos(v.total)}</strong>
        </div>
        <a class="btn btn-outline-primary rounded-pill px-3 pedido-boleta"
           href="carrito.html?boleta=${encodeURIComponent(v.numero || '')}">
          <i class="bi bi-file-earmark-text me-1"></i>Ver boleta
        </a>
      </footer>
    </article>`;
}

/* ---------- Formato de datos ---------- */

function fechaHora(texto) {
  if (!texto) return 'Fecha no registrada';
  const f = new Date(texto);
  if (isNaN(f)) return String(texto);
  const dos = (n) => String(n).padStart(2, '0');
  return `${dos(f.getDate())}/${dos(f.getMonth() + 1)}/${f.getFullYear()} ${dos(f.getHours())}:${dos(f.getMinutes())}`;
}

function fechaCorta(texto) {
  if (!texto) return '—';
  const f = new Date(texto);
  if (isNaN(f)) return String(texto);
  const dos = (n) => String(n).padStart(2, '0');
  return `${dos(f.getDate())}/${dos(f.getMonth() + 1)}/${f.getFullYear()}`;
}

function etiquetaEstado(v) {
  const estado = String(v.pagoEstado || '').toUpperCase();
  const pasarela = String(v.pagoPasarela || '').toUpperCase();
  if (estado === 'APROBADO') return pasarela === 'SIMULADO' ? 'Pago simulado (prueba)' : 'Pagado';
  if (estado === 'PENDIENTE') return 'Pago contra entrega';
  return estado || 'Registrado';
}

function etiquetaMetodo(v) {
  const metodo = String(v.metodoPago || '').toUpperCase();
  if (metodo === 'TARJETA') {
    const marca = v.tarjetaMarca || 'Tarjeta';
    const ultimos = v.tarjetaUltimos4 ? ` •••• ${v.tarjetaUltimos4}` : '';
    return `${marca}${ultimos}`;
  }
  if (metodo === 'YAPE') return 'Yape';
  if (metodo === 'EFECTIVO') return 'Efectivo contra entrega';
  return metodo || 'Pago';
}
