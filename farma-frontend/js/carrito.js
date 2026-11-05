/* =====================================================================
   Página "Mi carrito" (carrito.html) - Avance Final: carrito con boleta.
   Usa lo que ya define main.js: carrito, productos, soles(), esc(), rutaImagen(),
   cambiarCantidad(), eliminarDelCarrito(), guardarCarrito(), actualizarCarritoUI(),
   leerSesion(), mostrarAviso() y API_URL.

   Flujo: 1) revisar el carrito  2) datos del cliente y pago  3) boleta
   El backend (POST /api/ventas) vuelve a calcular los precios, descuenta el stock
   y devuelve la boleta con su número (B001-00000001).
   ===================================================================== */

const IGV = 0.18;
const METODOS_PAGO = { EFECTIVO: 'Efectivo', TARJETA: 'Tarjeta (POS)', YAPE: 'Yape' };
const ck = (id) => document.getElementById(id);

document.addEventListener('DOMContentLoaded', () => {
  // Si hay sesión iniciada, se completa el nombre
  const sesion = leerSesion();
  if (sesion?.nombre) ck('ckNombre').value = sesion.nombre;

  // Solo números en el DNI
  ck('ckDni').addEventListener('input', (e) => { e.target.value = e.target.value.replace(/\D/g, '').slice(0, 8); });
  ck('formCompra').addEventListener('input', () => marcarPaso(2), { once: true });
  ck('formCompra').addEventListener('submit', confirmarCompra);
  ck('btnImprimir').addEventListener('click', () => window.print());

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
  ck('formCompra').scrollIntoView({ behavior: 'smooth', block: 'start' });
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
}

function marcarPaso(n) {
  document.querySelectorAll('#ckPasos li').forEach(li => {
    const paso = Number(li.dataset.paso);
    li.classList.toggle('activo', paso === n);
    li.classList.toggle('hecho', paso < n);
  });
}

/* ---------- Paso 2: confirmar compra ---------- */

async function confirmarCompra(e) {
  e.preventDefault();
  const form = ck('formCompra');
  const error = ck('ckError');
  error.classList.add('d-none');
  marcarPaso(2);
  if (!form.checkValidity()) {
    form.classList.add('was-validated');
    form.querySelector(':invalid')?.focus();
    return;
  }
  const items = itemsCarrito();
  if (!items.length) return;

  const datos = {
    clienteNombre: ck('ckNombre').value.trim(),
    clienteDni: ck('ckDni').value.trim(),
    clienteCorreo: ck('ckCorreo').value.trim(),
    metodoPago: form.querySelector('input[name="metodoPago"]:checked').value,
    idUsuario: leerSesion()?.id ?? null,
    items: items.map(i => ({ idProducto: i.id, cantidad: i.cantidad }))
  };

  const boton = ck('btnConfirmar');
  boton.disabled = true;
  boton.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Generando boleta...';
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
    error.textContent = err.message === 'Failed to fetch' ? MENSAJE_SIN_SERVIDOR : err.message;
    error.classList.remove('d-none');
  } finally {
    boton.disabled = false;
    boton.innerHTML = '<i class="bi bi-receipt me-2"></i>Confirmar compra y generar boleta';
  }
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

function mostrarBoleta(v) {
  ck('ckCompra').classList.add('d-none');
  ck('ckBoletaZona').classList.remove('d-none');
  ck('ckPasos').classList.remove('d-none');
  marcarPaso(3);
  document.title = `Boleta ${v.numero} | PorTuSalud`;

  const filas = (v.detalles || []).map(d => `
    <tr>
      <td class="text-center">${d.cantidad}</td>
      <td>
        ${esc(d.nombre)}<br><small class="text-muted">${esc(d.codigo)}${d.descuento >= 5 ? ` · Oferta -${d.descuento}% (antes ${soles(d.precioUnitario)})` : ''}</small>
      </td>
      <td class="text-end">${soles(d.precioFinal)}</td>
      <td class="text-end">${soles(d.importe)}</td>
    </tr>`).join('');

  ck('boleta').innerHTML = `
    <header class="boleta-cabecera">
      <div class="boleta-empresa">
        <img src="img/logo-farma3.png" alt="PorTuSalud">
        <p class="mb-0">Botica PorTuSalud<br>Lima, Perú · contacto@portusalud.com<br>+51 987 654 321</p>
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
      <div><span>Método de pago</span><strong>${esc(METODOS_PAGO[v.metodoPago] || v.metodoPago)}</strong></div>
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

    <footer class="boleta-pie">
      <p class="mb-1">¡Gracias por tu compra! Conserva esta boleta para cualquier cambio o reclamo.</p>
      <p class="mb-0 small">Representación impresa de la boleta de venta electrónica · Proyecto académico UTP, sin valor tributario.</p>
    </footer>`;
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
