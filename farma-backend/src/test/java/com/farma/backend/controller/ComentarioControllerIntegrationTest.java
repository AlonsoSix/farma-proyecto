package com.farma.backend.controller;

import com.farma.backend.model.Comentario;
import com.farma.backend.repository.ComentarioRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDateTime;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.is;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class ComentarioControllerIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ComentarioRepository comentarioRepository;

    @BeforeEach
    void setUp() {
        comentarioRepository.deleteAll();
    }

    @Test
    @DisplayName("GET /api/comentarios devuelve las opiniones de la más reciente a la más antigua")
    void debeListarComentariosPorFechaDescendente() throws Exception {
        comentarioRepository.save(crear("María Rodríguez", 5, "Atención rápida y muy amable.", LocalDateTime.now().minusDays(1)));
        comentarioRepository.save(crear("Jorge Quispe", 4, "Buenos precios y stock completo.", LocalDateTime.now()));

        mockMvc.perform(get("/api/comentarios"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(2)))
                .andExpect(jsonPath("$[0].nombre", is("Jorge Quispe")))
                .andExpect(jsonPath("$[0].calificacion", is(4)))
                .andExpect(jsonPath("$[1].nombre", is("María Rodríguez")));
    }

    @Test
    @DisplayName("POST /api/comentarios registra una opinión válida y la devuelve con su id")
    void debeRegistrarComentarioValido() throws Exception {
        mockMvc.perform(post("/api/comentarios")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "nombre": "  Lucía Torres  ",
                                  "calificacion": 5,
                                  "comentario": "  Me atendieron muy bien y el delivery llegó rápido.  "
                                }
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").isNumber())
                .andExpect(jsonPath("$.nombre", is("Lucía Torres")))
                .andExpect(jsonPath("$.calificacion", is(5)))
                .andExpect(jsonPath("$.comentario", is("Me atendieron muy bien y el delivery llegó rápido.")));

        mockMvc.perform(get("/api/comentarios"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)));
    }

    @Test
    @DisplayName("POST /api/comentarios rechaza una calificación fuera de 1 a 5")
    void debeRechazarCalificacionInvalida() throws Exception {
        mockMvc.perform(post("/api/comentarios")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"nombre":"Carlos Flores","calificacion":6,"comentario":"Un comentario suficientemente largo."}
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error", containsString("1 a 5")));
    }

    @Test
    @DisplayName("POST /api/comentarios rechaza un nombre vacío")
    void debeRechazarNombreVacio() throws Exception {
        mockMvc.perform(post("/api/comentarios")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"nombre":"   ","calificacion":4,"comentario":"Un comentario suficientemente largo."}
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error", containsString("nombre")));
    }

    @Test
    @DisplayName("POST /api/comentarios rechaza un comentario demasiado corto")
    void debeRechazarComentarioCorto() throws Exception {
        mockMvc.perform(post("/api/comentarios")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"nombre":"Andrea Vargas","calificacion":5,"comentario":"Muy bueno"}
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error", containsString("10 y 500")));
    }

    private Comentario crear(String nombre, int calificacion, String texto, LocalDateTime fecha) {
        Comentario comentario = new Comentario();
        comentario.setNombre(nombre);
        comentario.setCalificacion(calificacion);
        comentario.setComentario(texto);
        comentario.setFecha(fecha);
        return comentario;
    }
}
