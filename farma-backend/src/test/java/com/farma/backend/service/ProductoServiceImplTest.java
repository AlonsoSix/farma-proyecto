package com.farma.backend.service;

import com.farma.backend.dto.ProductoRequest;
import com.farma.backend.exception.BadRequestException;
import com.farma.backend.exception.ResourceNotFoundException;
import com.farma.backend.model.Producto;
import com.farma.backend.repository.ProductoRepository;
import com.farma.backend.service.impl.ProductoServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ProductoServiceImplTest {

    @Mock
    private ProductoRepository productoRepository;

    @InjectMocks
    private ProductoServiceImpl productoService;

    private Producto productoMock;
    private ProductoRequest productoRequest;

    @BeforeEach
    void setUp() {
        productoMock = new Producto();
        productoMock.setId(1);
        productoMock.setNombre("Paracetamol 500mg");
        productoMock.setDescripcion("Analgésico");
        productoMock.setPrecio(new BigDecimal("8.50"));
        productoMock.setCategoria("Medicamentos");
        productoMock.setStock(50);

        productoRequest = new ProductoRequest(
                "Paracetamol 500mg",
                "Analgésico",
                new BigDecimal("8.50"),
                "Medicamentos",
                "/img/paracetamol.jpg",
                50
        );
    }

    @Test
    @DisplayName("Debe listar todos los productos")
    void listarTodos_Exito() {
        when(productoRepository.findAll()).thenReturn(List.of(productoMock));

        List<Producto> lista = productoService.listarTodos();

        assertNotNull(lista);
        assertEquals(1, lista.size());
        assertEquals("Paracetamol 500mg", lista.get(0).getNombre());
    }

    @Test
    @DisplayName("Debe obtener un producto por ID existente")
    void obtenerPorId_Exito() {
        when(productoRepository.findById(1)).thenReturn(Optional.of(productoMock));

        Producto res = productoService.obtenerPorId(1);

        assertNotNull(res);
        assertEquals(1, res.getId());
        assertEquals("Paracetamol 500mg", res.getNombre());
    }

    @Test
    @DisplayName("Debe lanzar ResourceNotFoundException si el ID no existe")
    void obtenerPorId_NoExiste_LanzaExcepcion() {
        when(productoRepository.findById(99)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> productoService.obtenerPorId(99));
    }

    @Test
    @DisplayName("Debe crear un producto correctamente")
    void crear_Exito() {
        when(productoRepository.save(any(Producto.class))).thenReturn(productoMock);

        Producto creado = productoService.crear(productoRequest);

        assertNotNull(creado);
        assertEquals("Paracetamol 500mg", creado.getNombre());
        verify(productoRepository, times(1)).save(any(Producto.class));
    }

    @Test
    @DisplayName("Debe lanzar BadRequestException si el nombre del producto es nulo o vacío")
    void crear_NombreInvalido_LanzaExcepcion() {
        productoRequest.setNombre("");

        assertThrows(BadRequestException.class, () -> productoService.crear(productoRequest));
        verify(productoRepository, never()).save(any(Producto.class));
    }

    @Test
    @DisplayName("Debe lanzar BadRequestException si el precio es negativo")
    void crear_PrecioNegativo_LanzaExcepcion() {
        productoRequest.setPrecio(new BigDecimal("-5.00"));

        assertThrows(BadRequestException.class, () -> productoService.crear(productoRequest));
        verify(productoRepository, never()).save(any(Producto.class));
    }

    @Test
    @DisplayName("Debe actualizar un producto existente")
    void actualizar_Exito() {
        when(productoRepository.findById(1)).thenReturn(Optional.of(productoMock));
        when(productoRepository.save(any(Producto.class))).thenAnswer(invocation -> invocation.getArgument(0));

        ProductoRequest updateReq = new ProductoRequest(
                "Paracetamol Forte",
                "Nueva desc",
                new BigDecimal("12.00"),
                "Medicamentos",
                null,
                100
        );

        Producto actualizado = productoService.actualizar(1, updateReq);

        assertNotNull(actualizado);
        assertEquals("Paracetamol Forte", actualizado.getNombre());
        assertEquals(new BigDecimal("12.00"), actualizado.getPrecio());
        assertEquals(100, actualizado.getStock());
    }

    @Test
    @DisplayName("Debe eliminar un producto existente")
    void eliminar_Exito() {
        when(productoRepository.findById(1)).thenReturn(Optional.of(productoMock));
        doNothing().when(productoRepository).delete(productoMock);

        assertDoesNotThrow(() -> productoService.eliminar(1));
        verify(productoRepository, times(1)).delete(productoMock);
    }
}
