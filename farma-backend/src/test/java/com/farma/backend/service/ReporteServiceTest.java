package com.farma.backend.service;

import com.farma.backend.model.Producto;
import com.farma.backend.repository.ProductoRepository;
import jakarta.persistence.EntityManager;
import jakarta.persistence.TypedQuery;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Collections;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ReporteServiceTest {

    @Mock
    private EntityManager em;

    @Mock
    private ProductoRepository productoRepository;

    @Mock
    private ProductoService productoService;

    @Mock
    private TypedQuery typedQueryObjArray;

    @Mock
    private TypedQuery typedQueryLong;

    private ReporteService reporteService;

    @BeforeEach
    void setUp() {
        reporteService = new ReporteService(em, productoRepository, productoService);
    }

    @Test
    @DisplayName("Debe rechazar la generación de reportes si la fecha 'desde' es posterior a 'hasta'")
    void debeRechazarFechasInvertidas() {
        LocalDate desde = LocalDate.of(2026, 12, 1);
        LocalDate hasta = LocalDate.of(2026, 1, 1);

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> reporteService.generar(desde, hasta, 1));
        assertTrue(ex.getMessage().contains("no puede ser mayor"));
    }

    @Test
    @DisplayName("Debe clasificar el inventario en alertas de stock bajo y agotados")
    void debeClasificarAlertasDeInventario() {
        Producto p1 = new Producto();
        p1.setCodigo("FAR-0001");
        p1.setNombre("Paracetamol");
        p1.setStock(0);
        p1.setPrecio(new BigDecimal("5.00"));
        p1.setActivo(true);

        Producto p2 = new Producto();
        p2.setCodigo("FAR-0002");
        p2.setNombre("Amoxicilina");
        p2.setStock(5);
        p2.setPrecio(new BigDecimal("10.00"));
        p2.setActivo(true);

        Producto p3 = new Producto();
        p3.setCodigo("FAR-0003");
        p3.setNombre("Vitamina C");
        p3.setStock(50);
        p3.setPrecio(new BigDecimal("20.00"));
        p3.setActivo(true);

        when(productoRepository.findAllByOrderByCodigoAsc()).thenReturn(List.of(p1, p2, p3));

        // Mocking EntityManager queries for resumen and report charts
        when(em.createQuery(anyString(), eq(Object[].class))).thenReturn(typedQueryObjArray);
        when(em.createQuery(anyString(), eq(Long.class))).thenReturn(typedQueryLong);

        when(typedQueryObjArray.setParameter(anyString(), any())).thenReturn(typedQueryObjArray);
        when(typedQueryLong.setParameter(anyString(), any())).thenReturn(typedQueryLong);

        when(typedQueryObjArray.getSingleResult()).thenReturn(new Object[]{1L, new BigDecimal("100.00"), BigDecimal.ZERO});
        when(typedQueryLong.getSingleResult()).thenReturn(10L);
        when(typedQueryObjArray.getResultList()).thenReturn(Collections.emptyList());
        when(typedQueryObjArray.setMaxResults(anyInt())).thenReturn(typedQueryObjArray);

        Map<String, Object> resultado = reporteService.generar(null, null, 1);

        assertNotNull(resultado);
        verify(productoService).verificarAdmin(1);

        @SuppressWarnings("unchecked")
        Map<String, Object> inv = (Map<String, Object>) resultado.get("inventario");
        assertEquals(3, inv.get("totalProductos"));
        assertEquals(1, inv.get("agotados"));
        assertEquals(1, inv.get("stockBajo"));
    }
}
