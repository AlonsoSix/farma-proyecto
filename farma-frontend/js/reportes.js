/* =====================================================================
   Panel de administración: 6 REPORTES ESTADÍSTICOS (Avance Final)
   Datos: GET /api/reportes?desde=...&hasta=...  (cabecera X-Usuario-Id del admin)

   Cada reporte tiene: gráfico (Chart.js), descripción de resultados (se escribe sola
   con los datos) y tabla. Se puede descargar cada reporte o el informe completo en:
     - PDF   -> jsPDF + jspdf-autotable (incluye el gráfico)
     - Excel -> SheetJS (una hoja por reporte)
     - Word  -> docx (incluye el gráfico)
   ===================================================================== */

const API = 'http://localhost:8081/api';
const $ = (id) => document.getElementById(id);

// Colores de la marca para los gráficos
const COLORES = ['#0b72b3', '#f26b1d', '#1f9d55', '#c8102e', '#6f42c1', '#0d9488', '#e0a800', '#64748b'];
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const METODOS = { EFECTIVO: 'Efectivo', TARJETA: 'Tarjeta', YAPE: 'Yape' };

let datos = null;       // respuesta del backend
let reportes = [];      // los 6 reportes ya armados (título, descripción, tabla, gráfico)
const graficos = {};    // instancias de Chart.js por id de reporte

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
  if (!esAdmin) {
    $('sinAcceso').classList.remove('d-none');
    $('btnSalir').classList.add('d-none');
    return;
  }
  $('panel').classList.remove('d-none');
  $('adminNombre').textContent = sesion.nombre || 'Administrador';

  Chart.defaults.font.family = 'Poppins, system-ui, sans-serif';
  Chart.defaults.color = '#4a5668';

  $('formFechas').addEventListener('submit', (e) => { e.preventDefault(); cargar(); });
  $('btnTodoPeriodo').addEventListener('click', () => { $('fDesde').value = ''; $('fHasta').value = ''; cargar(); });

  // Botones de descarga (del informe completo y de cada reporte)
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.rep-btn[data-formato]');
    if (btn) descargar(btn.dataset.formato, btn.dataset.reporte, btn);
  });

  cargar();
});

