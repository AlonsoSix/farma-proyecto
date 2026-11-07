package com.farma.backend.controller;

import com.farma.backend.service.ReporteService;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.Map;

/**
 * Controlador REST para la generación de reportes gerenciales del negocio.
 * Cumple con SRP: Enrutamiento y serialización de reportes; errores delegados a GlobalExceptionHandler.
 * Cumple con DIP: ReporteService inyectado mediante constructor.
 */
@RestController
@RequestMapping("/api/reportes")
@CrossOrigin(origins = "*")
public class ReporteController {

    private final ReporteService reporteService;

    public ReporteController(ReporteService reporteService) {
        this.reporteService = reporteService;
    }

    // GET /api/reportes?desde=2026-06-01&hasta=2026-11-30 -> datos de los 6 reportes (solo administrador)
    @GetMapping
    public Map<String, Object> generar(
            @RequestParam(name = "desde", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate desde,
            @RequestParam(name = "hasta", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate hasta,
            @RequestHeader(value = "X-Usuario-Id", required = false) Integer idUsuario) {
        return reporteService.generar(desde, hasta, idUsuario);
    }
}
