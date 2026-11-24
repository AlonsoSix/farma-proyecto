package com.farma.backend.controller;

import com.farma.backend.service.EnviadorSmtp;
import com.farma.backend.service.ResolutorMx;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.is;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class CorreoControllerIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    // Se sustituyen los beans reales: las pruebas no consultan DNS ni abren SMTP.
    @MockitoBean
    private ResolutorMx resolutorMx;

    @MockitoBean
    private EnviadorSmtp enviadorSmtp;

    @BeforeEach
    void simularEntrega() throws Exception {
        when(resolutorMx.resolver(anyString())).thenReturn(List.of("mx.prueba.local"));
        doNothing().when(enviadorSmtp).enviar(anyString(), anyString(), anyString());
    }

    @Test
    @DisplayName("POST /api/correos/confirmacion entrega el correo sin credenciales")
    void debeEnviarConfirmacion() throws Exception {
        mockMvc.perform(post("/api/correos/confirmacion")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"correo\":\"cliente@gmail.com\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.modo", is("ENVIADO")))
                .andExpect(jsonPath("$.mensaje", containsString("¡Gracias por escribirnos! Te responderemos pronto.")))
                .andExpect(jsonPath("$.mensaje", containsString("cliente@gmail.com")));
    }

    @Test
    @DisplayName("POST /api/correos/confirmacion rechaza correos inválidos con 400")
    void debeRechazarCorreoInvalido() throws Exception {
        mockMvc.perform(post("/api/correos/confirmacion")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"correo\":\"no-es-correo\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error", containsString("válido")));
    }
}
