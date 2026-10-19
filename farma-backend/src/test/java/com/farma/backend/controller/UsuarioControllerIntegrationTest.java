package com.farma.backend.controller;

import tools.jackson.databind.ObjectMapper;
import com.farma.backend.dto.UsuarioDTO;
import com.farma.backend.dto.UsuarioRequest;
import com.farma.backend.repository.UsuarioRepository;
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
class UsuarioControllerIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UsuarioRepository usuarioRepository;

    private ObjectMapper objectMapper;

    @BeforeEach
    void setUp() {
        objectMapper = new ObjectMapper();
        usuarioRepository.deleteAll();
    }

    @Test
    @DisplayName("Integración: Crear Usuario por Admin, Listar, Actualizar y Eliminar")
    void flujoCompletoUsuario() throws Exception {
        UsuarioRequest request = new UsuarioRequest(
                "Lucia",
                "Mendez",
                "lucia@test.com",
                "987654321",
                "ADMIN",
                "passwordSeguro123"
        );

        // 1. POST /api/usuarios -> 201 Created
        String postRes = mockMvc.perform(post("/api/usuarios")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.nombre").value("Lucia"))
                .andExpect(jsonPath("$.rol").value("ADMIN"))
                .andReturn().getResponse().getContentAsString();

        UsuarioDTO creado = objectMapper.readValue(postRes, UsuarioDTO.class);
        Integer id = creado.getId();

        // 2. GET /api/usuarios -> 200 OK
        mockMvc.perform(get("/api/usuarios"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].correo").value("lucia@test.com"));

        // 3. GET /api/usuarios/{id} -> 200 OK
        mockMvc.perform(get("/api/usuarios/" + id))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(id));

        // 4. PUT /api/usuarios/{id} -> 200 OK
        UsuarioRequest update = new UsuarioRequest(
                "Lucia Elena",
                "Mendez",
                "lucia@test.com",
                "987654321",
                "ADMIN",
                null
        );

        mockMvc.perform(put("/api/usuarios/" + id)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(update)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.nombre").value("Lucia Elena"));

        // 5. DELETE /api/usuarios/{id} -> 200 OK
        mockMvc.perform(delete("/api/usuarios/" + id))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.mensaje").value("Usuario eliminado correctamente."));

        // 6. GET /api/usuarios/{id} -> 404 Not Found
        mockMvc.perform(get("/api/usuarios/" + id))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error").exists());
    }
}
