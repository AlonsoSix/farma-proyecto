package com.farma.backend.service;

import com.farma.backend.dto.ProductoRequest;
import com.farma.backend.model.Producto;
import com.farma.backend.model.Usuario;
import com.farma.backend.repository.ProductoRepository;
import com.farma.backend.repository.UsuarioRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;
import java.util.NoSuchElementException;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ProductoServiceTest {

    @Mock
    private ProductoRepository productoRepository;

    @Mock
    private UsuarioRepository usuarioRepository;

    private ProductoService productoService;

    @BeforeEach
    void setUp() {
        productoService = new ProductoService(productoRepository, usuarioRepository);
    }

    private Usuario mockAdmin() {
        Usuario admin = new Usuario();
        admin.setId(1);
        admin.setRol("ADMIN");
        return admin;
    }

    @Test
    @DisplayName("La tienda debe listar únicamente productos que estén activos")
    void debeListarSoloProductosActivos() {
        Producto p = new Producto();
        p.setCodigo("FAR-0001");
        p.setNombre("Paracetamol 500mg");
        p.setActivo(true);

        when(productoRepository.findByActivoTrueOrderByCodigoAsc()).thenReturn(List.of(p));

        List<Producto> lista = productoService.listar();

        assertEquals(1, lista.size());
        assertEquals("FAR-0001", lista.get(0).getCodigo());
        verify(productoRepository).findByActivoTrueOrderByCodigoAsc();
    }

    @Test
    @DisplayName("Debe permitir listar todos los productos al administrador")
    void debeListarTodosSiEsAdmin() {
        when(usuarioRepository.findById(1)).thenReturn(Optional.of(mockAdmin()));
        when(productoRepository.findAllByOrderByCodigoAsc()).thenReturn(List.of(new Producto(), new Producto()));

        List<Producto> resultado = productoService.listarTodos(1);

        assertEquals(2, resultado.size());
    }

    @Test
    @DisplayName("Debe rechazar acción administrativa si el usuario no es ADMIN")
    void debeRechazarSiNoEsAdmin() {
        Usuario cliente = new Usuario();
        cliente.setId(2);
        cliente.setRol("CLIENTE");

        when(usuarioRepository.findById(2)).thenReturn(Optional.of(cliente));

        SecurityException ex = assertThrows(SecurityException.class,
                () -> productoService.listarTodos(2));
        assertTrue(ex.getMessage().contains("No tienes permisos de administrador"));
    }

    @Test
    @DisplayName("Debe autogenerar el código siguiente consecutivo al registrar un producto")
    void debeGenerarCodigoConsecutivo() {
        when(usuarioRepository.findById(1)).thenReturn(Optional.of(mockAdmin()));

        Producto ultimo = new Producto();
        ultimo.setCodigo("FAR-0020");
        when(productoRepository.findTopByOrderByCodigoDesc()).thenReturn(Optional.of(ultimo));
        when(productoRepository.save(any(Producto.class))).thenAnswer(i -> i.getArgument(0));

        ProductoRequest req = new ProductoRequest();
        req.setNombre("Amoxicilina 500mg");
        req.setPrecio(new BigDecimal("15.50"));
        req.setStock(20);
        req.setCategoria("Antibióticos");
        req.setDescuento(10);

        Producto guardado = productoService.registrar(req, 1);

        assertNotNull(guardado);
        assertEquals("FAR-0021", guardado.getCodigo());
        assertEquals("Amoxicilina 500mg", guardado.getNombre());
        assertEquals(10, guardado.getDescuento());
    }

    @Test
    @DisplayName("Debe rechazar producto con descuento inválido (fuera del rango 5% a 90%)")
    void debeRechazarDescuentoInvalido() {
        when(usuarioRepository.findById(1)).thenReturn(Optional.of(mockAdmin()));

        ProductoRequest req = new ProductoRequest();
        req.setNombre("Jarabe para la tos");
        req.setPrecio(new BigDecimal("22.00"));
        req.setStock(10);
        req.setCategoria("Jarabes");
        req.setDescuento(3); // Descuento menor al mínimo permitido (5%)

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> productoService.registrar(req, 1));
        assertTrue(ex.getMessage().contains("entre 5% y 90%"));
    }

    @Test
    @DisplayName("Debe buscar producto por código")
    void debeBuscarPorCodigo() {
        Producto p = new Producto();
        p.setCodigo("FAR-0005");
        p.setNombre("Ibuprofeno 400mg");

        when(productoRepository.findByCodigoIgnoreCase("far-0005")).thenReturn(Optional.of(p));

        Producto encontrado = productoService.buscarPorCodigo("far-0005");
        assertEquals("FAR-0005", encontrado.getCodigo());
        assertEquals("Ibuprofeno 400mg", encontrado.getNombre());
    }

    @Test
    @DisplayName("Debe lanzar NoSuchElementException cuando el código no existe")
    void debeLanzarExcepcionSiCodigoNoExiste() {
        when(productoRepository.findByCodigoIgnoreCase("FAR-9999")).thenReturn(Optional.empty());

        assertThrows(NoSuchElementException.class,
                () -> productoService.buscarPorCodigo("FAR-9999"));
    }
}
