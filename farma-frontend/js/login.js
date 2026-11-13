/* =====================================================================
   Pantalla de acceso (login.html)
   - Iniciar sesión y crear cuenta en una sola página.
   - Guarda la sesión en localStorage (farma_sesion) y vuelve a la página
     que el usuario quería ver (?next=...).
   - Sin alert()/confirm(): los mensajes se muestran en la misma tarjeta.
   ===================================================================== */

const API_URL = (window.Farma && Farma.config) ? Farma.config.API_URL : 'http://localhost:8081/api';
const CLAVE_SESION = (window.Farma && Farma.config) ? Farma.config.CLAVE_SESION : 'farma_sesion';
const CLAVE_ULTIMO_CORREO = (window.Farma && Farma.config) ? Farma.config.CLAVE_ULTIMO_CORREO : 'farma_ultimo_correo';

const $ = (id) => document.getElementById(id);

document.addEventListener('DOMContentLoaded', () => {
  // Si ya hay una sesión, no tiene sentido mostrar el login otra vez.
  const sesion = leerSesion();
  if (sesion && sesion.id != null) {
    location.replace(destinoSeguro(parametro('next'), sesion.rol));
    return;
  }

  if (parametro('salir') === '1') {
    mostrarAviso('Cerraste sesión correctamente. Vuelve a ingresar para continuar.', 'exito');
  }
  if (parametro('registro') === '1') cambiarPestana('registro');

  const ultimoCorreo = leerTexto(CLAVE_ULTIMO_CORREO);
  if (ultimoCorreo) $('loginCorreo').value = ultimoCorreo;

  $('formLogin').addEventListener('submit', manejarLogin);
  $('formRegistro').addEventListener('submit', manejarRegistro);
  $('btnVerContrasena').addEventListener('click', () => alternarContrasena('loginContrasena', 'btnVerContrasena'));
  $('btnVerContrasenaReg').addEventListener('click', () => alternarContrasena('regContrasena', 'btnVerContrasenaReg'));
  $('btnIrRegistro').addEventListener('click', () => cambiarPestana('registro'));
  $('btnIrLogin').addEventListener('click', () => cambiarPestana('login'));
  // Pestañas de arriba (faltaba conectarlas)
  $('tabLogin').addEventListener('click', () => cambiarPestana('login'));
  $('tabRegistro').addEventListener('click', () => cambiarPestana('registro'));
  $('btnUsarDemo').addEventListener('click', () => {
    $('loginCorreo').value = 'admin@farma.com';
    $('loginContrasena').value = 'admin12345';
    $('loginContrasena').focus();
    mostrarAviso('Credenciales de administrador cargadas. Pulsa "Ingresar".', 'info');
  });

  // Al escribir de nuevo, se oculta el aviso anterior y se validan contraseñas.
  document.querySelectorAll('#formLogin input, #formRegistro input').forEach((input) => {
    input.addEventListener('input', ocultarAviso);
  });

  const validarContrasenas = () => {
    const c1 = $('regContrasena');
    const c2 = $('regContrasena2');
    const f2 = $('feedbackContrasena2');
    if (!c1 || !c2) return;

    if (c2.value && c1.value !== c2.value) {
      c2.setCustomValidity('Las contraseñas no coinciden.');
      if (f2) f2.textContent = 'Las contraseñas deben coincidir.';
    } else if (c2.value && c2.value.length < 8) {
      c2.setCustomValidity('Usa al menos 8 caracteres.');
      if (f2) f2.textContent = 'Usa al menos 8 caracteres.';
    } else {
      c2.setCustomValidity('');
    }
  };

  $('regContrasena')?.addEventListener('input', validarContrasenas);
  $('regContrasena2')?.addEventListener('input', validarContrasenas);
});

/* ---------- Iniciar sesión ---------- */
async function manejarLogin(e) {
  e.preventDefault();
  ocultarAviso();

  const form = $('formLogin');
  if (!form.checkValidity()) {
    form.classList.add('was-validated');
    form.querySelector(':invalid')?.focus();
    return;
  }

  const boton = $('btnLogin');
  const textoOriginal = boton.innerHTML;
  boton.disabled = true;
  boton.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Ingresando...';

  try {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        correo: $('loginCorreo').value.trim(),
        contrasena: $('loginContrasena').value
      })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Correo o contraseña incorrectos.');

    const sesion = {
      id: data.id,
      nombre: data.nombre || '',
      apellido: data.apellido || '',
      correo: data.correo || $('loginCorreo').value.trim(),
      rol: data.rol || 'CLIENTE'
    };
    guardarSesion(sesion);
    guardarTexto(CLAVE_ULTIMO_CORREO, sesion.correo);

    mostrarAviso(`Bienvenido${sesion.nombre ? ', ' + sesion.nombre : ''}. Redirigiendo...`, 'exito');
    const destino = destinoSeguro(parametro('next'), sesion.rol);
    setTimeout(() => location.replace(destino), 450);
  } catch (err) {
    mostrarAviso(err.message === 'Failed to fetch'
      ? 'No se pudo conectar con el servidor. Verifica que el backend esté corriendo en el puerto 8081.'
      : err.message, 'error');
    $('loginContrasena').focus();
  } finally {
    boton.disabled = false;
    boton.innerHTML = textoOriginal;
  }
}

