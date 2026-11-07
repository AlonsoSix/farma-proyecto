/* =====================================================================
   Página "Mi carrito" (carrito.html) - compra con boleta y pago real.
   Usa lo que ya define main.js: carrito, productos, soles(), esc(), rutaImagen(),
   cambiarCantidad(), eliminarDelCarrito(), guardarCarrito(), actualizarCarritoUI(),
   leerSesion(), mostrarAviso() y API_URL.

   Flujo: 1) revisar el carrito  2) datos del cliente y pago  3) boleta
   - Efectivo: queda pendiente de pago contra entrega.
   - Tarjeta / Yape: Culqi Checkout v4 tokeniza en el navegador y el backend
     crea el cargo con la llave secreta (POST /api/ventas).
   - Si el backend no tiene llaves de Culqi, se usa el modo simulado.
   - La boleta se puede descargar como PDF con jsPDF o imprimir.
   ===================================================================== */

const IGV = 0.18;
const LIMITE_YAPE_DEFECTO = 2000;
const METODOS_PAGO = { EFECTIVO: 'Efectivo', TARJETA: 'Tarjeta', YAPE: 'Yape' };
const ck = (id) => document.getElementById(id);

let configPago = {
  pasarela: 'SIMULADO',
  modo: 'prueba',
  llavePublica: null,
  limiteYape: LIMITE_YAPE_DEFECTO,
  aviso: ''
};
let compraPendiente = null;   // datos de la venta mientras Culqi tokeniza
let enviandoCompra = false;
let ultimaVenta = null;       // boleta mostrada, para descargarla en PDF
let promesaCulqi = null;      // carga única del script de Culqi Checkout
let configPagoListo = null;   // promesa de la configuración de la pasarela

document.addEventListener('DOMContentLoaded', () => {
  // Si hay sesión iniciada, se completan nombre y correo
  const sesion = leerSesion();
  if (sesion) {
    const nombreCompleto = `${sesion.nombre || ''} ${sesion.apellido || ''}`.trim();
    if (nombreCompleto) ck('ckNombre').value = nombreCompleto;
    if (sesion.correo) ck('ckCorreo').value = sesion.correo;
  }

  // Solo números en el DNI
  ck('ckDni').addEventListener('input', (e) => { e.target.value = e.target.value.replace(/\D/g, '').slice(0, 8); });
  ck('formCompra').addEventListener('input', () => marcarPaso(2), { once: true });
  ck('formCompra').addEventListener('submit', confirmarCompra);
  ck('btnImprimir').addEventListener('click', () => window.print());
  ck('btnPdf').addEventListener('click', () => descargarPdf(ultimaVenta));

  // Al cambiar de método de pago se actualiza el detalle y se exige correo si hace falta
  ck('formCompra').querySelectorAll('input[name="metodoPago"]').forEach((radio) => {
    radio.addEventListener('change', actualizarPanelPago);
  });

  // Botones + / − / Eliminar de esta página
  ck('ckItems').addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-accion]');
    if (!btn) return;
    const id = Number(btn.dataset.id);
    if (btn.dataset.accion === 'eliminar') eliminarDelCarrito(id);
    else cambiarCantidad(id, btn.dataset.accion === 'mas' ? 1 : -1);
  });

  // Cuando el carrito cambia (aquí o en el panel lateral), main.js actualiza el contador: se vuelve a pintar
  new MutationObserver(pintarCarrito).observe(ck('cartCount'), { childList: true, characterData: true, subtree: true });

  actualizarPanelPago();
  configPagoListo = cargarConfigPago();

  // carrito.html?boleta=B001-00000001 -> muestra esa boleta (por ejemplo, después de recargar)
  const numero = new URLSearchParams(location.search).get('boleta');
  if (numero) cargarBoleta(numero);
  else {
    pintarCarrito();
    // carrito.html#pagar (botón "Comprar ahora"): baja directo al formulario de datos y pago
    if (location.hash === '#pagar') setTimeout(irAlFormularioDePago, 350);
  }
});

