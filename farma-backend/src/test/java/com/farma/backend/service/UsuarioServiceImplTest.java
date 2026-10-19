package com.farma.backend.service;

import com.farma.backend.dto.UsuarioDTO;
import com.farma.backend.dto.UsuarioRequest;
import com.farma.backend.exception.BadRequestException;
import com.farma.backend.exception.DuplicateResourceException;
import com.farma.backend.exception.ResourceNotFoundException;
import com.farma.backend.model.Usuario;
import com.farma.backend.repository.UsuarioRepository;
import com.farma.backend.service.impl.UsuarioServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class UsuarioServiceImplTest {

    @Mock
    private UsuarioRepository usuarioRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private AuthService authService;

    @InjectMocks
    private UsuarioServiceImpl usuarioService;

    private Usuario usuarioMock;
    private UsuarioRequest usuarioRequest;

    @BeforeEach
    void setUp() {
        usuarioMock = new Usuario();
        usuarioMock.setId(1);
        usuarioMock.setNombre("Ana");
        usuarioMock.setApellido("Gomez");
        usuarioMock.setCorreo("ana@test.com");
        usuarioMock.setTelefono("987123456");
        usuarioMock.setRol("CLIENTE");

        usuarioRequest = new UsuarioRequest("Ana", "Gomez", "ana@test.com", "987123456", "CLIENTE", "secret123");
    }

    @Test
    @DisplayName("Debe listar todos los usuarios en formato DTO")
    void listarTodos_Exito() {
        when(usuarioRepository.findAll()).thenReturn(List.of(usuarioMock));

        List<UsuarioDTO> lista = usuarioService.listarTodos();
        assertNotNull(lista);
        assertEquals(1, lista.size());
        assertEquals("Ana", lista.get(0).getNombre());
    }

    @Test
    @DisplayName("Debe obtener un usuario por ID")
    void obtenerPorId_Exito() {
        when(usuarioRepository.findById(1)).thenReturn(Optional.of(usuarioMock));

        Optional<UsuarioDTO> opt = usuarioService.obtenerPorId(1);
        assertTrue(opt.isPresent());
        assertEquals("Ana", opt.get().getNombre());
    }

    @Test
    @DisplayName("Debe crear usuario por admin con contraseña encriptada")
    void crearPorAdmin_Exito() {
        when(usuarioRepository.existsByCorreo(anyString())).thenReturn(false);
        when(passwordEncoder.encode(anyString())).thenReturn("$2a$encoded");
        when(usuarioRepository.save(any(Usuario.class))).thenReturn(usuarioMock);

        UsuarioDTO creado = usuarioService.crearPorAdmin(usuarioRequest);
        assertNotNull(creado);
        assertEquals("Ana", creado.getNombre());
    }

    @Test
    @DisplayName("Debe lanzar DuplicateResourceException si el correo ya existe al crear por admin")
    void crearPorAdmin_CorreoDuplicado_LanzaExcepcion() {
        when(usuarioRepository.existsByCorreo("ana@test.com")).thenReturn(true);

        assertThrows(DuplicateResourceException.class, () -> usuarioService.crearPorAdmin(usuarioRequest));
    }

    @Test
    @DisplayName("Debe lanzar BadRequestException si la contraseña está vacía al crear por admin")
    void crearPorAdmin_ContrasenaVacia_LanzaExcepcion() {
        usuarioRequest.setContrasena("");

        assertThrows(BadRequestException.class, () -> usuarioService.crearPorAdmin(usuarioRequest));
    }

    @Test
    @DisplayName("Debe actualizar los datos de un usuario por admin")
    void actualizarPorAdmin_Exito() {
        when(usuarioRepository.findById(1)).thenReturn(Optional.of(usuarioMock));
        when(usuarioRepository.save(any(Usuario.class))).thenAnswer(i -> i.getArgument(0));

        UsuarioRequest update = new UsuarioRequest("Ana Maria", "Gomez", "ana@test.com", "999999999", "ADMIN", null);
        UsuarioDTO actualizado = usuarioService.actualizarPorAdmin(1, update);

        assertNotNull(actualizado);
        assertEquals("Ana Maria", actualizado.getNombre());
        assertEquals("ADMIN", actualizado.getRol());
    }

    @Test
    @DisplayName("Debe eliminar un usuario existente")
    void eliminarUsuario_Exito() {
        when(usuarioRepository.findById(1)).thenReturn(Optional.of(usuarioMock));
        doNothing().when(usuarioRepository).delete(usuarioMock);

        assertDoesNotThrow(() -> usuarioService.eliminarUsuario(1));
        verify(usuarioRepository, times(1)).delete(usuarioMock);
    }

    @Test
    @DisplayName("Debe lanzar ResourceNotFoundException al intentar eliminar un usuario inexistente")
    void eliminarUsuario_NoExiste_LanzaExcepcion() {
        when(usuarioRepository.findById(99)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> usuarioService.eliminarUsuario(99));
    }
}
