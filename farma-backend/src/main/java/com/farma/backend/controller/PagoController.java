package com.farma.backend.controller;

import com.farma.backend.config.CulqiProperties;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Controlador REST para exponer la configuración pública de pagos.
 * Solo expone la llave pública necesaria para Culqi Checkout en el frontend.
 * Cumple con DIP mediante inyección por constructor.
 */
@RestController
@RequestMapping("/api/pagos")
@CrossOrigin(origins = "*")
public class PagoController {

    private final CulqiProperties culqi;

    public PagoController(CulqiProperties culqi) {
        this.culqi = culqi;
    }

    @GetMapping("/config")
    public Map<String, Object> configuracion() {
        boolean real = culqi.isConfigurado();
        Map<String, Object> respuesta = new LinkedHashMap<>();
        respuesta.put("pasarela", real ? "CULQI" : "SIMULADO");
        respuesta.put("modo", real ? culqi.getModo() : "prueba");
        respuesta.put("llavePublica", real ? culqi.getPublicKey() : null);
        respuesta.put("moneda", "PEN");
        respuesta.put("limiteYape", new BigDecimal("2000.00"));
        respuesta.put("aviso", real
                ? "Pago procesado por Culqi Checkout."
                : "Modo de prueba: no se hará ningún cobro real. Configura las llaves de Culqi para cobrar de verdad.");
        return respuesta;
    }
}