function irAlFormularioDePago() {
  if (!itemsCarrito().length) return;
  marcarPaso(2);
  ck('formCompra').scrollIntoView({ behavior: scrollBehavior(), block: 'start' });
  ck(ck('ckNombre').value ? 'ckDni' : 'ckNombre').focus({ preventScroll: true });
}

/* ---------- Paso 1: carrito ---------- */

function itemsCarrito() { return Object.values(carrito); }

function calcularTotales(items) {
  const sinDescuento = items.reduce((s, i) => s + i.cantidad * Number(i.precioNormal ?? i.precio), 0);
  const total = items.reduce((s, i) => s + i.cantidad * Number(i.precio), 0);
  const gravada = Math.round(total / (1 + IGV) * 100) / 100;
  return { sinDescuento, ahorro: sinDescuento - total, gravada, igv: total - gravada, total };
}

function pintarCarrito() {
  if (!ck('ckBoletaZona').classList.contains('d-none')) return;   // ya se muestra la boleta
  const items = itemsCarrito();
  ck('ckVacio').classList.toggle('d-none', items.length > 0);
  ck('ckContenido').classList.toggle('d-none', items.length === 0);
  ck('ckPasos').classList.toggle('d-none', items.length === 0);
  if (!items.length) return;

  const unidades = items.reduce((s, i) => s + i.cantidad, 0);
  ck('ckUnidades').textContent = `(${unidades} ${unidades === 1 ? 'producto' : 'productos'})`;

  ck('ckItems').innerHTML = items.map(i => {
    const p = productos.find(x => x.id === i.id);
    const sinStockExtra = p && i.cantidad >= Number(p.stock);
    const oferta = Number(i.descuento) >= 5;
    return `
      <div class="ck-item">
        <img src="${esc(rutaImagen(i.imagen))}" alt="" onerror="this.onerror=null;this.src='${IMG_VACIA}'">
        <div class="ck-item-info">
          <div class="ck-item-nombre">${esc(i.nombre)}</div>
          <div class="ck-item-precio">
            ${soles(i.precio)} c/u
            ${oferta ? `<del>${soles(i.precioNormal)}</del><span class="badge-oferta badge-oferta-sm">-${i.descuento}%</span>` : ''}
          </div>
          <div class="ck-item-qty">
            <button type="button" data-accion="menos" data-id="${i.id}" aria-label="Quitar uno" ${i.cantidad <= 1 ? 'disabled' : ''}><i class="bi bi-dash"></i></button>
            <span>${i.cantidad}</span>
            <button type="button" data-accion="mas" data-id="${i.id}" aria-label="Agregar uno" ${sinStockExtra ? 'disabled' : ''}><i class="bi bi-plus"></i></button>
          </div>
        </div>
        <div class="ck-item-lado">
          <strong>${soles(i.cantidad * i.precio)}</strong>
          <button type="button" class="ck-item-quitar" data-accion="eliminar" data-id="${i.id}"><i class="bi bi-trash3 me-1"></i>Quitar</button>
        </div>
      </div>`;
  }).join('');

  const t = calcularTotales(items);
  ck('ckSubtotal').textContent = soles(t.sinDescuento);
  ck('ckAhorro').textContent = '- ' + soles(t.ahorro);
  ck('ckFilaAhorro').classList.toggle('d-none', t.ahorro < 0.005);
  ck('ckGravada').textContent = soles(t.gravada);
  ck('ckIgv').textContent = soles(t.igv);
  ck('ckTotal').textContent = soles(t.total);
  actualizarPanelPago();
}

function marcarPaso(n) {
  document.querySelectorAll('#ckPasos li').forEach(li => {
    const paso = Number(li.dataset.paso);
    li.classList.toggle('activo', paso === n);
    li.classList.toggle('hecho', paso < n);
  });
}

/* ---------- Configuración de la pasarela ---------- */

