/* =====================================================================
   Confirmación por correo (contacto.html)
   - Rellena el campo con el correo de la sesión activa, si existe.
   - POST /api/correos/confirmacion envía el mensaje; si falla abre un mailto.
   - Usa un alert de Bootstrap en la misma tarjeta: sin alert()/confirm().
   ===================================================================== */
(function () {
  'use strict';

  const API_URL = (window.Farma && Farma.config) ? Farma.config.API_URL : '/api';

  function iniciar() {
    const form = document.getElementById('formCorreoConfirmacion');
    if (!form) return;

    const input = document.getElementById('correoConfirmacion');
    const boton = document.getElementById('btnEnviarCorreo');
    const aviso = document.getElementById('correoAviso');
    if (!input || !boton || !aviso) return;

    const sesion = (window.Farma && typeof Farma.leerSesion === 'function')
      ? Farma.leerSesion()
      : null;
    if (sesion && sesion.correo) input.value = sesion.correo;

    input.addEventListener('input', () => aviso.classList.add('d-none'));
    form.addEventListener('submit', enviar);

    async function enviar(e) {
      e.preventDefault();
      aviso.classList.add('d-none');
      form.classList.remove('was-validated');

      const correo = input.value.trim();
      const valido = (window.Farma && typeof Farma.esCorreoValido === 'function')
        ? Farma.esCorreoValido(correo)
        : /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo);

      if (!valido || correo.length > 150) {
        form.classList.add('was-validated');
        input.focus();
        return;
      }

      const textoOriginal = boton.innerHTML;
      boton.disabled = true;
      boton.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Enviando...';

      try {
        const res = await fetch(`${API_URL}/correos/confirmacion`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ correo: correo })
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || 'No se pudo enviar el correo.');

        const confirmacion = '¡Gracias por escribirnos! Te responderemos pronto.';
        mostrar(data.mensaje || confirmacion, data.modo === 'ENVIADO' ? 'success' : 'info');

        // Si el servidor no pudo entregar, abre la app de correo con todo listo.
        if (data.modo === 'MANUAL' && data.mailto) {
          location.href = data.mailto;
        }
      } catch (err) {
        mostrar(err.message === 'Failed to fetch'
          ? 'No se pudo conectar con el servidor. Verifica que el backend esté corriendo.'
          : (err.message || 'No se pudo enviar el correo.'), 'danger');
      } finally {
        boton.disabled = false;
        boton.innerHTML = textoOriginal;
      }
    }

    function mostrar(texto, tipo) {
      aviso.className = 'alert mt-3 alert-' + tipo;
      aviso.textContent = texto;
      aviso.classList.remove('d-none');
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', iniciar);
  } else {
    iniciar();
  }
})();
