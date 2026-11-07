package com.farma.backend.service;

import com.farma.backend.dto.LoginRequest;
import com.farma.backend.dto.RegistroRequest;
import com.farma.backend.exception.CredencialesInvalidasException;
import com.farma.backend.model.Usuario;
import com.farma.backend.repository.UsuarioRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class UsuarioServiceTest {

    @Mock
    private UsuarioRepository usuarioRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    private UsuarioService usuarioService;

    @BeforeEach
    void setUp() {
        usuarioService = new UsuarioService(usuarioRepository, passwordEncoder);
    }

    @Test
    @DisplayName("Debe registrar un cliente nuevo con contraseña encriptada y rol CLIENTE")
    void debeRegistrarClienteExitosamente() {
        RegistroRequest req = new RegistroRequest();
        req.setNombre("Carlos");
        req.setApellido("Mendoza");
        req.setCorreo("carlos@gmail.com");
        req.setContrasena("claveSegura123");
        req.setTelefono("987654321");

        when(usuarioRepository.existsByCorreo("carlos@gmail.com")).thenReturn(false);
        when(passwordEncoder.encode("claveSegura123")).thenReturn("$2a$10$hashedPasswordMock");
        when(usuarioRepository.save(any(Usuario.class))).thenAnswer(invocation -> {
            Usuario u = invocation.getArgument(0);
            u.setId(10);
            return u;
        });

        Usuario resultado = usuarioService.registrar(req);

        assertNotNull(resultado);
        assertEquals(10, resultado.getId());
        assertEquals("Carlos", resultado.getNombre());
        assertEquals("carlos@gmail.com", resultado.getCorreo());
        assertEquals("$2a$10$hashedPasswordMock", resultado.getContrasena());
        assertEquals("CLIENTE", resultado.getRol());
        verify(usuarioRepository).save(any(Usuario.class));
    }

    @Test
    @DisplayName("Debe rechazar registro si el correo ya existe")
    void debeRechazarRegistroSiCorreoDuplicado() {
        RegistroRequest req = new RegistroRequest();
        req.setCorreo("existente@gmail.com");
        req.setContrasena("123456");

        when(usuarioRepository.existsByCorreo("existente@gmail.com")).thenReturn(true);

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> usuarioService.registrar(req));
        assertTrue(ex.getMessage().contains("Ya existe una cuenta con ese correo"));
        verify(usuarioRepository, never()).save(any());
    }

    @Test
    @DisplayName("Debe rechazar registro si la contraseña tiene menos de 6 caracteres")
    void debeRechazarPasswordCorto() {
        RegistroRequest req = new RegistroRequest();
        req.setCorreo("nuevo@gmail.com");
        req.setContrasena("12345");

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> usuarioService.registrar(req));
        assertTrue(ex.getMessage().contains("al menos 6 caracteres"));
    }

    @Test
    @DisplayName("Debe autenticar correctamente con credenciales válidas")
    void debeAutenticarExitosamente() {
        LoginRequest req = new LoginRequest();
        req.setCorreo("admin@farma.com");
        req.setContrasena("admin12345");

        Usuario usuario = new Usuario();
        usuario.setId(1);
        usuario.setCorreo("admin@farma.com");
        usuario.setContrasena("$2a$10$hash");
        usuario.setRol("ADMIN");

        when(usuarioRepository.findByCorreo("admin@farma.com")).thenReturn(Optional.of(usuario));
        when(passwordEncoder.matches("admin12345", "$2a$10$hash")).thenReturn(true);

        Usuario resultado = usuarioService.login(req);

        assertNotNull(resultado);
        assertEquals("ADMIN", resultado.getRol());
        assertEquals(1, resultado.getId());
    }

    @Test
    @DisplayName("Debe fallar login si la contraseña no coincide")
    void debeFallarLoginPasswordInvalido() {
        LoginRequest req = new LoginRequest();
        req.setCorreo("admin@farma.com");
        req.setContrasena("incorrecta");

        Usuario usuario = new Usuario();
        usuario.setCorreo("admin@farma.com");
        usuario.setContrasena("$2a$10$hash");

        when(usuarioRepository.findByCorreo("admin@farma.com")).thenReturn(Optional.of(usuario));
        when(passwordEncoder.matches("incorrecta", "$2a$10$hash")).thenReturn(false);

        assertThrows(CredencialesInvalidasException.class, () -> usuarioService.login(req));
    }
}