async function cargarConfigPago() {
  try {
    const res = await fetch(`${API_URL}/pagos/config`);
    if (!res.ok) throw new Error('Respuesta inválida');
    const data = await res.json();
    configPago = {
      pasarela: data.pasarela === 'CULQI' ? 'CULQI' : 'SIMULADO',
      modo: data.modo || 'prueba',
      llavePublica: data.llavePublica || null,
      limiteYape: Number(data.limiteYape) || LIMITE_YAPE_DEFECTO,
      aviso: data.aviso || ''
    };
  } catch (e) {
    configPago = {
      pasarela: 'SIMULADO',
      modo: 'prueba',
      llavePublica: null,
      limiteYape: LIMITE_YAPE_DEFECTO,
      aviso: 'No se pudo consultar la pasarela. Si el backend tiene llaves de Culqi, el cobro podría rechazarse.'
    };
  }
  actualizarPanelPago();
}

function metodoSeleccionado() {
  return ck('formCompra').querySelector('input[name="metodoPago"]:checked')?.value || 'EFECTIVO';
}

function esPagoReal() {
  return configPago.pasarela === 'CULQI' && !!configPago.llavePublica;
}

function actualizarPanelPago() {
  if (!ck('pagoModo')) return;
  const metodo = metodoSeleccionado();
  const total = calcularTotales(itemsCarrito()).total;
  const limite = Number(configPago.limiteYape) || LIMITE_YAPE_DEFECTO;

  // El correo solo es obligatorio cuando Culqi lo necesita para el cargo
  ck('ckCorreo').required = metodo !== 'EFECTIVO';
  ck('ckCorreoAyuda').textContent = metodo === 'EFECTIVO' ? '(opcional)' : '(obligatorio para tarjeta/Yape)';

  const modo = ck('pagoModo');
  modo.classList.remove('pago-modo-real', 'pago-modo-prueba', 'pago-modo-error');
  if (esPagoReal()) {
    modo.classList.add('pago-modo-real');
    ck('pagoModoTexto').textContent = configPago.modo === 'sandbox'
      ? 'Culqi sandbox activo: se procesará un cobro de prueba real con tarjeta o Yape.'
      : 'Pago seguro procesado por Culqi.';
    modo.querySelector('i').className = 'bi bi-shield-check';
  } else {
    modo.classList.add('pago-modo-prueba');
    ck('pagoModoTexto').textContent = configPago.aviso || 'Modo de prueba: no se hará ningún cobro real. Configura las llaves de Culqi para cobrar de verdad.';
    modo.querySelector('i').className = 'bi bi-cone-striped';
  }

  let icono = 'bi-cash-stack';
  let titulo = 'Pago contra entrega';
  let texto = 'Paga en efectivo cuando recibas tu pedido. La boleta quedará con el pago pendiente.';
  let extra = '';

  if (metodo === 'TARJETA') {
    icono = 'bi-credit-card-2-front';
    titulo = esPagoReal() ? 'Tarjeta con Culqi Checkout' : 'Tarjeta en modo de prueba';
    texto = esPagoReal()
      ? 'Al confirmar se abrirá el checkout seguro de Culqi para ingresar los datos de tu tarjeta. No compartimos ni almacenamos el número de tarjeta.'
      : 'No se pedirán datos de tarjeta: la compra se aprobará en modo simulado para probar el flujo completo.';
    extra = esPagoReal() && configPago.modo === 'sandbox'
      ? '<span class="pago-test"><i class="bi bi-info-circle me-1"></i>Prueba: 4111 1111 1111 1111 · 09/30 · CVV 123</span>'
      : '';
  } else if (metodo === 'YAPE') {
    icono = 'bi-phone';
    titulo = esPagoReal() ? 'Yape con Culqi Checkout' : 'Yape en modo de prueba';
    texto = esPagoReal()
      ? 'Al confirmar se abrirá Culqi para ingresar tu celular y el código de aprobación de 6 dígitos de Yape.'
      : 'No se pedirá código real: la compra se aprobará en modo simulado para probar el flujo completo.';
    extra = esPagoReal() && configPago.modo === 'sandbox'
      ? '<span class="pago-test"><i class="bi bi-info-circle me-1"></i>Prueba: celular 900 000 001 y cualquier código de 6 dígitos.</span>'
      : '';
    if (total > limite) {
      texto = `Tu compra supera el límite de Yape (${soles(limite)}). Elige tarjeta o efectivo para continuar.`;
      extra = '';
    }
  }

  ck('ckPagoDetalle').innerHTML = `
    <i class="bi ${icono}"></i>
    <div>
      <strong>${titulo}</strong>
      <p>${texto}</p>
      ${extra}
    </div>`;
}

