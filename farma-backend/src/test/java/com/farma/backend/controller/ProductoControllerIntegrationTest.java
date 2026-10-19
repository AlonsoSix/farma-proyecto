package com.farma.backend.controller;

import tools.jackson.databind.ObjectMapper;
import com.farma.backend.dto.ProductoRequest;
import com.farma.backend.model.Producto;
import com.farma.backend.repository.ProductoRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class ProductoControllerIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ProductoRepository productoRepository;

    private ObjectMapper objectMapper;

    @BeforeEach
    void setUp() {
        objectMapper = new ObjectMapper();
        productoRepository.deleteAll();
    }

    @Test
    @DisplayName("Integración: Crear, Listar, Actualizar y Eliminar Producto")
    void flujoCompletoProducto() throws Exception {
        ProductoRequest nuevo = new ProductoRequest(
                "Amoxicilina 500mg",
                "Antibiótico",
                new BigDecimal("15.50"),
                "Medicamentos",
                "/img/amoxi.jpg",
                40
        );

        // 1. POST /api/productos -> 201 Created
        String postRes = mockMvc.perform(post("/api/productos")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(nuevo)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.nombre").value("Amoxicilina 500mg"))
                .andExpect(jsonPath("$.stock").value(40))
                .andReturn().getResponse().getContentAsString();

        Producto productoCreado = objectMapper.readValue(postRes, Producto.class);
        Integer id = productoCreado.getId();

        // 2. GET /api/productos -> 200 OK con 1 elemento
        mockMvc.perform(get("/api/productos"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].nombre").value("Amoxicilina 500mg"));

        // 3. GET /api/productos/{id} -> 200 OK
        mockMvc.perform(get("/api/productos/" + id))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(id))
                .andExpect(jsonPath("$.categoria").value("Medicamentos"));

        // 4. PUT /api/productos/{id} -> 200 OK
        ProductoRequest actualizacion = new ProductoRequest(
                "Amoxicilina Forte",
                "Antibiótico de amplio espectro",
                new BigDecimal("18.00"),
                "Medicamentos",
                "/img/amoxi.jpg",
                30
        );

        mockMvc.perform(put("/api/productos/" + id)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(actualizacion)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.nombre").value("Amoxicilina Forte"))
                .andExpect(jsonPath("$.precio").value(18.00));

        // 5. DELETE /api/productos/{id} -> 200 OK
        mockMvc.perform(delete("/api/productos/" + id))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.mensaje").value("Producto eliminado correctamente."));

        // 6. GET /api/productos/{id} -> 404 Not Found
        mockMvc.perform(get("/api/productos/" + id))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error").exists());
    }

    @Test
    @DisplayName("Integración: Validaciones al crear producto inválido retornan 400")
    void crearProductoInvalido_Retorna400() throws Exception {
        ProductoRequest invalido = new ProductoRequest("", "", new BigDecimal("-1.0"), "", "", -5);

        mockMvc.perform(post("/api/productos")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(invalido)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").exists());
    }
}