/* ---------- Utilidades ---------- */
function esc(t) {
  return String(t ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
const soles = (n) => 'S/ ' + Number(n).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const pct = (parte, total) => total > 0 ? (parte * 100 / total).toFixed(1).replace('.0', '') + '%' : '0%';
const nombreMes = (m) => `${MESES[m.mes - 1]} ${m.anio}`;
const mayus = (t) => t.charAt(0).toUpperCase() + t.slice(1);
function fechaCorta(iso) {
  if (!iso) return '';
  const [a, m, d] = String(iso).slice(0, 10).split('-');
  return `${d}/${m}/${a}`;
}
function aviso(texto) {
  $('toastTexto').textContent = texto;
  bootstrap.Toast.getOrCreateInstance($('toastAviso'), { delay: 2800 }).show();
}
function textoPeriodo() {
  const d = $('fDesde').value, h = $('fHasta').value;
  if (d && h) return `del ${fechaCorta(d)} al ${fechaCorta(h)}`;
  if (d) return `desde el ${fechaCorta(d)}`;
  if (h) return `hasta el ${fechaCorta(h)}`;
  return 'en todo el periodo registrado';
}
// Para los encabezados de los archivos: "Del 01/10/2026 al 31/10/2026" o "Todo el periodo registrado"
const etiquetaPeriodo = () => mayus(textoPeriodo().replace(/^en /, ''));

/* ---------- Carga ---------- */
async function cargar() {
  $('repError').classList.add('d-none');
  const q = new URLSearchParams();
  if ($('fDesde').value) q.set('desde', $('fDesde').value);
  if ($('fHasta').value) q.set('hasta', $('fHasta').value);
  try {
    let res;
    try {
      res = await fetch(`${API}/reportes?${q}`, { headers: { 'X-Usuario-Id': String(sesion.id) } });
    } catch (e) {
      throw new Error('No se pudo conectar con el servidor. Verifica que el backend esté corriendo en el puerto 8081.');
    }
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.error || `Error del servidor (${res.status}).`);
    datos = json;
    pintarResumen();
    armarReportes();
    pintarReportes();
  } catch (err) {
    $('repError').textContent = err.message;
    $('repError').classList.remove('d-none');
    $('repGrid').innerHTML = '';
  }
}

function pintarResumen() {
  const r = datos.resumen;
  $('rIngresos').textContent = soles(r.ingresos);
  $('rVentas').textContent = r.ventas;
  $('rTicket').textContent = soles(r.ticketPromedio);
  $('rUnidades').textContent = r.unidades;
  $('rAhorro').textContent = soles(r.ahorroOfertas);
}

/* =====================================================================
   Los 6 reportes. Cada uno define:
   titulo, descripcion (texto de resultados), columnas + filas (tabla) y grafico (config de Chart.js)
   ===================================================================== */
function armarReportes() {
  reportes = [
    reporteVentasMes(),
    reporteTopProductos(),
    reporteCategorias(),
    reporteMetodosPago(),
    reporteInventario(),
    reporteVencimientos()
  ];
}

const SIN_VENTAS = 'No hay ventas registradas en el periodo seleccionado.';

// 1. Ventas por mes
function reporteVentasMes() {
  const lista = datos.ventasPorMes;
  let descripcion = SIN_VENTAS;
  if (lista.length) {
    const total = lista.reduce((s, m) => s + Number(m.total), 0);
    const boletas = lista.reduce((s, m) => s + m.ventas, 0);
    const mejor = lista.reduce((a, b) => Number(b.total) > Number(a.total) ? b : a);
    const peor = lista.reduce((a, b) => Number(b.total) < Number(a.total) ? b : a);
    descripcion = lista.length === 1
      ? `${mayus(textoPeriodo())} se emitieron ${boletas} boletas por un total de ${soles(total)}, todas en ${nombreMes(mejor)}.`
      : `${mayus(textoPeriodo())} se emitieron ${boletas} boletas por un total de ${soles(total)}, ` +
        `con un promedio de ${soles(total / lista.length)} por mes. El mes con más ventas fue ${nombreMes(mejor)} (${soles(mejor.total)}) ` +
        `y el de menos ventas fue ${nombreMes(peor)} (${soles(peor.total)}).`;
    if (lista.length >= 2) {
      const ult = lista[lista.length - 1], ant = lista[lista.length - 2];
      const cambio = Number(ant.total) > 0 ? (Number(ult.total) - Number(ant.total)) * 100 / Number(ant.total) : 0;
      descripcion += ` Respecto a ${nombreMes(ant)}, las ventas de ${nombreMes(ult)} ${cambio >= 0 ? 'subieron' : 'bajaron'} ${Math.abs(cambio).toFixed(1)}%` +
        (lista.length && (new Date().getMonth() + 1) === ult.mes ? ' (el mes actual aún no termina).' : '.');
    }
    const conDesc = lista.filter(m => Number(m.descuentos) > 0);
    if (conDesc.length) {
      descripcion += ` Las ofertas dieron ${soles(conDesc.reduce((s, m) => s + Number(m.descuentos), 0))} de descuento a los clientes.`;
    }
  }
  return {
    id: 'ventasMes', numero: 1, titulo: 'Ventas por mes', icono: 'bi-graph-up-arrow', ancho: 'col-lg-8', alto: 340,
    descripcion,
    columnas: ['Mes', 'Boletas', 'Total vendido (S/)', 'Descuentos (S/)'],
    filas: lista.map(m => [mayus(nombreMes(m)), m.ventas, Number(m.total), Number(m.descuentos)]),
    grafico: {
      type: 'bar',
      data: {
        labels: lista.map(m => mayus(MESES[m.mes - 1].slice(0, 3)) + ' ' + String(m.anio).slice(2)),
        datasets: [
          { type: 'bar', label: 'Total vendido (S/)', data: lista.map(m => Number(m.total)), backgroundColor: COLORES[0], borderRadius: 6, order: 2 },
          { type: 'line', label: 'Boletas', data: lista.map(m => m.ventas), borderColor: COLORES[1], backgroundColor: COLORES[1], yAxisID: 'y2', tension: .3, order: 1 }
        ]
      },
      options: {
        scales: {
          y: { beginAtZero: true, title: { display: true, text: 'Soles' } },
          y2: { beginAtZero: true, position: 'right', grid: { drawOnChartArea: false }, title: { display: true, text: 'Boletas' } }
        }
      }
    }
  };
}

// 2. Productos más vendidos
function reporteTopProductos() {
  const lista = datos.productosMasVendidos;
  let descripcion = SIN_VENTAS;
  if (lista.length) {
    const unidades = lista.reduce((s, p) => s + p.unidades, 0);
    const top3 = lista.slice(0, 3).reduce((s, p) => s + p.unidades, 0);
    const masIngreso = lista.reduce((a, b) => Number(b.total) > Number(a.total) ? b : a);
    descripcion = `El producto más vendido ${textoPeriodo()} fue ${lista[0].nombre} con ${lista[0].unidades} unidades (${soles(lista[0].total)}). ` +
      `Los 3 primeros suman ${top3} unidades, el ${pct(top3, unidades)} de las unidades de este top ${lista.length}. ` +
      `El producto que más dinero generó fue ${masIngreso.nombre} (${soles(masIngreso.total)}). ` +
      'Conviene mantener buen stock de estos productos.';
  }
  return {
    id: 'topProductos', numero: 2, titulo: `Top ${lista.length || 10} productos más vendidos`, icono: 'bi-trophy', ancho: 'col-lg-4',
    descripcion,
    columnas: ['#', 'Código', 'Producto', 'Unidades', 'Total (S/)'],
    filas: lista.map((p, i) => [i + 1, p.codigo, p.nombre, p.unidades, Number(p.total)]),
    grafico: {
      type: 'bar',
      data: {
        labels: lista.map(p => p.nombre.length > 18 ? p.nombre.slice(0, 17) + '…' : p.nombre),
        datasets: [{ label: 'Unidades vendidas', data: lista.map(p => p.unidades), backgroundColor: COLORES[1], borderRadius: 6 }]
      },
      options: { indexAxis: 'y', plugins: { legend: { display: false } }, scales: { x: { beginAtZero: true } } }
    },
    alto: 340
  };
}

// 3. Ventas por categoría
function reporteCategorias() {
  const lista = datos.ventasPorCategoria;
  let descripcion = SIN_VENTAS;
  if (lista.length) {
    const total = lista.reduce((s, c) => s + Number(c.total), 0);
    const primera = lista[0], ultima = lista[lista.length - 1];
    descripcion = `La categoría que más vendió ${textoPeriodo()} fue ${primera.categoria}, con ${soles(primera.total)} ` +
      `(${pct(Number(primera.total), total)} de los ingresos y ${primera.unidades} unidades).` +
      (lista.length > 1 ? ` La que menos vendió fue ${ultima.categoria} (${soles(ultima.total)}, ${pct(Number(ultima.total), total)}).` : '') +
      ` En total se vendieron productos de ${lista.length} categorías.`;
  }
  return {
    id: 'categorias', numero: 3, titulo: 'Ventas por categoría', icono: 'bi-pie-chart', ancho: 'col-lg-6',
    descripcion,
    columnas: ['Categoría', 'Unidades', 'Total (S/)', '% de ingresos'],
    filas: (() => {
      const total = lista.reduce((s, c) => s + Number(c.total), 0);
      return lista.map(c => [c.categoria, c.unidades, Number(c.total), pct(Number(c.total), total)]);
    })(),
    grafico: {
      type: 'doughnut',
      data: {
        labels: lista.map(c => c.categoria),
        datasets: [{ data: lista.map(c => Number(c.total)), backgroundColor: COLORES, borderColor: '#fff', borderWidth: 2 }]
      },
      options: { plugins: { legend: { position: 'right' } } }
    }
  };
}

// 4. Métodos de pago
function reporteMetodosPago() {
  const lista = datos.metodosPago;
  let descripcion = SIN_VENTAS;
  if (lista.length) {
    const boletas = lista.reduce((s, m) => s + m.ventas, 0);
    const primero = lista[0];
    const mayorMonto = lista.reduce((a, b) => Number(b.total) > Number(a.total) ? b : a);
    descripcion = `El método de pago más usado ${textoPeriodo()} fue ${METODOS[primero.metodo] || primero.metodo}, ` +
      `con ${primero.ventas} de ${boletas} compras (${pct(primero.ventas, boletas)}). ` +
      `El método con mayor monto cobrado fue ${METODOS[mayorMonto.metodo] || mayorMonto.metodo} (${soles(mayorMonto.total)}). ` +
      lista.map(m => `${METODOS[m.metodo] || m.metodo}: ${pct(m.ventas, boletas)}`).join(', ') + '.';
  }
  return {
    id: 'metodos', numero: 4, titulo: 'Ventas por método de pago', icono: 'bi-wallet2', ancho: 'col-lg-6',
    descripcion,
    columnas: ['Método de pago', 'Compras', 'Total cobrado (S/)'],
    filas: lista.map(m => [METODOS[m.metodo] || m.metodo, m.ventas, Number(m.total)]),
    grafico: {
      type: 'pie',
      data: {
        labels: lista.map(m => METODOS[m.metodo] || m.metodo),
        datasets: [{ data: lista.map(m => m.ventas), backgroundColor: [COLORES[0], COLORES[2], COLORES[4]], borderColor: '#fff', borderWidth: 2 }]
      },
      options: { plugins: { legend: { position: 'right' } } }
    }
  };
}

// 5. Estado del inventario
function reporteInventario() {
  const inv = datos.inventario;
  const activos = inv.disponibles + inv.stockBajo + inv.agotados;
  const reponer = inv.criticos.map(c => `${c.nombre} (${c.stock === 0 ? 'agotado' : c.stock + ' u.'})`);
  const descripcion = `De ${activos} productos activos, ${inv.disponibles} tienen stock suficiente (${pct(inv.disponibles, activos)}), ` +
    `${inv.stockBajo} tienen stock bajo (5 unidades o menos) y ${inv.agotados} ${inv.agotados === 1 ? 'está agotado' : 'están agotados'}. ` +
    `Además hay ${inv.deBaja} producto(s) dados de baja. El inventario activo vale ${soles(inv.valorInventario)} a precio de venta.` +
    (reponer.length ? ` Se recomienda reponer pronto: ${reponer.join(', ')}.` : ' No hay productos que necesiten reposición.');
  return {
    id: 'inventario', numero: 5, titulo: 'Estado del inventario', icono: 'bi-box-seam', ancho: 'col-lg-6',
    descripcion,
    columnas: ['Estado', 'Productos'],
    filas: [['Stock suficiente (más de 5)', inv.disponibles], ['Stock bajo (1 a 5)', inv.stockBajo], ['Agotados', inv.agotados], ['Dados de baja', inv.deBaja]],
    extra: inv.criticos.length ? { titulo: 'Productos para reponer', columnas: ['Código', 'Producto', 'Stock'], filas: inv.criticos.map(c => [c.codigo, c.nombre, c.stock]) } : null,
    grafico: {
      type: 'bar',
      data: {
        labels: ['Stock suficiente', 'Stock bajo', 'Agotados', 'De baja'],
        datasets: [{ label: 'Productos', data: [inv.disponibles, inv.stockBajo, inv.agotados, inv.deBaja], backgroundColor: [COLORES[2], COLORES[6], COLORES[3], COLORES[7]], borderRadius: 6 }]
      },
      options: { plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { precision: 0 } } } }
    }
  };
}