/* ---------- Paso 2: confirmar compra ---------- */

async function confirmarCompra(e) {
  e.preventDefault();
  if (enviandoCompra) return;

  if (configPagoListo) await configPagoListo;

  const form = ck('formCompra');
  ocultarError();
  marcarPaso(2);
  if (!form.checkValidity()) {
    form.classList.add('was-validated');
    form.querySelector(':invalid')?.focus();
    return;
  }

  const items = itemsCarrito();
  if (!items.length) return;

  const metodo = metodoSeleccionado();
  const total = calcularTotales(items).total;
  const limite = Number(configPago.limiteYape) || LIMITE_YAPE_DEFECTO;

  if (metodo === 'YAPE' && total > limite) {
    mostrarErrorPago(`Yape permite pagos de hasta ${soles(limite)}. Elige tarjeta o efectivo.`);
    return;
  }

  const datos = {
    clienteNombre: ck('ckNombre').value.trim(),
    clienteDni: ck('ckDni').value.trim(),
    clienteCorreo: ck('ckCorreo').value.trim(),
    metodoPago: metodo,
    idUsuario: leerSesion()?.id ?? null,
    items: items.map(i => ({ idProducto: i.id, cantidad: i.cantidad }))
  };

  if (metodo === 'EFECTIVO') {
    await enviarCompra(datos);
    return;
  }

  if (!esPagoReal()) {
    // Sin llaves de Culqi el backend aprueba en modo simulado; se envía un token marcado como prueba.
    datos.tokenPago = `sim_${Date.now()}`;
    await enviarCompra(datos);
    return;
  }

  abrirCulqi(datos, metodo, total);
}

/* ---------- Culqi Checkout v4 ---------- */

function cargarScriptCulqi() {
  if (window.Culqi) return Promise.resolve();
  if (promesaCulqi) return promesaCulqi;
  promesaCulqi = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://checkout.culqi.com/js/v4';
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      promesaCulqi = null;
      script.remove();
      reject(new Error('No se pudo cargar Culqi Checkout. Revisa tu conexión e intenta nuevamente.'));
    };
    document.head.appendChild(script);
  });
  return promesaCulqi;
}

async function abrirCulqi(datos, metodo, total) {
  try {
    await cargarScriptCulqi();
  } catch (err) {
    mostrarErrorPago(err.message);
    return;
  }

  compraPendiente = datos;
  const montoCentimos = Math.round(total * 100);

  try {
    // eslint-disable-next-line no-undef
    Culqi.publicKey = configPago.llavePublica;
    // eslint-disable-next-line no-undef
    Culqi.settings({
      title: 'Boticas Por tu Salud',
      currency: 'PEN',
      description: `Compra en Boticas Por tu Salud · ${METODOS_PAGO[metodo]}`,
      amount: montoCentimos
    });
    // eslint-disable-next-line no-undef
    Culqi.options({
      lang: 'es',
      installments: false,
      paymentMethods: {
        tarjeta: metodo === 'TARJETA',
        yape: metodo === 'YAPE',
        bancaMovil: false,
        agente: false,
        billetera: false,
        cuotealo: false
      },
      style: {
        bannerColor: '#0b72b3',
        buttonBackground: '#0b72b3',
        menuColor: '#0b72b3',
        linksColor: '#0b72b3',
        buttonText: 'Pagar',
        buttonTextColor: '#ffffff',
        priceColor: '#0b2a45'
      }
    });
    // eslint-disable-next-line no-undef
    Culqi.open();
  } catch (err) {
    compraPendiente = null;
    mostrarErrorPago('No se pudo abrir la pasarela de pago. Intenta nuevamente.');
  }
}

