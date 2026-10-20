document.addEventListener('DOMContentLoaded', () => {
  const authService = window.FarmaAuthService;
  const formatters = window.FarmaFormatters;

  // Si ya tiene sesión activa, redirigir
  if (authService && authService.isAuthenticated()) {
    const user = authService.getCurrentUser();
    window.location.replace(user.rol === 'ADMIN' ? 'admin.html' : 'index.html');
    return;
  }

  const loginForm = document.getElementById('loginForm');
  const loginError = document.getElementById('loginError');

  // Mostrar / ocultar contraseña
  const btnVerPass = document.getElementById('btnVerPass');
  const inputPassLogin = document.getElementById('loginContrasena');
  if (btnVerPass && inputPassLogin) {
    btnVerPass.addEventListener('click', () => {
      const mostrar = inputPassLogin.type === 'password';
      inputPassLogin.type = mostrar ? 'text' : 'password';
      btnVerPass.setAttribute('aria-pressed', String(mostrar));
      btnVerPass.setAttribute('aria-label', mostrar ? 'Ocultar contraseña' : 'Mostrar contraseña');
      btnVerPass.innerHTML = `<i class="bi ${mostrar ? 'bi-eye-slash' : 'bi-eye'}"></i>`;
      inputPassLogin.focus();
    });
  }

  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const form = e.target;
      const btn = form.querySelector('button[type="submit"]');
      const originalBtnText = btn.innerHTML;

      if (!form.checkValidity()) {
        form.classList.add('was-validated');
        return;
      }

      if (loginError) loginError.classList.add('d-none');
      btn.disabled = true;
      btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status"></span>Ingresando...';

      const correo = document.getElementById('loginCorreo').value.trim();
      const contrasena = document.getElementById('loginContrasena').value;

      try {
        const user = await authService.login(correo, contrasena);
        if (user.rol === 'ADMIN') {
          window.location.href = 'admin.html';
        } else {
          window.location.href = 'index.html';
        }
      } catch (err) {
        if (loginError) {
          loginError.textContent = err.message || 'Error al iniciar sesión';
          loginError.classList.remove('d-none');
        }
        btn.disabled = false;
        btn.innerHTML = originalBtnText;
      }
    });
  }

  // Registro
  const registroForm = document.getElementById('registroForm');
  const registroError = document.getElementById('registroError');

  if (registroForm) {
    registroForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = e.target.querySelector('button[type="submit"]');
      const originalBtnText = btn.innerHTML;

      if (registroError) registroError.classList.add('d-none');
      btn.disabled = true;
      btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status"></span>Creando...';

      const payload = {
        nombre: document.getElementById('regNombre').value.trim(),
        apellido: document.getElementById('regApellido').value.trim(),
        correo: document.getElementById('regCorreo').value.trim(),
        telefono: document.getElementById('regTelefono').value.trim(),
        contrasena: document.getElementById('regContrasena').value
      };

      try {
        await authService.register(payload);
        const modal = document.getElementById('registroModal');
        if (modal && window.bootstrap) {
          bootstrap.Modal.getOrCreateInstance(modal).hide();
        }
        registroForm.reset();

        const inputCorreo = document.getElementById('loginCorreo');
        const inputPass = document.getElementById('loginContrasena');
        if (inputCorreo) inputCorreo.value = payload.correo;
        if (inputPass) inputPass.focus();

        alert('¡Cuenta creada correctamente! Ahora puedes iniciar sesión.');
      } catch (err) {
        if (registroError) {
          registroError.textContent = err.message || 'Error al registrarse';
          registroError.classList.remove('d-none');
        }
      } finally {
        btn.disabled = false;
        btn.innerHTML = originalBtnText;
      }
    });
  }
});
