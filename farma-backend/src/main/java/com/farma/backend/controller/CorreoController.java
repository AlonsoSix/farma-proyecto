package com.farma.backend.controller;

import com.farma.backend.dto.CorreoRequest;
import com.farma.backend.service.CorreoService;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * Endpoint de la sección "Confirma tu correo" de Contacto.
 * SRP: solo enruta; la validación y el envío viven en CorreoService.
 */
@RestController
@RequestMapping("/api/correos")
@CrossOrigin(origins = "*")
public class CorreoController {

    private final CorreoService correoService;

    public CorreoController(CorreoService correoService) {
        this.correoService = correoService;
    }

    /** POST /api/correos/confirmacion -> envía el correo o devuelve un mailto de respaldo. */
    @PostMapping("/confirmacion")
    public Map<String, String> enviarConfirmacion(@RequestBody CorreoRequest request) {
        return correoService.enviarConfirmacion(request);
    }
}