// 6. Productos por vencer
function reporteVencimientos() {
  const v = datos.vencimientos;
  const [vencidos, tres, seis, doce, mas, noVence] = v.cantidades;
  const prox = v.proximos[0];
  let descripcion = `Hay ${vencidos} producto(s) vencido(s) y ${tres} que vencen en los próximos 3 meses. ` +
    `${seis} vencen en 3 a 6 meses, ${doce} en 6 a 12 meses y ${mas} en más de un año. ${noVence} producto(s) no vencen (equipos médicos).`;
  if (prox) descripcion += ` El más próximo a vencer es ${prox.nombre} (${fechaCorta(prox.fechaVencimiento)}, ${prox.dias < 0 ? 'vencido hace ' + Math.abs(prox.dias) : 'en ' + prox.dias} días).`;
  descripcion += vencidos + tres > 0
    ? ' Se recomienda retirar los vencidos y poner en oferta los que vencen pronto.'
    : ' No hay productos que requieran acción inmediata.';
  return {
    id: 'vencimientos', numero: 6, titulo: 'Productos por vencer', icono: 'bi-calendar-x', ancho: 'col-lg-6',
    descripcion,
    columnas: ['Rango', 'Productos'],
    filas: v.etiquetas.map((e, i) => [e, v.cantidades[i]]),
    extra: v.proximos.length ? { titulo: 'Próximos a vencer', columnas: ['Código', 'Producto', 'Vence', 'Días', 'Stock'], filas: v.proximos.map(p => [p.codigo, p.nombre, fechaCorta(p.fechaVencimiento), p.dias, p.stock]) } : null,
    grafico: {
      type: 'bar',
      data: {
        labels: v.etiquetas,
        datasets: [{ label: 'Productos', data: v.cantidades, backgroundColor: [COLORES[3], COLORES[1], COLORES[6], COLORES[0], COLORES[2], COLORES[7]], borderRadius: 6 }]
      },
      options: { plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { precision: 0 } } } }
    }
  };
}

