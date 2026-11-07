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
let pasoActual = 1;
let pagoTab = 'datos';        // en móvil: "datos" o "pago"
let metaTarjetaSimulada = null; // marca/últimos 4 solo para la boleta de prueba

document.addEventListener('DOMContentLoaded', inicializarCheckout);

function inicializarCheckout() {
  // Si hay sesión iniciada, se completan nombre y correo
  const sesion = leerSesion();
  if (sesion) {
    const nombreCompleto = `${sesion.nombre || ''} ${sesion.apellido || ''}`.trim();
    if (nombreCompleto) ck('ckNombre').value = nombreCompleto;
    if (sesion.correo) ck('ckCorreo').value = sesion.correo;
  }

  // Solo números en el DNI
  ck('ckDni').addEventListener('input', (e) => {
    e.target.value = e.target.value.replace(/\D/g, '').slice(0, 8);
    limpiarErrorCampo('ckDni');
  });

  // Formateo en vivo de los campos de pago
  ck('ckNumTarjeta').addEventListener('input', (e) => {
    e.target.value = agruparNumeroTarjeta(e.target.value);
    limpiarErrorCampo('ckNumTarjeta');
    actualizarVistaTarjeta();
  });
  ck('ckTitular').addEventListener('input', () => {
    limpiarErrorCampo('ckTitular');
    actualizarVistaTarjeta();
  });
  ck('ckVence').addEventListener('input', (e) => {
    e.target.value = formatearVencimiento(e.target.value);
    limpiarErrorCampo('ckVence');
    actualizarVistaTarjeta();
  });
  ck('ckCvv').addEventListener('input', (e) => {
    e.target.value = e.target.value.replace(/\D/g, '').slice(0, 4);
    limpiarErrorCampo('ckCvv');
  });
  ck('ckYapeCelular').addEventListener('input', (e) => {
    e.target.value = formatearCelular(e.target.value);
    limpiarErrorCampo('ckYapeCelular');
  });
  ck('ckYapeCodigo').addEventListener('input', (e) => {
    e.target.value = e.target.value.replace(/\D/g, '').slice(0, 6);
    limpiarErrorCampo('ckYapeCodigo');
  });
  ['ckNombre', 'ckCorreo'].forEach((id) => {
    ck(id).addEventListener('input', () => limpiarErrorCampo(id));
  });

  ck('btnVerCvv').addEventListener('click', alternarCvv);
  ck('ckDatosPrueba').addEventListener('click', rellenarTarjetaPrueba);
  ck('ckYapePrueba').addEventListener('click', rellenarYapePrueba);
  ck('btnVolverPaso1').addEventListener('click', () => irAPaso(1));
  ck('btnContinuar').addEventListener('click', () => irAPaso(2));
  ck('ckPagoTabs').querySelectorAll('button[data-tab]').forEach((boton) => {
    boton.addEventListener('click', () => cambiarPestanaPago(boton.dataset.tab));
  });
  window.addEventListener('resize', aplicarPestanaPago);
  ck('formCompra').addEventListener('submit', confirmarCompra);
  ck('btnImprimir').addEventListener('click', () => window.print());
  ck('btnPdf').addEventListener('click', () => descargarPdf(ultimaVenta));

  ck('formCompra').querySelectorAll('input[name="metodoPago"]').forEach((radio) => {
    radio.addEventListener('change', () => {
      limpiarErroresCampos();
      ocultarError();
      actualizarPanelPago();
    });
  });

  // Botones + / − / Eliminar de esta página
  ck('ckItems').addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-accion]');
    if (!btn) return;
    const id = Number(btn.dataset.id);
    if (btn.dataset.accion === 'eliminar') eliminarDelCarrito(id);
    else cambiarCantidad(id, btn.dataset.accion === 'mas' ? 1 : -1);
  });

  // Cuando el carrito cambia, main.js actualiza el contador y aquí se vuelve a pintar
  new MutationObserver(pintarCarrito).observe(ck('cartCount'), { childList: true, characterData: true, subtree: true });

  actualizarVistaTarjeta();
  actualizarPanelPago();
  aplicarPestanaPago();
  configPagoListo = cargarConfigPago();

  // carrito.html?boleta=B001-00000001 -> muestra esa boleta (por ejemplo, después de recargar)
  const numero = new URLSearchParams(location.search).get('boleta');
  if (numero) cargarBoleta(numero);
  else {
    pintarCarrito();
    // carrito.html#pagar (botón "Comprar ahora"): entra directo al paso de pago
    if (location.hash === '#pagar') setTimeout(irAlFormularioDePago, 300);
  }
}

