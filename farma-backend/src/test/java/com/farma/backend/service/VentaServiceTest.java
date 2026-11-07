package com.farma.backend.service;

import com.farma.backend.dto.ResultadoPago;
import com.farma.backend.dto.VentaRequest;
import com.farma.backend.model.Producto;
import com.farma.backend.model.Venta;
import com.farma.backend.repository.ProductoRepository;
import com.farma.backend.repository.VentaRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class VentaServiceTest {

    @Mock
    private VentaRepository ventaRepository;

    @Mock
    private ProductoRepository productoRepository;

    @Mock
    private PasarelaPago pasarelaPago;

    private VentaService ventaService;

    @BeforeEach
    void setUp() {
        ventaService = new VentaService(ventaRepository, productoRepository, pasarelaPago);
    }

    private Producto productoMock(Integer id, String codigo, String nombre, BigDecimal precio, int stock, int descuento) {
        Producto p = new Producto();
        p.setId(id);
        p.setCodigo(codigo);
        p.setNombre(nombre);
        p.setPrecio(precio);
        p.setStock(stock);
        p.setDescuento(descuento);
        p.setActivo(true);
        p.setCategoria("Medicamentos");
        return p;
    }

    @Test
    @DisplayName("Debe registrar una venta calculando descuento, IGV, descontando stock y asignando correlativo B001-XXXX")
    void debeRegistrarVentaExitosamente() {
        Producto p1 = productoMock(1, "FAR-0001", "Paracetamol 500mg", new BigDecimal("10.00"), 50, 10); // precioFinal = 9.00
        Producto p2 = productoMock(2, "FAR-0002", "Ibuprofeno 400mg", new BigDecimal("20.00"), 30, 0);  // precioFinal = 20.00

        when(productoRepository.findById(1)).thenReturn(Optional.of(p1));
        when(productoRepository.findById(2)).thenReturn(Optional.of(p2));

        when(pasarelaPago.cobrar(anyString(), any(), any(), any(), any(), any()))
                .thenReturn(new ResultadoPago("APROBADO", "SIMULADO", "SIM-12345", null, null));

        when(ventaRepository.save(any(Venta.class))).thenAnswer(inv -> {
            Venta v = inv.getArgument(0);
            if (v.getId() == null) v.setId(5);
            return v;
        });

        VentaRequest req = new VentaRequest();
        req.setClienteNombre("Maria Rodriguez");
        req.setClienteDni("45891234");
        req.setClienteCorreo("maria@gmail.com");
        req.setMetodoPago("TARJETA");

        VentaRequest.Item item1 = new VentaRequest.Item();
        item1.setIdProducto(1);
        item1.setCantidad(2); // 2 * 9.00 = 18.00 (sin desc: 20.00)

        VentaRequest.Item item2 = new VentaRequest.Item();
        item2.setIdProducto(2);
        item2.setCantidad(1); // 1 * 20.00 = 20.00 (sin desc: 20.00)

        req.setItems(List.of(item1, item2));

        Venta venta = ventaService.registrar(req);

        assertNotNull(venta);
        assertEquals("B001-00000005", venta.getNumero());
        assertEquals(new BigDecimal("40.00"), venta.getSubtotalSinDescuento());
        assertEquals(new BigDecimal("38.00"), venta.getTotal());
        assertEquals(new BigDecimal("2.00"), venta.getDescuentoTotal());
        assertEquals("APROBADO", venta.getPagoEstado());

        // Verificar descuento de stock
        assertEquals(48, p1.getStock());
        assertEquals(29, p2.getStock());
        verify(productoRepository).save(p1);
        verify(productoRepository).save(p2);
    }

    @Test
    @DisplayName("Debe rechazar la venta si no hay stock suficiente para cubrir el pedido")
    void debeRechazarVentaPorStockInsuficiente() {
        Producto p = productoMock(1, "FAR-0001", "Alcohol en Gel", new BigDecimal("12.00"), 2, 0);
        when(productoRepository.findById(1)).thenReturn(Optional.of(p));

        VentaRequest req = new VentaRequest();
        req.setClienteNombre("Carlos Sanchez");
        req.setClienteDni("87654321");
        req.setMetodoPago("EFECTIVO");

        VentaRequest.Item item = new VentaRequest.Item();
        item.setIdProducto(1);
        item.setCantidad(5); // Solicita 5 pero solo hay 2
        req.setItems(List.of(item));

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> ventaService.registrar(req));
        assertTrue(ex.getMessage().contains("Solo quedan 2 unidades"));
        verify(pasarelaPago, never()).cobrar(any(), any(), any(), any(), any(), any());
    }

    @Test
    @DisplayName("Debe rechazar la venta si el DNI del cliente no contiene exactamente 8 dígitos")
    void debeRechazarDniInvalido() {
        VentaRequest req = new VentaRequest();
        req.setClienteNombre("Carlos Sanchez");
        req.setClienteDni("12345"); // Incompleto
        req.setMetodoPago("EFECTIVO");

        VentaRequest.Item item = new VentaRequest.Item();
        item.setIdProducto(1);
        item.setCantidad(1);
        req.setItems(List.of(item));

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> ventaService.registrar(req));
        assertTrue(ex.getMessage().contains("DNI debe tener 8 números"));
    }

    @Test
    @DisplayName("Si la pasarela rechaza el cobro, no se descuenta stock y se propaga la excepción")
    void debeRevertirSiPasarelaRechaza() {
        Producto p = productoMock(1, "FAR-0001", "Multivitamínico", new BigDecimal("50.00"), 10, 0);
        when(productoRepository.findById(1)).thenReturn(Optional.of(p));

        when(pasarelaPago.cobrar(any(), any(), any(), any(), any(), any()))
                .thenThrow(new PagoRechazadoException("Fondos insuficientes"));

        VentaRequest req = new VentaRequest();
        req.setClienteNombre("Jorge Luis");
        req.setClienteDni("11223344");
        req.setClienteCorreo("jorge@gmail.com");
        req.setMetodoPago("TARJETA");

        VentaRequest.Item item = new VentaRequest.Item();
        item.setIdProducto(1);
        item.setCantidad(1);
        req.setItems(List.of(item));

        assertThrows(PagoRechazadoException.class, () -> ventaService.registrar(req));

        // El stock no se debe haber tocado
        assertEquals(10, p.getStock());
        verify(productoRepository, never()).save(any());
        verify(ventaRepository, never()).save(any());
    }
}