// Culqi Checkout v4 llama a esta función global cuando termina el usuario.
window.culqi = function () {
  const api = window.Culqi;
  if (api && api.token && api.token.id) {
    const token = api.token.id;
    try { api.close(); } catch (e) { /* la ventana ya se cerró */ }
    if (!compraPendiente) return;
    const datos = { ...compraPendiente, tokenPago: token };
    compraPendiente = null;
    enviarCompra(datos);
    return;
  }

  const error = api && api.error;
  const mensaje = error?.user_message || error?.merchant_message
    || 'No se pudo completar el pago con Culqi. Intenta nuevamente.';
  compraPendiente = null;
  mostrarErrorPago(mensaje);
};

/* ---------- Envío al backend ---------- */

async function enviarCompra(datos) {
  if (enviandoCompra) return;
  enviandoCompra = true;

  const boton = ck('btnConfirmar');
  const textoOriginal = boton.innerHTML;
  boton.disabled = true;
  boton.innerHTML = `<span class="spinner-border spinner-border-sm me-2"></span>${datos.metodoPago === 'EFECTIVO' ? 'Generando boleta...' : 'Confirmando pago...'}`;

  try {
    const res = await fetch(`${API_URL}/ventas`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(datos)
    });
    const venta = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(venta.error || 'No se pudo registrar la compra.');

    // Compra lista: se vacía el carrito y se borra la copia del catálogo (el stock cambió)
    carrito = {};
    guardarCarrito();
    try { sessionStorage.removeItem('farma_productos'); } catch (err) { /* sin almacenamiento */ }
    mostrarBoleta(venta);
    actualizarCarritoUI();
    history.replaceState(null, '', `carrito.html?boleta=${encodeURIComponent(venta.numero)}`);
  } catch (err) {
    mostrarErrorPago(err.message === 'Failed to fetch' ? MENSAJE_SIN_SERVIDOR : err.message);
  } finally {
    enviandoCompra = false;
    boton.disabled = false;
    boton.innerHTML = textoOriginal;
  }
}

function mostrarErrorPago(mensaje) {
  const error = ck('ckError');
  error.textContent = mensaje;
  error.classList.remove('d-none');
  error.scrollIntoView({ behavior: scrollBehavior(), block: 'center' });
}
function ocultarError() {
  ck('ckError').classList.add('d-none');
  ck('ckError').textContent = '';
}

/* ---------- Paso 3: boleta ---------- */

async function cargarBoleta(numero) {
  try {
    const res = await fetch(`${API_URL}/ventas/${encodeURIComponent(numero)}`);
    const venta = await res.json();
    if (!res.ok) throw new Error(venta.error);
    mostrarBoleta(venta);
  } catch (err) {
    mostrarAviso('No se pudo cargar la boleta ' + numero + '.');
    pintarCarrito();
  }
}

function formatoFechaHora(texto) {
  const f = new Date(texto);
  if (isNaN(f)) return esc(texto);
  const dos = (n) => String(n).padStart(2, '0');
  return `${dos(f.getDate())}/${dos(f.getMonth() + 1)}/${f.getFullYear()} ${dos(f.getHours())}:${dos(f.getMinutes())}`;
}

function etiquetaEstadoPago(v) {
  const estado = String(v.pagoEstado || '').toUpperCase();
  const pasarela = String(v.pagoPasarela || '').toUpperCase();
  if (estado === 'APROBADO' && pasarela === 'CULQI') return 'Pagado con Culqi';
  if (estado === 'APROBADO' && pasarela === 'SIMULADO') return 'Pago simulado (prueba)';
  if (estado === 'APROBADO') return 'Pagado';
  if (estado === 'PENDIENTE') return 'Pago contra entrega';
  return estado || 'Sin estado';
}

function detalleMetodoPago(v) {
  const base = METODOS_PAGO[v.metodoPago] || v.metodoPago || '';
  const marca = v.tarjetaMarca ? String(v.tarjetaMarca) : '';
  const ultimos = v.tarjetaUltimos4 ? String(v.tarjetaUltimos4) : '';
  if (marca && ultimos) return `${base} · ${marca} •••• ${ultimos}`;
  if (ultimos) return `${base} · •••• ${ultimos}`;
  return base;
}