function irAlFormularioDePago() {
  if (!itemsCarrito().length) return;
  irAPaso(2);
  setTimeout(() => ck(ck('ckNombre').value ? 'ckDni' : 'ckNombre').focus({ preventScroll: true }), 280);
}

function irAPaso(n) {
  if (n === 2 && !itemsCarrito().length) return;
  pasoActual = n;
  ck('ckGrid').dataset.paso = String(n);
  document.querySelectorAll('.ck-view').forEach((vista) => {
    const activa = Number(vista.dataset.paso) === n;
    vista.classList.toggle('activa', activa);
    vista.setAttribute('aria-hidden', String(!activa));
  });
  marcarPaso(n);
  ck('ckAccion1').classList.toggle('d-none', n !== 1);
  ck('ckAccion2').classList.toggle('d-none', n !== 2);

  if (n === 1) ocultarError();
  if (n === 2) {
    actualizarPanelPago();
    aplicarPestanaPago();
    ck('ckPagoScroll').scrollTop = 0;
  }
  if (n === 3) {
    ck('ckPagoScroll').scrollTop = 0;
  }
}

function esCheckoutMovil() {
  return window.matchMedia('(max-width: 991.98px)').matches;
}

function cambiarPestanaPago(tab) {
  pagoTab = tab === 'pago' ? 'pago' : 'datos';
  aplicarPestanaPago();
  ck('ckPagoScroll').scrollTop = 0;
  actualizarBotonConfirmar();
}

