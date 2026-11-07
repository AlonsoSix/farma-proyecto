package com.farma.backend.service;

import com.farma.backend.config.CulqiProperties;
import com.farma.backend.dto.ResultadoPago;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.*;

class CulqiPasarelaPagoTest {

    private CulqiProperties props;
    private CulqiPasarelaPago pasarela;

    @BeforeEach
    void setUp() {
        props = new CulqiProperties();
        // Sin llaves por defecto (modo simulado)
        pasarela = new CulqiPasarelaPago(props);
    }

    @Test
    @DisplayName("Pago en EFECTIVO se procesa como PENDIENTE sin interactuar con pasarela")
    void debeProcesarEfectivoComoPendiente() {
        ResultadoPago res = pasarela.cobrar("EFECTIVO", null, new BigDecimal("45.00"),
                null, "Juan Perez", "12345678");

        assertEquals("PENDIENTE", res.estado());
        assertEquals("EFECTIVO", res.pasarela());
        assertNull(res.referencia());
    }

    @Test
    @DisplayName("Debe rechazar métodos de pago no soportados")
    void debeRechazarMetodoDesconocido() {
        assertThrows(PagoRechazadoException.class,
                () -> pasarela.cobrar("BITCOIN", null, new BigDecimal("50.00"), "a@b.com", "Test", "12345678"));
    }

    @Test
    @DisplayName("Debe rechazar monto cero o negativo")
    void debeRechazarMontoInvalido() {
        assertThrows(PagoRechazadoException.class,
                () -> pasarela.cobrar("TARJETA", "tkn_123", BigDecimal.ZERO, "a@b.com", "Test", "12345678"));
    }

    @Test
    @DisplayName("Debe rechazar pagos con Yape mayores a S/ 2,000.00")
    void debeRechazarYapeExcedeLimite() {
        PagoRechazadoException ex = assertThrows(PagoRechazadoException.class,
                () -> pasarela.cobrar("YAPE", "ype_123", new BigDecimal("2000.01"), "cliente@gmail.com", "Carlos", "12345678"));
        assertTrue(ex.getMessage().contains("hasta S/ 2,000.00"));
    }

    @Test
    @DisplayName("Debe exigir correo válido para pagos con tarjeta o Yape")
    void debeExigirCorreoValido() {
        assertThrows(PagoRechazadoException.class,
                () -> pasarela.cobrar("TARJETA", "tkn_123", new BigDecimal("50.00"), "correo-invalido", "Test", "12345678"));
    }

    @Test
    @DisplayName("En modo SIMULADO (sin llaves), aprueba el pago generando referencia SIM-")
    void debeAprobarEnModoSimulado() {
        ResultadoPago res = pasarela.cobrar("TARJETA", null, new BigDecimal("120.00"),
                "cliente@gmail.com", "Ana Torres", "87654321");

        assertEquals("APROBADO", res.estado());
        assertEquals("SIMULADO", res.pasarela());
        assertNotNull(res.referencia());
        assertTrue(res.referencia().startsWith("SIM-"));
    }
}