function mostrarBoleta(v) {
  ultimaVenta = v;
  ck('ckCompra').classList.add('d-none');
  ck('ckBoletaZona').classList.remove('d-none');
  ck('ckPasos').classList.remove('d-none');
  marcarPaso(3);
  document.title = `Boleta ${v.numero} | Boticas Por tu Salud`;

  const filas = (v.detalles || []).map(d => `
    <tr>
      <td class="text-center">${d.cantidad}</td>
      <td>
        ${esc(d.nombre)}<br><small class="text-muted">${esc(d.codigo)}${d.descuento >= 5 ? ` · Oferta -${d.descuento}% (antes ${soles(d.precioUnitario)})` : ''}</small>
      </td>
      <td class="text-end">${soles(d.precioFinal)}</td>
      <td class="text-end">${soles(d.importe)}</td>
    </tr>`).join('');

  const aprobado = String(v.pagoEstado || '').toUpperCase() === 'APROBADO';
  const estadoClase = aprobado ? 'boleta-estado-ok' : 'boleta-estado-pendiente';
  const estadoIcono = aprobado ? 'check-circle-fill' : 'clock-fill';

  ck('boleta').innerHTML = `
    <header class="boleta-cabecera">
      <div class="boleta-empresa">
        <img src="img/logo-farma3.png" alt="Boticas Por tu Salud">
        <p class="mb-0">Boticas Por tu Salud<br>Lima, Perú · contacto@portusalud.com<br>+51 987 654 321</p>
      </div>
      <div class="boleta-recuadro">
        <span>RUC 20XXXXXXXXX</span>
        <strong>BOLETA DE VENTA ELECTRÓNICA</strong>
        <span class="boleta-numero">${esc(v.numero)}</span>
      </div>
    </header>

    <section class="boleta-cliente">
      <div><span>Cliente</span><strong>${esc(v.clienteNombre)}</strong></div>
      <div><span>DNI</span><strong>${esc(v.clienteDni)}</strong></div>
      <div><span>Fecha de emisión</span><strong>${formatoFechaHora(v.fecha)}</strong></div>
      <div><span>Método de pago</span><strong>${esc(detalleMetodoPago(v))}</strong></div>
      ${v.clienteCorreo ? `<div><span>Correo</span><strong>${esc(v.clienteCorreo)}</strong></div>` : ''}
    </section>

    <table class="boleta-tabla">
      <thead><tr><th class="text-center">Cant.</th><th>Descripción</th><th class="text-end">P. unit.</th><th class="text-end">Importe</th></tr></thead>
      <tbody>${filas}</tbody>
    </table>

    <dl class="boleta-totales">
      <div><dt>Subtotal (precio normal)</dt><dd>${soles(v.subtotalSinDescuento)}</dd></div>
      ${Number(v.descuentoTotal) > 0 ? `<div class="boleta-ahorro"><dt>Descuento por ofertas</dt><dd>- ${soles(v.descuentoTotal)}</dd></div>` : ''}
      <div><dt>Op. gravada</dt><dd>${soles(v.opGravada)}</dd></div>
      <div><dt>IGV (18%)</dt><dd>${soles(v.igv)}</dd></div>
      <div class="boleta-total"><dt>IMPORTE TOTAL</dt><dd>${soles(v.total)}</dd></div>
    </dl>

    <div class="boleta-pago-linea">
      <span>Estado del pago</span>
      <div class="boleta-pago">
        <span class="boleta-estado ${estadoClase}"><i class="bi bi-${estadoIcono}"></i>${esc(etiquetaEstadoPago(v))}</span>
        ${v.pagoReferencia ? `<span class="boleta-referencia">Ref. <code>${esc(v.pagoReferencia)}</code></span>` : ''}
        ${v.tarjetaMarca || v.tarjetaUltimos4 ? `<span class="boleta-tarjeta">${esc(v.tarjetaMarca || 'Tarjeta')} •••• ${esc(v.tarjetaUltimos4 || '')}</span>` : ''}
      </div>
    </div>

    <footer class="boleta-pie">
      <p class="mb-1">¡Gracias por tu compra! Conserva esta boleta para cualquier cambio o reclamo.</p>
      <p class="mb-0 small">Representación impresa de la boleta de venta electrónica · Proyecto académico UTP, sin valor tributario.</p>
    </footer>`;
  window.scrollTo({ top: 0, behavior: scrollBehavior() });
}