/* ---------- Dibujar en la página ---------- */
function formatoCelda(valor, columna) {
  return typeof valor === 'number' && /S\//.test(columna) ? soles(valor) : esc(valor);
}

function htmlTabla(columnas, filas) {
  return `
    <div class="table-responsive">
      <table class="table table-sm rep-tabla mb-0">
        <thead><tr>${columnas.map(c => `<th>${esc(c)}</th>`).join('')}</tr></thead>
        <tbody>${filas.length
          ? filas.map(f => `<tr>${f.map((v, i) => `<td>${formatoCelda(v, columnas[i])}</td>`).join('')}</tr>`).join('')
          : `<tr><td colspan="${columnas.length}" class="text-muted text-center">Sin datos</td></tr>`}</tbody>
      </table>
    </div>`;
}

function pintarReportes() {
  Object.values(graficos).forEach(g => g.destroy());
  $('repGrid').innerHTML = reportes.map(r => `
    <div class="col-12 ${r.ancho}">
      <article class="admin-card rep-card" id="rep-${r.id}">
        <header class="rep-cabecera">
          <h2 class="rep-titulo"><span class="rep-num">${r.numero}</span><i class="bi ${r.icono}"></i>${esc(r.titulo)}</h2>
          <div class="rep-descargas rep-descargas-sm" role="group" aria-label="Descargar ${esc(r.titulo)}">
            <button type="button" class="rep-btn rep-btn-pdf" data-formato="pdf" data-reporte="${r.id}" title="Descargar en PDF"><i class="bi bi-file-earmark-pdf"></i>PDF</button>
            <button type="button" class="rep-btn rep-btn-excel" data-formato="excel" data-reporte="${r.id}" title="Descargar en Excel"><i class="bi bi-file-earmark-excel"></i>Excel</button>
            <button type="button" class="rep-btn rep-btn-word" data-formato="word" data-reporte="${r.id}" title="Descargar en Word"><i class="bi bi-file-earmark-word"></i>Word</button>
          </div>
        </header>
        <div class="rep-grafico" style="height:${r.alto || 280}px"><canvas id="graf-${r.id}" aria-label="Gráfico: ${esc(r.titulo)}" role="img"></canvas></div>
        <div class="rep-resultados">
          <h3><i class="bi bi-lightbulb me-1"></i>Descripción de resultados</h3>
          <p class="mb-0">${esc(r.descripcion)}</p>
        </div>
        <details class="rep-detalle">
          <summary>Ver datos del reporte</summary>
          ${htmlTabla(r.columnas, r.filas)}
          ${r.extra ? `<h4 class="rep-extra-titulo">${esc(r.extra.titulo)}</h4>${htmlTabla(r.extra.columnas, r.extra.filas)}` : ''}
        </details>
      </article>
    </div>`).join('');

  reportes.forEach(r => {
    const cfg = r.grafico;
    cfg.options = Object.assign({ responsive: true, maintainAspectRatio: false, animation: { duration: 400 } }, cfg.options);
    // Fondo blanco al exportar la imagen del gráfico (PDF / Word)
    cfg.plugins = [{ id: 'fondoBlanco', beforeDraw: (c) => { const ctx = c.ctx; ctx.save(); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height); ctx.restore(); } }];
    graficos[r.id] = new Chart($(`graf-${r.id}`), cfg);
  });
}

