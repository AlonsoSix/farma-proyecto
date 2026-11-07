package com.farma.backend.controller;

import com.farma.backend.model.Usuario;
import com.farma.backend.repository.UsuarioRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
class AuthControllerIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UsuarioRepository usuarioRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @BeforeEach
    void setUp() {
        usuarioRepository.deleteAll();

        Usuario admin = new Usuario();
        admin.setNombre("Admin");
        admin.setApellido("Sistema");
        admin.setCorreo("admin@farma.com");
        admin.setContrasena(passwordEncoder.encode("admin12345"));
        admin.setRol("ADMIN");
        usuarioRepository.save(admin);
    }

    @Test
    @DisplayName("POST /api/auth/login exitoso responde 200 con datos del usuario")
    void debeLoguearExitosamente() throws Exception {
        String jsonBody = """
                {
                    "correo": "admin@farma.com",
                    "contrasena": "admin12345"
                }
                """;

        mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(jsonBody))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.nombre", is("Admin")))
                .andExpect(jsonPath("$.rol", is("ADMIN")));
    }

    @Test
    @DisplayName("POST /api/auth/login con credenciales erróneas responde 401 Unauthorized")
    void debeFallarLoginConPasswordErroneo() throws Exception {
        String jsonBody = """
                {
                    "correo": "admin@farma.com",
                    "contrasena": "claveInvalida"
                }
                """;

        mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(jsonBody))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error", containsString("Correo o contraseña incorrectos")));
    }

    @Test
    @DisplayName("POST /api/auth/registro exitoso responde 201 Created")
    void debeRegistrarUsuarioNuevo() throws Exception {
        String jsonBody = """
                {
                    "nombre": "Elena",
                    "apellido": "Rivas",
                    "correo": "elena@hotmail.com",
                    "contrasena": "segura2026",
                    "telefono": "987112233"
                }
                """;

        mockMvc.perform(post("/api/auth/registro")
                .contentType(MediaType.APPLICATION_JSON)
                .content(jsonBody))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.mensaje", is("Cuenta creada correctamente.")))
                .andExpect(jsonPath("$.nombre", is("Elena")));
    }
}