/* ---------- PDF de la boleta (jsPDF) ---------- */

function descargarPdf(v) {
  if (!v) {
    mostrarAviso('Primero completa una compra para descargar la boleta.');
    return;
  }
  const JsPDF = window.jspdf?.jsPDF;
  if (!JsPDF) {
    mostrarAviso('No se pudo cargar el generador de PDF. Revisa tu conexión e intenta nuevamente.');
    return;
  }

  const doc = new JsPDF({ unit: 'mm', format: 'a4' });
  const M = 14;
  const ANCHO = 210;
  const UTIL = ANCHO - M * 2;
  const AZUL = [11, 114, 179];
  const OSCURO = [11, 42, 69];
  const GRIS = [95, 112, 133];
  const CLARO = [235, 244, 251];

  const dinero = (n) => `S/ ${Number(n || 0).toFixed(2)}`;

  // Cabecera
  doc.setFillColor(...AZUL);
  doc.rect(0, 0, ANCHO, 34, 'F');
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(M, 8, 16, 16, 3, 3, 'F');
  doc.setFillColor(...AZUL);
  doc.roundedRect(M + 6.4, 10.5, 3.2, 11, .8, .8, 'F');
  doc.roundedRect(M + 3.3, 13.6, 9.4, 3.2, .8, .8, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('Boticas Por tu Salud', M + 21, 14);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text('RUC 20XXXXXXXXX · Lima, Perú', M + 21, 19);
  doc.text('contacto@portusalud.com · +51 987 654 321', M + 21, 23.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('BOLETA DE VENTA ELECTRÓNICA', ANCHO - M, 13, { align: 'right' });
  doc.setFontSize(12);
  doc.text(String(v.numero || ''), ANCHO - M, 19.5, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(`Emitida: ${formatoFechaHora(v.fecha)}`, ANCHO - M, 24.5, { align: 'right' });

  // Datos del cliente
  let y = 42;
  doc.setDrawColor(207, 227, 245);
  doc.setFillColor(248, 251, 254);
  doc.roundedRect(M, y, UTIL, 25, 2.5, 2.5, 'FD');
  doc.setTextColor(...GRIS);
  doc.setFontSize(7.5);
  doc.text('CLIENTE', M + 4, y + 5);
  doc.text('DNI', M + 98, y + 5);
  doc.text('MÉTODO DE PAGO', M + 132, y + 5);
  doc.text('CORREO', M + 4, y + 14);
  doc.text('ESTADO DEL PAGO', M + 98, y + 14);
  doc.setTextColor(...OSCURO);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text(String(v.clienteNombre || ''), M + 4, y + 9.5);
  doc.text(String(v.clienteDni || ''), M + 98, y + 9.5);
  doc.text(detalleMetodoPago(v), M + 132, y + 9.5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.3);
  doc.text(String(v.clienteCorreo || '—'), M + 4, y + 18.5);
  doc.setFont('helvetica', 'bold');
  doc.text(etiquetaEstadoPago(v), M + 98, y + 18.5);

  // Tabla de productos
  y = 75;
  const cols = { cant: M + 2, desc: M + 14, unit: M + 120, imp: M + UTIL - 2 };
  doc.setFillColor(...AZUL);
  doc.rect(M, y, UTIL, 8, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('CANT.', cols.cant, y + 5.2);
  doc.text('DESCRIPCIÓN', cols.desc, y + 5.2);
  doc.text('P. UNIT.', cols.unit, y + 5.2, { align: 'right' });
  doc.text('IMPORTE', cols.imp, y + 5.2, { align: 'right' });

  y += 8;
  doc.setTextColor(...OSCURO);
  doc.setFont('helvetica', 'normal');

  const nuevaPagina = () => {
    doc.addPage();
    y = 18;
    doc.setFillColor(...AZUL);
    doc.rect(M, y, UTIL, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text('CANT.', cols.cant, y + 5.2);
    doc.text('DESCRIPCIÓN', cols.desc, y + 5.2);
    doc.text('P. UNIT.', cols.unit, y + 5.2, { align: 'right' });
    doc.text('IMPORTE', cols.imp, y + 5.2, { align: 'right' });
    y += 8;
    doc.setTextColor(...OSCURO);
    doc.setFont('helvetica', 'normal');
  };

  (v.detalles || []).forEach((d) => {
    const nombre = doc.splitTextToSize(String(d.nombre || ''), 100);
    const detalle = `${d.codigo || ''}${Number(d.descuento) >= 5 ? ` · Oferta -${d.descuento}%` : ''}`;
    const alto = Math.max(9, nombre.length * 4.4 + 4);
    if (y + alto > 265) nuevaPagina();

    doc.setFontSize(8.3);
    doc.text(String(d.cantidad || ''), cols.cant + 1, y + 5);
    doc.text(nombre, cols.desc, y + 5);
    doc.setFontSize(7);
    doc.setTextColor(...GRIS);
    doc.text(detalle, cols.desc, y + 5 + nombre.length * 4.2);
    doc.setFontSize(8.3);
    doc.setTextColor(...OSCURO);
    doc.text(dinero(d.precioFinal), cols.unit, y + 5, { align: 'right' });
    doc.text(dinero(d.importe), cols.imp, y + 5, { align: 'right' });
    y += alto;
    doc.setDrawColor(235, 241, 247);
    doc.line(M, y, M + UTIL, y);
  });

  // Totales
  if (y + 42 > 275) nuevaPagina();
  y += 4;
  const filaTotal = (etiqueta, valor, resaltado = false) => {
    doc.setFont('helvetica', resaltado ? 'bold' : 'normal');
    doc.setFontSize(resaltado ? 10 : 8.5);
    doc.setTextColor(...(resaltado ? OSCURO : GRIS));
    doc.text(etiqueta, M + 112, y, { align: 'right' });
    doc.text(valor, M + UTIL, y, { align: 'right' });
    y += resaltado ? 7 : 5;
  };
  filaTotal('Subtotal (precio normal)', dinero(v.subtotalSinDescuento));
  if (Number(v.descuentoTotal) > 0) filaTotal('Descuento por ofertas', `- ${dinero(v.descuentoTotal)}`);
  filaTotal('Op. gravada', dinero(v.opGravada));
  filaTotal('IGV (18%)', dinero(v.igv));
  doc.setDrawColor(207, 227, 245);
  doc.line(M + 105, y - 1, M + UTIL, y - 1);
  y += 1;
  filaTotal('IMPORTE TOTAL', dinero(v.total), true);

  // Datos del pago
  y += 2;
  const referencia = v.pagoReferencia ? ` · Ref. ${v.pagoReferencia}` : '';
  doc.setFillColor(...CLARO);
  doc.roundedRect(M, y, UTIL, 13, 2, 2, 'F');
  doc.setTextColor(...OSCURO);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text(`Pago: ${etiquetaEstadoPago(v)}${referencia}`, M + 4, y + 5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.3);
  doc.setTextColor(...GRIS);
  const tarjeta = v.tarjetaMarca || v.tarjetaUltimos4
    ? `Tarjeta ${v.tarjetaMarca || ''} •••• ${v.tarjetaUltimos4 || ''}. `
    : '';
  doc.text(`${tarjeta}Comprobante generado el ${formatoFechaHora(new Date().toISOString())}.`, M + 4, y + 9.5);

  // Pie
  doc.setDrawColor(207, 227, 245);
  doc.line(M, 282, M + UTIL, 282);
  doc.setFontSize(7);
  doc.setTextColor(...GRIS);
  doc.text('¡Gracias por tu compra! Conserva esta boleta para cualquier cambio o reclamo.', ANCHO / 2, 287, { align: 'center' });
  doc.text('Representación impresa de la boleta de venta electrónica · Proyecto académico UTP, sin valor tributario.', ANCHO / 2, 291, { align: 'center' });

  doc.save(`Boleta-${String(v.numero || 'compra').replace(/[^A-Za-z0-9-]/g, '')}.pdf`);
}

function scrollBehavior() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
}