/* =====================================================================
   DESCARGAS
   ===================================================================== */
function nombreArchivo(lista, extension) {
  const base = lista.length === 1 ? `reporte-${lista[0].numero}-${lista[0].id}` : 'informe-reportes';
  return `${base}-PorTuSalud-${new Date().toISOString().slice(0, 10)}.${extension}`;
}

function imagenGrafico(r) {
  return graficos[r.id].toBase64Image('image/png', 1);
}

async function descargar(formato, id, boton) {
  if (!reportes.length) { aviso('Primero deben cargarse los reportes.'); return; }
  const lista = id === 'todos' ? reportes : reportes.filter(r => r.id === id);
  const original = boton.innerHTML;
  boton.disabled = true;
  boton.innerHTML = '<span class="spinner-border spinner-border-sm"></span>';
  try {
    if (formato === 'pdf') descargarPdf(lista);
    else if (formato === 'excel') descargarExcel(lista);
    else await descargarWord(lista);
    aviso('Descarga lista.');
  } catch (err) {
    console.error(err);
    aviso('No se pudo generar el archivo. Revisa tu conexión a internet (las librerías se cargan desde la web).');
  } finally {
    boton.disabled = false;
    boton.innerHTML = original;
  }
}

// Valores de la tabla como texto (para PDF y Word)
const filasTexto = (columnas, filas) => filas.map(f => f.map((v, i) => typeof v === 'number' && /S\//.test(columnas[i]) ? Number(v).toFixed(2) : String(v)));

/* ---------- PDF ---------- */
function descargarPdf(lista) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const ancho = doc.internal.pageSize.getWidth();
  const margen = 15;

  lista.forEach((r, i) => {
    if (i > 0) doc.addPage();
    // Encabezado
    doc.setFillColor(11, 114, 179);
    doc.rect(0, 0, ancho, 22, 'F');
    doc.setTextColor(255);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(14);
    doc.text('PorTuSalud - Informe de reportes', margen, 10);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
    doc.text(`Periodo: ${etiquetaPeriodo()}  ·  Generado: ${new Date().toLocaleString('es-PE')}`, margen, 16);

    doc.setTextColor(11, 42, 69);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(13);
    doc.text(`Reporte ${r.numero}: ${r.titulo}`, margen, 32);

    // Gráfico
    const canvas = $(`graf-${r.id}`);
    const proporcion = canvas.height / canvas.width;
    let imgAncho = ancho - margen * 2;
    let imgAlto = imgAncho * proporcion;
    if (imgAlto > 95) { imgAlto = 95; imgAncho = imgAlto / proporcion; }   // que no ocupe más de media hoja
    // JPEG para que el PDF pese menos (el gráfico tiene fondo blanco)
    doc.addImage(graficos[r.id].toBase64Image('image/jpeg', 0.92), 'JPEG', margen, 37, imgAncho, imgAlto);
    let y = 37 + imgAlto + 8;

    // Descripción de resultados
    doc.setFont('helvetica', 'bold'); doc.setFontSize(11);
    doc.text('Descripción de resultados', margen, y);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(40);
    const lineas = doc.splitTextToSize(r.descripcion, ancho - margen * 2);
    doc.text(lineas, margen, y + 6);
    y += 6 + lineas.length * 5 + 4;

    // Tablas
    const estilo = { headStyles: { fillColor: [11, 114, 179] }, styles: { fontSize: 9 }, margin: { left: margen, right: margen } };
    doc.autoTable({ ...estilo, startY: y, head: [r.columnas], body: filasTexto(r.columnas, r.filas) });
    if (r.extra) {
      y = doc.lastAutoTable.finalY + 8;
      doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(11, 42, 69);
      doc.text(r.extra.titulo, margen, y);
      doc.autoTable({ ...estilo, startY: y + 3, head: [r.extra.columnas], body: filasTexto(r.extra.columnas, r.extra.filas) });
    }
  });

  // Numeración de páginas
  const total = doc.getNumberOfPages();
  for (let p = 1; p <= total; p++) {
    doc.setPage(p);
    doc.setFontSize(8); doc.setTextColor(120);
    doc.text(`Página ${p} de ${total}`, ancho - margen, doc.internal.pageSize.getHeight() - 8, { align: 'right' });
  }
  doc.save(nombreArchivo(lista, 'pdf'));
}

/* ---------- Excel ---------- */
function descargarExcel(lista) {
  const libro = XLSX.utils.book_new();
  if (lista.length > 1) {
    const r = datos.resumen;
    const hoja = XLSX.utils.aoa_to_sheet([
      ['PorTuSalud - Informe de reportes'],
      [`Periodo: ${etiquetaPeriodo()}`],
      [`Generado: ${new Date().toLocaleString('es-PE')}`],
      [],
      ['Indicador', 'Valor'],
      ['Ingresos (S/)', Number(r.ingresos)],
      ['Boletas emitidas', r.ventas],
      ['Ticket promedio (S/)', Number(r.ticketPromedio)],
      ['Unidades vendidas', r.unidades],
      ['Descuentos por ofertas (S/)', Number(r.ahorroOfertas)]
    ]);
    hoja['!cols'] = [{ wch: 30 }, { wch: 16 }];
    XLSX.utils.book_append_sheet(libro, hoja, 'Resumen');
  }
  lista.forEach(r => {
    const filas = [
      [`Reporte ${r.numero}: ${r.titulo}`],
      [`Periodo: ${etiquetaPeriodo()}`],
      [],
      ['Descripción de resultados'],
      [r.descripcion],
      [],
      r.columnas,
      ...r.filas
    ];
    if (r.extra) filas.push([], [r.extra.titulo], r.extra.columnas, ...r.extra.filas);
    const hoja = XLSX.utils.aoa_to_sheet(filas);
    hoja['!cols'] = r.columnas.map((c, i) => ({ wch: i === 0 ? 34 : Math.max(14, c.length + 2) }));
    XLSX.utils.book_append_sheet(libro, hoja, `${r.numero}. ${r.titulo}`.slice(0, 31));
  });
  XLSX.writeFile(libro, nombreArchivo(lista, 'xlsx'));
}

/* ---------- Word ---------- */
function base64ABytes(dataUrl) {
  const bin = atob(dataUrl.split(',')[1]);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

function tablaWord(columnas, filas) {
  const { Table, TableRow, TableCell, Paragraph, TextRun, WidthType, ShadingType } = docx;
  const celda = (texto, cabecera) => new TableCell({
    shading: cabecera ? { type: ShadingType.CLEAR, color: 'auto', fill: '0B72B3' } : undefined,
    margins: { top: 60, bottom: 60, left: 100, right: 100 },
    children: [new Paragraph({ children: [new TextRun({ text: String(texto), bold: cabecera, color: cabecera ? 'FFFFFF' : '1F2933', size: 18 })] })]
  });
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({ tableHeader: true, children: columnas.map(c => celda(c, true)) }),
      ...filasTexto(columnas, filas).map(f => new TableRow({ children: f.map(v => celda(v, false)) }))
    ]
  });
}

