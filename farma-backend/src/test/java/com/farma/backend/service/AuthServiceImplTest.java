package com.farma.backend.service;

import com.farma.backend.dto.LoginRequest;
import com.farma.backend.dto.RegistroRequest;
import com.farma.backend.exception.DuplicateResourceException;
import com.farma.backend.exception.UnauthorizedException;
import com.farma.backend.model.Usuario;
import com.farma.backend.repository.UsuarioRepository;
import com.farma.backend.service.impl.AuthServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuthServiceImplTest {

    @Mock
    private UsuarioRepository usuarioRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @InjectMocks
    private AuthServiceImpl authService;

    private RegistroRequest registroRequest;
    private LoginRequest loginRequest;
    private Usuario usuarioMock;

    @BeforeEach
    void setUp() {
        registroRequest = new RegistroRequest("Carlos", "Perez", "carlos@test.com", "123456", "999888777");
        loginRequest = new LoginRequest("carlos@test.com", "123456");

        usuarioMock = new Usuario();
        usuarioMock.setId(1);
        usuarioMock.setNombre("Carlos");
        usuarioMock.setApellido("Perez");
        usuarioMock.setCorreo("carlos@test.com");
        usuarioMock.setContrasena("$2a$10$encodedPassword");
        usuarioMock.setRol("CLIENTE");
    }

    @Test
    @DisplayName("Debe registrar un nuevo usuario exitosamente")
    void registrar_Exito() {
        when(usuarioRepository.existsByCorreo(anyString())).thenReturn(false);
        when(passwordEncoder.encode(anyString())).thenReturn("$2a$10$encodedPassword");
        when(usuarioRepository.save(any(Usuario.class))).thenReturn(usuarioMock);

        Usuario resultado = authService.registrar(registroRequest);

        assertNotNull(resultado);
        assertEquals("Carlos", resultado.getNombre());
        assertEquals("carlos@test.com", resultado.getCorreo());
        assertEquals("CLIENTE", resultado.getRol());
        verify(usuarioRepository, times(1)).save(any(Usuario.class));
    }

    @Test
    @DisplayName("Debe lanzar DuplicateResourceException cuando el correo ya existe")
    void registrar_CorreoDuplicado_LanzaExcepcion() {
        when(usuarioRepository.existsByCorreo("carlos@test.com")).thenReturn(true);

        assertThrows(DuplicateResourceException.class, () -> authService.registrar(registroRequest));
        verify(usuarioRepository, never()).save(any(Usuario.class));
    }

    @Test
    @DisplayName("Debe autenticar un usuario exitosamente con credenciales válidas")
    void login_Exito() {
        when(usuarioRepository.findByCorreo("carlos@test.com")).thenReturn(Optional.of(usuarioMock));
        when(passwordEncoder.matches("123456", usuarioMock.getContrasena())).thenReturn(true);

        Usuario resultado = authService.login(loginRequest);

        assertNotNull(resultado);
        assertEquals(usuarioMock.getId(), resultado.getId());
        assertEquals(usuarioMock.getCorreo(), resultado.getCorreo());
    }

    @Test
    @DisplayName("Debe lanzar UnauthorizedException cuando el usuario no existe")
    void login_UsuarioNoEncontrado_LanzaExcepcion() {
        when(usuarioRepository.findByCorreo("carlos@test.com")).thenReturn(Optional.empty());

        assertThrows(UnauthorizedException.class, () -> authService.login(loginRequest));
    }

    @Test
    @DisplayName("Debe lanzar UnauthorizedException cuando la contraseña es incorrecta")
    void login_ContrasenaIncorrecta_LanzaExcepcion() {
        when(usuarioRepository.findByCorreo("carlos@test.com")).thenReturn(Optional.of(usuarioMock));
        when(passwordEncoder.matches("123456", usuarioMock.getContrasena())).thenReturn(false);

        assertThrows(UnauthorizedException.class, () -> authService.login(loginRequest));
    }
}
