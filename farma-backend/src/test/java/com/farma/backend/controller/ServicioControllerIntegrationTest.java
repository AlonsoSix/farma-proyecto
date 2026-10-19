package com.farma.backend.controller;

import tools.jackson.databind.ObjectMapper;
import com.farma.backend.dto.ServicioRequest;
import com.farma.backend.model.Servicio;
import com.farma.backend.repository.ServicioRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class ServicioControllerIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ServicioRepository servicioRepository;

    private ObjectMapper objectMapper;

    @BeforeEach
    void setUp() {
        objectMapper = new ObjectMapper();
        servicioRepository.deleteAll();
    }

    @Test
    @DisplayName("Integración: Crear, Listar, Modificar Estado y Eliminar Servicio")
    void flujoCompletoServicio() throws Exception {
        ServicioRequest nuevo = new ServicioRequest(
                "Vacunación",
                "Servicio de vacunación contra la influenza",
                "bi-shield-plus",
                true
        );

        // 1. POST /api/servicios -> 201 Created
        String postRes = mockMvc.perform(post("/api/servicios")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(nuevo)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.titulo").value("Vacunación"))
                .andReturn().getResponse().getContentAsString();

        Servicio servicioCreado = objectMapper.readValue(postRes, Servicio.class);
        Integer id = servicioCreado.getId();

        // 2. GET /api/servicios -> 200 OK
        mockMvc.perform(get("/api/servicios"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].titulo").value("Vacunación"));

        // 3. PUT /api/servicios/{id} -> Desactivar servicio
        ServicioRequest update = new ServicioRequest(null, null, null, false);
        mockMvc.perform(put("/api/servicios/" + id)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(update)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.activo").value(false));

        // 4. GET /api/servicios (solo activos) -> debe retornar 0
        mockMvc.perform(get("/api/servicios?todos=false"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));

        // 5. GET /api/servicios?todos=true -> debe retornar 1
        mockMvc.perform(get("/api/servicios?todos=true"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1));

        // 6. DELETE /api/servicios/{id} -> 200 OK
        mockMvc.perform(delete("/api/servicios/" + id))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.mensaje").value("Servicio eliminado correctamente."));
    }
}