/* ---------- Crear cuenta ---------- */
async function manejarRegistro(e) {
  e.preventDefault();
  ocultarAviso();

  const form = $('formRegistro');
  const contrasena = $('regContrasena').value;
  const repetida = $('regContrasena2').value;
  const f2 = $('feedbackContrasena2');

  if (contrasena !== repetida) {
    $('regContrasena2').setCustomValidity('Las contraseñas no coinciden.');
    if (f2) f2.textContent = 'Las contraseñas deben coincidir.';
    form.classList.add('was-validated');
    $('regContrasena2').focus();
    return;
  } else if (repetida.length < 8) {
    $('regContrasena2').setCustomValidity('Usa al menos 8 caracteres.');
    if (f2) f2.textContent = 'Usa al menos 8 caracteres.';
  } else {
    $('regContrasena2').setCustomValidity('');
  }

  if (!form.checkValidity()) {
    form.classList.add('was-validated');
    form.querySelector(':invalid')?.focus();
    return;
  }

  const boton = $('btnRegistro');
  const textoOriginal = boton.innerHTML;
  boton.disabled = true;
  boton.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Creando cuenta...';

  try {
    const res = await fetch(`${API_URL}/auth/registro`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nombre: $('regNombre').value.trim(),
        apellido: $('regApellido').value.trim(),
        correo: $('regCorreo').value.trim(),
        telefono: $('regTelefono').value.trim(),
        contrasena
      })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'No se pudo crear la cuenta.');

    const correo = $('regCorreo').value.trim();
    form.reset();
    form.classList.remove('was-validated');
    $('loginCorreo').value = correo;
    $('loginContrasena').value = '';
    cambiarPestana('login');
    mostrarAviso('¡Cuenta creada correctamente! Ya puedes ingresar con tu correo y contraseña.', 'exito');
    $('loginContrasena').focus();
  } catch (err) {
    mostrarAviso(err.message === 'Failed to fetch'
      ? 'No se pudo conectar con el servidor. Verifica que el backend esté corriendo en el puerto 8081.'
      : err.message, 'error');
  } finally {
    boton.disabled = false;
    boton.innerHTML = textoOriginal;
  }
}

/* ---------- Utilidades ---------- */
function leerSesion() {
  try { return JSON.parse(localStorage.getItem(CLAVE_SESION)); } catch (e) { return null; }
}
function guardarSesion(sesion) {
  try { localStorage.setItem(CLAVE_SESION, JSON.stringify(sesion)); } catch (e) { /* sin almacenamiento */ }
}
function leerTexto(clave) {
  try { return localStorage.getItem(clave); } catch (e) { return null; }
}
function guardarTexto(clave, valor) {
  try { localStorage.setItem(clave, valor); } catch (e) { /* sin almacenamiento */ }
}
function parametro(nombre) {
  return new URLSearchParams(location.search).get(nombre);
}

// Solo se permite volver a una página interna; nunca a un dominio externo.
function destinoSeguro(next, rol) {
  const esAdmin = String(rol || '').toUpperCase() === 'ADMIN';
  const porDefecto = esAdmin ? 'admin.html' : 'index.html';
  if (!next) return porDefecto;
  const destino = String(next).trim();
  if (!/^[a-z0-9_.-]+\.html(\?[^#]*)?(#.*)?$/i.test(destino)) return porDefecto;
  if (/^login\.html/i.test(destino)) return porDefecto;
  if (!esAdmin && /^(admin|reportes)\.html/i.test(destino)) return porDefecto;
  return destino;
}

function cambiarPestana(cual) {
  const esLogin = cual === 'login';
  $('paneLogin').classList.toggle('d-none', !esLogin);
  $('paneRegistro').classList.toggle('d-none', esLogin);
  $('tabLogin').classList.toggle('activo', esLogin);
  $('tabRegistro').classList.toggle('activo', !esLogin);
  $('tabLogin').setAttribute('aria-selected', esLogin ? 'true' : 'false');
  $('tabRegistro').setAttribute('aria-selected', esLogin ? 'false' : 'true');
  ocultarAviso();
  document.querySelector('.login-card')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function alternarContrasena(idInput, idBoton) {
  const input = $(idInput);
  const boton = $(idBoton);
  const visible = input.type === 'text';
  input.type = visible ? 'password' : 'text';
  boton.innerHTML = visible ? '<i class="bi bi-eye"></i>' : '<i class="bi bi-eye-slash"></i>';
  boton.setAttribute('aria-label', visible ? 'Mostrar contraseña' : 'Ocultar contraseña');
  input.focus();
}

let temporizadorAviso;
function mostrarAviso(texto, tipo = 'error') {
  const caja = $('loginAviso');
  const icono = tipo === 'exito' ? 'check-circle-fill' : tipo === 'info' ? 'info-circle-fill' : 'exclamation-triangle-fill';
  caja.className = `alert alert-${tipo === 'exito' ? 'success' : tipo === 'info' ? 'info' : 'danger'} d-flex align-items-start gap-2`;
  caja.innerHTML = `<i class="bi bi-${icono} mt-1"></i><div>${escapar(texto)}</div>`;
  caja.classList.remove('d-none');
  clearTimeout(temporizadorAviso);
  if (tipo === 'exito') temporizadorAviso = setTimeout(ocultarAviso, 6000);
}
function ocultarAviso() {
  const caja = $('loginAviso');
  if (!caja) return;
  caja.classList.add('d-none');
  caja.innerHTML = '';
}
function escapar(texto) {
  return String(texto ?? '').replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}
