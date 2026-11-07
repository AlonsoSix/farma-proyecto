package com.farma.backend.controller;

import com.farma.backend.model.Producto;
import com.farma.backend.repository.ProductoRepository;
import com.farma.backend.repository.VentaRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
class VentaControllerIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ProductoRepository productoRepository;

    @Autowired
    private VentaRepository ventaRepository;

    private Integer idProducto;

    @BeforeEach
    void setUp() {
        ventaRepository.deleteAll();
        productoRepository.deleteAll();

        Producto p = new Producto();
        p.setCodigo("FAR-0010");
        p.setNombre("Vitamina C 1000mg");
        p.setPrecio(new BigDecimal("30.00"));
        p.setStock(50);
        p.setCategoria("Vitaminas");
        p.setActivo(true);
        p.setDescuento(10); // 10% descuento -> 27.00
        p = productoRepository.save(p);
        idProducto = p.getId();
    }

    @Test
    @DisplayName("POST /api/ventas registra compra, responde 201 Created y descuenta stock")
    void debeRegistrarVenta() throws Exception {
        String jsonBody = String.format("""
                {
                    "clienteNombre": "Raul Castro",
                    "clienteDni": "71829304",
                    "clienteCorreo": "raul@gmail.com",
                    "metodoPago": "EFECTIVO",
                    "items": [
                        {
                            "idProducto": %d,
                            "cantidad": 2
                        }
                    ]
                }
                """, idProducto);

        mockMvc.perform(post("/api/ventas")
                .contentType(MediaType.APPLICATION_JSON)
                .content(jsonBody))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.numero", startsWith("B001-")))
                .andExpect(jsonPath("$.total", is(54.00)))
                .andExpect(jsonPath("$.clienteNombre", is("Raul Castro")))
                .andExpect(jsonPath("$.pagoEstado", is("PENDIENTE")));

        // Verificar que el stock en la base de datos se redujo de 50 a 48
        Producto actualizado = productoRepository.findById(idProducto).orElseThrow();
        org.junit.jupiter.api.Assertions.assertEquals(48, actualizado.getStock());
    }

    @Test
    @DisplayName("POST /api/ventas con carrito vacío responde 400 Bad Request")
    void debeRechazarCarritoVacio() throws Exception {
        String jsonBody = """
                {
                    "clienteNombre": "Raul Castro",
                    "clienteDni": "71829304",
                    "metodoPago": "EFECTIVO",
                    "items": []
                }
                """;

        mockMvc.perform(post("/api/ventas")
                .contentType(MediaType.APPLICATION_JSON)
                .content(jsonBody))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error", containsString("Tu carrito está vacío")));
    }
}