async function descargarWord(lista) {
  const { Document, Packer, Paragraph, TextRun, HeadingLevel, ImageRun, PageBreak } = docx;
  const hijos = [
    new Paragraph({ heading: HeadingLevel.TITLE, children: [new TextRun({ text: 'PorTuSalud - Informe de reportes', color: '0B2A45' })] }),
    new Paragraph({ children: [new TextRun({ text: `Periodo: ${etiquetaPeriodo()}  ·  Generado: ${new Date().toLocaleString('es-PE')}`, color: '52606D', size: 20 })] })
  ];
  lista.forEach((r, i) => {
    const canvas = $(`graf-${r.id}`);
    const ancho = 600;
    const alto = Math.round(ancho * canvas.height / canvas.width);
    if (i > 0) hijos.push(new Paragraph({ children: [new PageBreak()] }));
    hijos.push(
      new Paragraph({ heading: HeadingLevel.HEADING_1, spacing: { before: 300, after: 120 }, children: [new TextRun({ text: `Reporte ${r.numero}: ${r.titulo}`, color: '0B72B3' })] }),
      new Paragraph({ children: [new ImageRun({ data: base64ABytes(imagenGrafico(r)), transformation: { width: ancho, height: alto } })] }),
      new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 200, after: 80 }, children: [new TextRun({ text: 'Descripción de resultados' })] }),
      new Paragraph({ spacing: { after: 200 }, children: [new TextRun({ text: r.descripcion, size: 22 })] }),
      tablaWord(r.columnas, r.filas)
    );
    if (r.extra) {
      hijos.push(
        new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 240, after: 80 }, children: [new TextRun({ text: r.extra.titulo })] }),
        tablaWord(r.extra.columnas, r.extra.filas)
      );
    }
  });
  const documento = new Document({
    creator: 'PorTuSalud',
    title: 'Informe de reportes',
    styles: { default: { document: { run: { font: 'Calibri' } } } },
    sections: [{ children: hijos }]
  });
  const blob = await Packer.toBlob(documento);
  const enlace = document.createElement('a');
  enlace.href = URL.createObjectURL(blob);
  enlace.download = nombreArchivo(lista, 'docx');
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  setTimeout(() => URL.revokeObjectURL(enlace.href), 1000);
}