function aplicarPestanaPago() {
  const movil = esCheckoutMovil();
  ck('ckPagoTabs').querySelectorAll('button[data-tab]').forEach((boton) => {
    const activo = boton.dataset.tab === pagoTab;
    boton.classList.toggle('activo', activo);
    boton.setAttribute('aria-selected', String(activo));
  });
  ck('ckBloqueDatos').classList.toggle('ck-tab-oculto', movil && pagoTab !== 'datos');
  ck('ckBloquePago').classList.toggle('ck-tab-oculto', movil && pagoTab !== 'pago');
  actualizarBotonConfirmar();
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
  if (pasoActual === 3) return;   // ya se muestra la boleta
  const items = itemsCarrito();
  const hayItems = items.length > 0;

  ck('ckVacio').classList.toggle('d-none', hayItems);
  ck('ckItems').classList.toggle('d-none', !hayItems);
  ck('ckGrid').classList.toggle('ck-sin-items', !hayItems);
  if (!hayItems && pasoActual === 2) irAPaso(1);

  const unidades = items.reduce((s, i) => s + i.cantidad, 0);
  ck('ckUnidades').textContent = `${unidades} ${unidades === 1 ? 'producto' : 'productos'}`;

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
            ${oferta ? `<del>${soles(i.precioNormal)}</del><span class="ck-badge-desc">-${i.descuento}%</span>` : ''}
          </div>
          <div class="ck-item-qty">
            <button type="button" data-accion="menos" data-id="${i.id}" aria-label="Quitar uno" ${i.cantidad <= 1 ? 'disabled' : ''}><i class="bi bi-dash-lg"></i></button>
            <span>${i.cantidad}</span>
            <button type="button" data-accion="mas" data-id="${i.id}" aria-label="Agregar uno" ${sinStockExtra ? 'disabled' : ''}><i class="bi bi-plus-lg"></i></button>
          </div>
        </div>
        <div class="ck-item-lado">
          <strong>${soles(i.cantidad * i.precio)}</strong>
          <button type="button" class="ck-item-quitar" data-accion="eliminar" data-id="${i.id}" aria-label="Quitar ${esc(i.nombre)}"><i class="bi bi-trash3"></i></button>
        </div>
      </div>`;
  }).join('');

  const t = calcularTotales(items);
  ck('ckSubtotal').textContent = soles(t.sinDescuento);
  ck('ckAhorro').textContent = '- ' + soles(t.ahorro);
  ck('ckFilaAhorro').classList.toggle('d-none', t.ahorro < 0.005);
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
  const real = esPagoReal();

  document.body.classList.toggle('ck-modo-real', real);
  document.querySelectorAll('.ck-panel').forEach((panel) => {
    panel.classList.toggle('activo', panel.dataset.metodo === metodo);
  });

  // El correo es obligatorio para tarjeta/Yape porque Culqi lo usa en el cargo
  ck('ckCorreo').required = metodo !== 'EFECTIVO';
  ck('ckCorreoAyuda').textContent = metodo === 'EFECTIVO' ? '(opcional)' : '(obligatorio)';

  const modo = ck('pagoModo');
  modo.classList.remove('ck-gateway-real', 'ck-gateway-prueba');
  modo.title = configPago.aviso || '';
  if (real) {
    modo.classList.add('ck-gateway-real');
    ck('pagoModoTexto').textContent = configPago.modo === 'sandbox'
      ? 'Culqi sandbox · cobro de prueba real'
      : 'Culqi · pago seguro';
    modo.querySelector('i').className = 'bi bi-shield-check';
  } else {
    modo.classList.add('ck-gateway-prueba');
    ck('pagoModoTexto').textContent = 'Modo prueba · sin cobro real';
    modo.querySelector('i').className = 'bi bi-cone-striped';
  }

  configurarCamposPago(metodo, real);
  ck('ckYapeLimite').classList.toggle('d-none', !(metodo === 'YAPE' && !real && total > limite));
  actualizarBotonConfirmar(total, metodo);
}

function configurarCamposPago(metodo, real) {
  const activaTarjeta = metodo === 'TARJETA' && !real;
  const activaYape = metodo === 'YAPE' && !real;

  ['ckNumTarjeta', 'ckTitular', 'ckVence', 'ckCvv'].forEach((id) => {
    const campo = ck(id);
    campo.disabled = !activaTarjeta;
    campo.required = activaTarjeta;
  });
  ['ckYapeCelular', 'ckYapeCodigo'].forEach((id) => {
    const campo = ck(id);
    campo.disabled = !activaYape;
    campo.required = activaYape;
  });
  ck('btnVerCvv').disabled = !activaTarjeta;
}

function actualizarBotonConfirmar(total = calcularTotales(itemsCarrito()).total, metodo = metodoSeleccionado()) {
  const boton = ck('btnConfirmar');
  if (!boton) return;
  if (esCheckoutMovil() && pasoActual === 2 && pagoTab === 'datos') {
    boton.innerHTML = '<i class="bi bi-arrow-right"></i><span>Continuar al pago</span>';
    return;
  }
  const icono = metodo === 'EFECTIVO' ? 'bi-receipt' : 'bi-lock-fill';
  const verbo = metodo === 'EFECTIVO' ? 'Generar boleta' : 'Pagar';
  boton.innerHTML = `<i class="bi ${icono}"></i><span>${verbo} · ${soles(total)}</span>`;
}

/* ---------- Formulario de tarjeta / Yape (modo simulado) ---------- */

function agruparNumeroTarjeta(valor) {
  const marca = detectarMarca(valor);
  const digitos = valor.replace(/\D/g, '').slice(0, marca === 'AMEX' ? 15 : 19);
  if (marca === 'AMEX') {
    return [digitos.slice(0, 4), digitos.slice(4, 10), digitos.slice(10, 15)].filter(Boolean).join(' ');
  }
  return digitos.replace(/(\d{4})(?=\d)/g, '$1 ');
}

function formatearVencimiento(valor) {
  const digitos = valor.replace(/\D/g, '').slice(0, 4);
  return digitos.length > 2 ? `${digitos.slice(0, 2)}/${digitos.slice(2)}` : digitos;
}

function formatearCelular(valor) {
  const digitos = valor.replace(/\D/g, '').slice(0, 9);
  return [digitos.slice(0, 3), digitos.slice(3, 6), digitos.slice(6, 9)].filter(Boolean).join(' ');
}

function detectarMarca(valor) {
  const n = String(valor).replace(/\D/g, '');
  if (/^4/.test(n)) return 'VISA';
  if (/^(5[1-5]|2(2[2-9]|[3-6]\d|7[01]|720))/.test(n)) return 'MASTERCARD';
  if (/^3[47]/.test(n)) return 'AMEX';
  return '';
}

function actualizarVistaTarjeta() {
  const numero = ck('ckNumTarjeta').value;
  const digitos = numero.replace(/\D/g, '');
  const marca = detectarMarca(digitos);
  const meta = marca === 'AMEX' ? 15 : 16;
  const relleno = digitos.padEnd(meta, '•');
  const grupos = marca === 'AMEX'
    ? [relleno.slice(0, 4), relleno.slice(4, 10), relleno.slice(10, 15)]
    : relleno.match(/.{1,4}/g) || [];

  ck('ckPrevNumero').textContent = grupos.filter(Boolean).join(' ');
  ck('ckPrevMarca').textContent = marca || 'Tarjeta';
  const titular = ck('ckTitular').value.trim();
  ck('ckPrevTitular').textContent = titular ? titular.toUpperCase() : 'NOMBRE APELLIDO';
  ck('ckPrevVence').textContent = ck('ckVence').value || 'MM/AA';
  ck('ckTarjetaPreview').dataset.marca = marca.toLowerCase();
}

function alternarCvv() {
  const campo = ck('ckCvv');
  const boton = ck('btnVerCvv');
  const visible = campo.type === 'text';
  campo.type = visible ? 'password' : 'text';
  boton.innerHTML = `<i class="bi ${visible ? 'bi-eye' : 'bi-eye-slash'}"></i>`;
  boton.setAttribute('aria-label', visible ? 'Mostrar CVV' : 'Ocultar CVV');
}

function rellenarTarjetaPrueba() {
  const titular = ck('ckNombre').value.trim() || 'CLIENTE DE PRUEBA';
  ck('ckNumTarjeta').value = '4111 1111 1111 1111';
  ck('ckTitular').value = titular;
  ck('ckVence').value = '09/30';
  ck('ckCvv').value = '123';
  limpiarErroresCampos();
  actualizarVistaTarjeta();
  ck('ckNumTarjeta').focus();
}

function rellenarYapePrueba() {
  ck('ckYapeCelular').value = '900 000 001';
  ck('ckYapeCodigo').value = '123456';
  limpiarErroresCampos();
  ck('ckYapeCelular').focus();
}

function luhnValido(digitos) {
  let suma = 0;
  let doble = false;
  for (let i = digitos.length - 1; i >= 0; i--) {
    let n = Number(digitos[i]);
    if (doble) { n *= 2; if (n > 9) n -= 9; }
    suma += n;
    doble = !doble;
  }
  return digitos.length >= 13 && suma % 10 === 0;
}

function vencimientoValido(texto) {
  const m = /^(\d{2})\/(\d{2})$/.exec(texto);
  if (!m) return false;
  const mes = Number(m[1]);
  const anio = 2000 + Number(m[2]);
  if (mes < 1 || mes > 12) return false;
  const finDeMes = new Date(anio, mes, 0, 23, 59, 59);
  return finDeMes >= new Date();
}

/* ---------- Validación de los campos simulados ---------- */

const CAMPOS_VALIDABLES = [
  'ckNombre', 'ckDni', 'ckCorreo', 'ckNumTarjeta', 'ckTitular', 'ckVence', 'ckCvv',
  'ckYapeCelular', 'ckYapeCodigo'
];

function marcarErrorCampo(id, mensaje) {
  const campo = ck(id);
  if (!campo) return;
  campo.classList.add('ck-invalid');
  campo.setAttribute('aria-invalid', 'true');
  const error = ck('err' + id.slice(2));
  if (error) {
    error.textContent = mensaje;
    error.classList.add('visible');
  }
}

function limpiarErrorCampo(id) {
  const campo = ck(id);
  if (!campo) return;
  campo.classList.remove('ck-invalid');
  campo.removeAttribute('aria-invalid');
  const error = ck('err' + id.slice(2));
  if (error) {
    error.textContent = '';
    error.classList.remove('visible');
  }
}

function limpiarErroresCampos() {
  CAMPOS_VALIDABLES.forEach(limpiarErrorCampo);
}

function validarDatosCliente() {
  let ok = true;
  let primero = null;
  const nombre = ck('ckNombre').value.trim();
  const dni = ck('ckDni').value.trim();
  const correo = ck('ckCorreo').value.trim();

  if (nombre.length < 3) {
    marcarErrorCampo('ckNombre', 'Escribe tu nombre completo.');
    primero = primero || ck('ckNombre');
    ok = false;
  }
  if (!/^\d{8}$/.test(dni)) {
    marcarErrorCampo('ckDni', 'El DNI debe tener 8 números.');
    primero = primero || ck('ckDni');
    ok = false;
  }
  if (correo && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) {
    marcarErrorCampo('ckCorreo', 'Escribe un correo válido.');
    primero = primero || ck('ckCorreo');
    ok = false;
  } else if (!correo && metodoSeleccionado() !== 'EFECTIVO') {
    marcarErrorCampo('ckCorreo', 'El correo es necesario para pagar con tarjeta o Yape.');
    primero = primero || ck('ckCorreo');
    ok = false;
  }

  if (!ok) {
    mostrarErrorPago('Revisa los datos marcados para continuar.');
    primero?.focus();
  }
  return ok;
}

function validarTarjetaSimulada() {
  let ok = true;
  let primero = null;
  const digitos = ck('ckNumTarjeta').value.replace(/\D/g, '');
  const marca = detectarMarca(digitos);
  const titular = ck('ckTitular').value.trim();
  const vence = ck('ckVence').value.trim();
  const cvv = ck('ckCvv').value.replace(/\D/g, '');
  const largoCvv = marca === 'AMEX' ? 4 : 3;

  if (!luhnValido(digitos)) {
    marcarErrorCampo('ckNumTarjeta', 'Número de tarjeta inválido. Revisa los dígitos.');
    primero = primero || ck('ckNumTarjeta');
    ok = false;
  }
  if (titular.length < 3 || !/[a-záéíóúñ]/i.test(titular)) {
    marcarErrorCampo('ckTitular', 'Escribe el nombre como aparece en la tarjeta.');
    primero = primero || ck('ckTitular');
    ok = false;
  }
  if (!vencimientoValido(vence)) {
    marcarErrorCampo('ckVence', 'Usa el formato MM/AA y una fecha vigente.');
    primero = primero || ck('ckVence');
    ok = false;
  }
  if (cvv.length !== largoCvv) {
    marcarErrorCampo('ckCvv', `El CVV debe tener ${largoCvv} dígitos.`);
    primero = primero || ck('ckCvv');
    ok = false;
  }

  if (!ok) {
    mostrarErrorPago('Revisa los datos de tu tarjeta.');
    primero?.focus();
  }
  return ok;
}

function validarYapeSimulado() {
  let ok = true;
  let primero = null;
  const celular = ck('ckYapeCelular').value.replace(/\D/g, '');
  const codigo = ck('ckYapeCodigo').value.replace(/\D/g, '');

  if (!/^9\d{8}$/.test(celular)) {
    marcarErrorCampo('ckYapeCelular', 'Ingresa un celular peruano de 9 dígitos.');
    primero = primero || ck('ckYapeCelular');
    ok = false;
  }
  if (!/^\d{6}$/.test(codigo)) {
    marcarErrorCampo('ckYapeCodigo', 'El código de aprobación debe tener 6 dígitos.');
    primero = primero || ck('ckYapeCodigo');
    ok = false;
  }

  if (!ok) {
    mostrarErrorPago('Revisa los datos de Yape.');
    primero?.focus();
  }
  return ok;
}

function validarPagoSimulado(metodo) {
  if (esPagoReal() || metodo === 'EFECTIVO') return true;
  if (metodo === 'TARJETA') return validarTarjetaSimulada();
  if (metodo === 'YAPE') return validarYapeSimulado();
  return true;
}

function tokenSimulado(metodo) {
  const sello = Date.now().toString(36).toUpperCase();
  if (metodo === 'TARJETA') {
    const digitos = ck('ckNumTarjeta').value.replace(/\D/g, '');
    metaTarjetaSimulada = {
      marca: detectarMarca(digitos) || 'TARJETA',
      ultimos4: digitos.slice(-4)
    };
    return `sim_tarjeta_${sello}`;
  }
  return `sim_yape_${sello}`;
}

/* ---------- Paso 2: confirmar compra ---------- */

async function confirmarCompra(e) {
  e.preventDefault();
  if (enviandoCompra) return;

  if (configPagoListo) await configPagoListo;

  ocultarError();
  limpiarErroresCampos();
  irAPaso(2);

  const items = itemsCarrito();
  if (!items.length) return;

  const metodo = metodoSeleccionado();
  const total = calcularTotales(items).total;
  const limite = Number(configPago.limiteYape) || LIMITE_YAPE_DEFECTO;

  if (metodo === 'YAPE' && total > limite) {
    mostrarErrorPago(`Yape permite pagos de hasta ${soles(limite)}. Elige tarjeta o efectivo.`);
    return;
  }

  const movil = esCheckoutMovil();
  if (movil && pagoTab === 'datos') {
    if (!validarDatosCliente()) return;
    cambiarPestanaPago('pago');
    return;
  }

  if (!validarDatosCliente()) {
    if (movil) {
      cambiarPestanaPago('datos');
      document.querySelector('#ckBloqueDatos .ck-invalid')?.focus();
    }
    return;
  }
  if (!validarPagoSimulado(metodo)) return;

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
    datos.tokenPago = tokenSimulado(metodo);
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
  boton.innerHTML = `<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span><span>${datos.metodoPago === 'EFECTIVO' ? 'Generando boleta...' : 'Confirmando pago...'}</span>`;

  try {
    const res = await fetch(`${API_URL}/ventas`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(datos)
    });
    const venta = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(venta.error || 'No se pudo registrar la compra.');

    // En modo simulado se conserva la marca/últimos 4 solo para mostrarlos en la boleta local.
    if (datos.metodoPago === 'TARJETA' && String(datos.tokenPago || '').startsWith('sim_') && metaTarjetaSimulada && !venta.tarjetaMarca) {
      venta.tarjetaMarca = metaTarjetaSimulada.marca;
      venta.tarjetaUltimos4 = metaTarjetaSimulada.ultimos4;
    }

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
  error.innerHTML = `<i class="bi bi-exclamation-circle"></i>${esc(mensaje)}`;
  error.classList.remove('d-none');
  ck('ckPagoScroll').scrollTo({ top: 0, behavior: scrollBehavior() });
}
function ocultarError() {
  ck('ckError').classList.add('d-none');
  ck('ckError').innerHTML = '';
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
    irAPaso(1);
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
  if (String(v.metodoPago || '').toUpperCase() === 'TARJETA'
      && String(v.pagoPasarela || '').toUpperCase() === 'SIMULADO'
      && !v.tarjetaMarca && metaTarjetaSimulada) {
    v.tarjetaMarca = metaTarjetaSimulada.marca;
    v.tarjetaUltimos4 = metaTarjetaSimulada.ultimos4;
  }
  irAPaso(3);
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
  const zonaBoleta = ck('boleta')?.parentElement;
  if (zonaBoleta) zonaBoleta.scrollTop = 0;
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
