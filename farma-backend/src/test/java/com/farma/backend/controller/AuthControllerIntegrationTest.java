package com.farma.backend.controller;

import tools.jackson.databind.ObjectMapper;
import com.farma.backend.dto.LoginRequest;
import com.farma.backend.dto.RegistroRequest;
import com.farma.backend.repository.UsuarioRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class AuthControllerIntegrationTest {

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
    @DisplayName("Integración: Registro y posterior Login exitoso")
    void registroYLogin_Integracion() throws Exception {
        RegistroRequest registro = new RegistroRequest("Mario", "Vargas", "mario@correo.com", "password123", "999888777");

        mockMvc.perform(post("/api/auth/registro")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(registro)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.mensaje").value("Cuenta creada correctamente."))
                .andExpect(jsonPath("$.nombre").value("Mario"));

        LoginRequest login = new LoginRequest("mario@correo.com", "password123");

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(login)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.nombre").value("Mario"))
                .andExpect(jsonPath("$.correo").value("mario@correo.com"))
                .andExpect(jsonPath("$.rol").value("CLIENTE"));
    }

    @Test
    @DisplayName("Integración: Login fallido con credenciales erróneas")
    void loginInvalido_Retorna401() throws Exception {
        LoginRequest login = new LoginRequest("desconocido@correo.com", "clave");

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(login)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error").exists());
    }
}
