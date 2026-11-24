package com.farma.backend.service;

import com.farma.backend.dto.CorreoRequest;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CorreoServiceTest {

    @Mock
    private ResolutorMx resolutorMx;

    @Mock
    private EnviadorSmtp enviadorSmtp;

    private CorreoRequest req(String correo) {
        CorreoRequest r = new CorreoRequest();
        r.setCorreo(correo);
        return r;
    }

    @Test
    @DisplayName("Sin credenciales: entrega directamente al MX de prioridad más alta")
    void entregaDirectaAlMx() throws Exception {
        when(resolutorMx.resolver("gmail.com"))
                .thenReturn(List.of("mx-alta.gmail.com", "mx-baja.gmail.com"));

        Map<String, String> resultado = new CorreoService(resolutorMx, enviadorSmtp)
                .enviarConfirmacion(req("cliente@gmail.com"));

        assertEquals("ENVIADO", resultado.get("modo"));
        assertTrue(resultado.get("mensaje").contains("¡Gracias por escribirnos! Te responderemos pronto."));
        verify(enviadorSmtp, times(1))
                .enviar(eq("mx-alta.gmail.com"), eq("cliente@gmail.com"), anyString());
    }

    @Test
    @DisplayName("Sin registros MX usa el dominio del correo y ignora espacios")
    void sinMxUsaElDominio() throws Exception {
        when(resolutorMx.resolver("hotmail.com")).thenReturn(List.of());

        Map<String, String> resultado = new CorreoService(resolutorMx, enviadorSmtp)
                .enviarConfirmacion(req("  ana@hotmail.com  "));

        assertEquals("ENVIADO", resultado.get("modo"));
        assertTrue(resultado.get("mensaje").contains("ana@hotmail.com"));
        verify(enviadorSmtp).enviar(eq("hotmail.com"), eq("ana@hotmail.com"), anyString());
    }

    @Test
    @DisplayName("Si todos los MX fallan devuelve un mailto de respaldo")
    void falloTotalDevuelveMailto() throws Exception {
        when(resolutorMx.resolver("outlook.com"))
                .thenReturn(List.of("mx1.outlook.com", "mx2.outlook.com"));
        doThrow(new Exception("puerto 25 bloqueado"))
                .when(enviadorSmtp).enviar(eq("mx1.outlook.com"), anyString(), anyString());
        doThrow(new Exception("rechazado"))
                .when(enviadorSmtp).enviar(eq("mx2.outlook.com"), anyString(), anyString());

        Map<String, String> resultado = new CorreoService(resolutorMx, enviadorSmtp)
                .enviarConfirmacion(req("cliente@outlook.com"));

        assertEquals("MANUAL", resultado.get("modo"));
        assertTrue(resultado.get("mensaje").contains("¡Gracias por escribirnos! Te responderemos pronto."));
        String mailto = resultado.get("mailto");
        assertTrue(mailto.startsWith("mailto:cliente@outlook.com?subject="), mailto);
        assertTrue(mailto.contains("Confirmaci%C3%B3n%20de%20contacto"), mailto);
        assertTrue(mailto.contains("Gracias%20por%20escribirnos"), mailto);
        verify(enviadorSmtp, times(2)).enviar(anyString(), anyString(), anyString());
    }

    @Test
    @DisplayName("Rechaza correos inválidos antes de consultar DNS o SMTP")
    void correoInvalidoDebeFallar() {
        CorreoService service = new CorreoService(resolutorMx, enviadorSmtp);

        IllegalArgumentException ex = assertThrows(
                IllegalArgumentException.class,
                () -> service.enviarConfirmacion(req("correo-invalido"))
        );

        assertTrue(ex.getMessage().contains("válido"));
        verifyNoInteractions(resolutorMx, enviadorSmtp);
    }
}
