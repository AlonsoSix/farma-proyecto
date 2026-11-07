package com.farma.backend.controller;

import com.farma.backend.model.Producto;
import com.farma.backend.repository.ProductoRepository;
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
class ProductoControllerIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ProductoRepository productoRepository;

    @BeforeEach
    void setUp() {
        productoRepository.deleteAll();

        Producto p1 = new Producto();
        p1.setCodigo("FAR-0001");
        p1.setNombre("Paracetamol 500mg");
        p1.setPrecio(new BigDecimal("5.00"));
        p1.setStock(20);
        p1.setCategoria("Analgésicos");
        p1.setActivo(true);
        p1.setDescuento(0);
        productoRepository.save(p1);

        Producto p2 = new Producto();
        p2.setCodigo("FAR-0002");
        p2.setNombre("Amoxicilina 500mg");
        p2.setPrecio(new BigDecimal("15.00"));
        p2.setStock(15);
        p2.setCategoria("Antibióticos");
        p2.setActivo(false); // Inactivo
        p2.setDescuento(0);
        productoRepository.save(p2);
    }

    @Test
    @DisplayName("GET /api/productos debe responder 200 y listar únicamente productos activos")
    void debeListarProductosActivos() throws Exception {
        mockMvc.perform(get("/api/productos")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].codigo", is("FAR-0001")))
                .andExpect(jsonPath("$[0].activo", is(true)));
    }

    @Test
    @DisplayName("GET /api/productos/codigo/FAR-0001 debe responder 200 con el producto")
    void debeObtenerProductoPorCodigo() throws Exception {
        mockMvc.perform(get("/api/productos/codigo/FAR-0001"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.nombre", is("Paracetamol 500mg")));
    }

    @Test
    @DisplayName("GET /api/productos/codigo/FAR-9999 no existente debe responder 404 con mensaje JSON")
    void debeResponder404SiNoExiste() throws Exception {
        mockMvc.perform(get("/api/productos/codigo/FAR-9999"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error", containsString("No existe un producto con el código FAR-9999")));
    }
}
