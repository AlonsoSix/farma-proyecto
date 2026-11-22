/* =====================================================================
   Opiniones de clientes (contacto.html)
   - GET  /api/comentarios -> lista de opiniones publicadas
   - POST /api/comentarios -> registra una opinión con 1 a 5 estrellas
   La navegación muestra las opiniones por páginas (3, 2 o 1 según el ancho).
   ===================================================================== */
(function () {
  'use strict';

  const API = (window.Farma && Farma.config) ? Farma.config.API_URL : 'http://localhost:8081/api';
  const $ = (id) => document.getElementById(id);
  const esc = (texto) => (window.Farma && typeof Farma.esc === 'function')
    ? Farma.esc(texto)
    : String(texto ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  let opiniones = [];
  let pagina = 1;
  let porPagina = 3;
  let form = null;
  let errorCarga = false;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', iniciar);
  } else {
    iniciar();
  }

  function iniciar() {
    form = $('formOpinion');
    if (!form) return;

    porPagina = calcularPorPagina();
    prellenarNombre();
    actualizarContador();

    form.addEventListener('submit', enviar);
    $('opPrev').addEventListener('click', () => cambiarPagina(-1));
    $('opNext').addEventListener('click', () => cambiarPagina(1));
    $('opLista').addEventListener('click', (e) => {
      if (e.target.closest('#opReintentar')) cargarOpiniones();
    });
    $('opComentario').addEventListener('input', actualizarContador);
    $('opNombre').addEventListener('input', () => {
      if ($('opNombre').value.trim().length >= 2) {
        $('opNombre').classList.remove('is-invalid');
        $('opNombre').removeAttribute('aria-invalid');
      }
    });
    $('opComentario').addEventListener('input', () => {
      if ($('opComentario').value.trim().length >= 10) {
        $('opComentario').classList.remove('is-invalid');
        $('opComentario').removeAttribute('aria-invalid');
      }
    });
    form.querySelectorAll('input[name="opCalificacion"]').forEach((radio) => {
      radio.addEventListener('change', () => { $('opCalificacionError').hidden = true; });
    });

    // Al cambiar de tamaño cambia cuántas tarjetas entran por página.
    let temporizador;
    window.addEventListener('resize', () => {
      clearTimeout(temporizador);
      temporizador = setTimeout(() => {
        const nuevo = calcularPorPagina();
        if (nuevo === porPagina) return;
        porPagina = nuevo;
        renderizar();
      }, 150);
    });

    cargarOpiniones();
  }

  /* ---------- Datos ---------- */
  async function cargarOpiniones() {
    try {
      const res = await fetch(`${API}/comentarios`, { cache: 'no-store' });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error((json && json.error) || `No se pudieron cargar las opiniones (${res.status}).`);
      opiniones = (Array.isArray(json) ? json : []).map(normalizar).filter(Boolean);
      pagina = 1;
      errorCarga = false;
      ocultarAviso();
      renderizar();
    } catch (err) {
      opiniones = [];
      errorCarga = true;
      renderizar();
      mostrarAviso('No se pudieron cargar las opiniones. Verifica que el backend esté corriendo en el puerto 8081.');
    }
  }

  function normalizar(dato) {
    if (!dato || typeof dato !== 'object') return null;
    const nombre = String(dato.nombre ?? '').trim().slice(0, 100);
    const comentario = String(dato.comentario ?? '').trim().slice(0, 500);
    const calificacion = Math.round(Number(dato.calificacion));
    if (!nombre || !comentario || !Number.isFinite(calificacion) || calificacion < 1 || calificacion > 5) return null;
    return { id: dato.id, nombre, comentario, calificacion, fecha: dato.fecha };
  }

  /* ---------- Dibujo ---------- */
  function renderizar() {
    const totalPaginas = Math.max(1, Math.ceil(opiniones.length / porPagina));
    if (pagina > totalPaginas) pagina = totalPaginas;

    const inicio = (pagina - 1) * porPagina;
    const visibles = opiniones.slice(inicio, inicio + porPagina);
    const lista = $('opLista');

    if (!opiniones.length) {
      lista.innerHTML = errorCarga
        ? '<div class="col-12 text-center py-4"><p class="text-muted mb-2">No se pudieron cargar las opiniones.</p><button type="button" class="btn btn-outline-primary rounded-pill px-3" id="opReintentar"><i class="bi bi-arrow-clockwise me-1"></i>Reintentar</button></div>'
        : '<div class="col-12 text-center text-muted py-4">Todavía no hay opiniones publicadas. ¡Sé el primero en compartir tu experiencia!</div>';
    } else {
      lista.innerHTML = visibles.map(htmlOpinion).join('');
    }

    const nav = $('opNav');
    nav.classList.toggle('d-none', totalPaginas <= 1);
    $('opPagina').textContent = `Página ${pagina} de ${totalPaginas} · ${opiniones.length} ${opiniones.length === 1 ? 'opinión' : 'opiniones'}`;
    $('opPrev').disabled = pagina <= 1;
    $('opNext').disabled = pagina >= totalPaginas;

    actualizarPromedio();
  }

  function htmlOpinion(o) {
    const fecha = formatearFecha(o.fecha);
    return `
      <div class="col-md-6 col-lg-4">
        <article class="cto-opinion">
          <i class="bi bi-quote cto-opinion-comillas" aria-hidden="true"></i>
          <div class="cto-opinion-cabecera">
            ${estrellasHtml(o.calificacion, `${o.calificacion} de 5 estrellas`)}
            ${fecha ? `<time class="cto-opinion-fecha" datetime="${esc(o.fecha)}">${esc(fecha)}</time>` : ''}
          </div>
          <p>“${esc(o.comentario)}”</p>
          <div class="cto-opinion-autor">
            <span class="cto-avatar" aria-hidden="true">${esc(iniciales(o.nombre))}</span>
            <div>
              <strong>${esc(o.nombre)}</strong>
              <span>Cliente</span>
            </div>
          </div>
        </article>
      </div>`;
  }

  function actualizarPromedio() {
    const total = opiniones.length;
    const estrellas = $('opPromedioEstrellas');
    if (!total) {
      $('opPromedio').textContent = '—';
      estrellas.innerHTML = '';
      estrellas.setAttribute('aria-label', 'Sin calificaciones todavía');
      $('opTotal').textContent = errorCarga ? 'Opiniones no disponibles' : 'Sin opiniones por ahora';
      return;
    }
    const suma = opiniones.reduce((s, o) => s + o.calificacion, 0);
    const promedio = suma / total;
    $('opPromedio').textContent = promedio.toFixed(1);
    estrellas.innerHTML = iconosEstrellas(promedio);
    estrellas.setAttribute('aria-label', `Promedio ${promedio.toFixed(1)} de 5 estrellas`);
    $('opTotal').textContent = `de 5 · ${total} ${total === 1 ? 'opinión' : 'opiniones'}`;
  }

  function estrellasHtml(valor, etiqueta) {
    return `<span class="cto-estrellas" role="img" aria-label="${esc(etiqueta)}">${iconosEstrellas(valor)}</span>`;
  }

  function iconosEstrellas(valor) {
    const n = Number(valor) || 0;
    const llenas = Math.floor(n);
    const media = n - llenas >= 0.25 && n - llenas < 0.75;
    let html = '';
    for (let i = 1; i <= 5; i++) {
      const clase = i <= llenas ? 'bi-star-fill' : (i === llenas + 1 && media ? 'bi-star-half' : 'bi-star');
      html += `<i class="bi ${clase}"></i>`;
    }
    return html;
  }

  /* ---------- Navegación ---------- */
  function cambiarPagina(delta) {
    const totalPaginas = Math.max(1, Math.ceil(opiniones.length / porPagina));
    const nueva = Math.min(totalPaginas, Math.max(1, pagina + delta));
    if (nueva === pagina) return;
    pagina = nueva;
    renderizar();
    llevarALista();
  }

  function calcularPorPagina() {
    if (window.innerWidth >= 992) return 3;
    if (window.innerWidth >= 768) return 2;
    return 1;
  }

  function llevarALista() {
    const lista = $('opLista');
    if (!lista) return;
    const reducido = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    lista.scrollIntoView({ behavior: reducido ? 'auto' : 'smooth', block: 'start' });
  }

  /* ---------- Formulario ---------- */
  async function enviar(evento) {
    evento.preventDefault();
    if (!validarFormulario()) return;

    const boton = $('opEnviar');
    const textoOriginal = boton.innerHTML;
    const calificacion = form.querySelector('input[name="opCalificacion"]:checked');
    const datos = {
      nombre: $('opNombre').value.trim(),
      calificacion: Number(calificacion.value),
      comentario: $('opComentario').value.trim()
    };

    boton.disabled = true;
    boton.innerHTML = '<span class="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>Publicando…';
    ocultarAviso();

    try {
      const res = await fetch(`${API}/comentarios`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(datos)
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || `No se pudo publicar la opinión (${res.status}).`);

      const nueva = normalizar(json) || { ...datos, fecha: new Date().toISOString() };
      opiniones.unshift(nueva);
      errorCarga = false;
      pagina = 1;
      renderizar();
      form.reset();
      limpiarErrores();
      actualizarContador();
      avisoExito('¡Gracias! Tu opinión ya está publicada.');
      llevarALista();
    } catch (err) {
      mostrarAviso(err.message || 'No se pudo publicar la opinión. Inténtalo de nuevo.');
    } finally {
      boton.disabled = false;
      boton.innerHTML = textoOriginal;
    }
  }

  function validarFormulario() {
    let primero = null;

    const nombre = $('opNombre');
    const nombreOk = nombre.value.trim().length >= 2;
    nombre.classList.toggle('is-invalid', !nombreOk);
    nombre.setAttribute('aria-invalid', String(!nombreOk));
    if (!nombreOk) primero = nombre;

    const calificacion = form.querySelector('input[name="opCalificacion"]:checked');
    $('opCalificacionError').hidden = !!calificacion;
    if (!calificacion && !primero) primero = $('opEstrella1');

    const comentario = $('opComentario');
    const comentarioOk = comentario.value.trim().length >= 10;
    comentario.classList.toggle('is-invalid', !comentarioOk);
    comentario.setAttribute('aria-invalid', String(!comentarioOk));
    if (!comentarioOk && !primero) primero = comentario;

    if (primero) primero.focus();
    return !primero;
  }

  function limpiarErrores() {
    $('opNombre').classList.remove('is-invalid');
    $('opComentario').classList.remove('is-invalid');
    $('opNombre').removeAttribute('aria-invalid');
    $('opComentario').removeAttribute('aria-invalid');
    $('opCalificacionError').hidden = true;
  }

  function actualizarContador() {
    const campo = $('opComentario');
    if (campo) $('opContador').textContent = campo.value.length;
  }

  function prellenarNombre() {
    try {
      const sesion = (window.Farma && typeof Farma.leerSesion === 'function') ? Farma.leerSesion() : null;
      if (!sesion) return;
      const nombre = [sesion.nombre, sesion.apellido].filter(Boolean).join(' ').trim();
      if (nombre && !$('opNombre').value) $('opNombre').value = nombre;
    } catch (e) { /* sin sesión: el usuario escribe su nombre */ }
  }

  /* ---------- Avisos ---------- */
  function mostrarAviso(texto, tipo = 'warning') {
    const aviso = $('opAviso');
    aviso.className = `alert alert-${tipo} mb-4`;
    aviso.textContent = texto;
    aviso.classList.remove('d-none');
  }

  function ocultarAviso() {
    $('opAviso').classList.add('d-none');
  }

  function avisoExito(texto) {
    if (typeof mostrarAvisoEsquina === 'function') {
      mostrarAvisoEsquina(texto);
    } else {
      mostrarAviso(texto, 'success');
    }
  }

  /* ---------- Fechas e iniciales ---------- */
  function formatearFecha(valor) {
    if (!valor) return '';
    let fecha;
    if (Array.isArray(valor)) {
      fecha = new Date(valor[0], (valor[1] || 1) - 1, valor[2] || 1, valor[3] || 0, valor[4] || 0, valor[5] || 0);
    } else {
      // Algunos navegadores no aceptan más de 3 decimales de segundo.
      const texto = String(valor).replace(/(\.\d{3})\d+/, '$1').replace(' ', 'T');
      fecha = new Date(texto);
      if (Number.isNaN(fecha.getTime())) fecha = new Date(texto.slice(0, 19));
    }
    if (Number.isNaN(fecha.getTime())) return '';
    return fecha.toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  function iniciales(nombre) {
    const partes = String(nombre || '').trim().split(/\s+/).filter(Boolean);
    if (!partes.length) return '?';
    if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
    return (partes[0].charAt(0) + partes[1].charAt(0)).toUpperCase();
  }
})();
