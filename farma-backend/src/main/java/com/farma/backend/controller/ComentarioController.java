package com.farma.backend.controller;

import com.farma.backend.dto.ComentarioRequest;
import com.farma.backend.model.Comentario;
import com.farma.backend.service.ComentarioService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Controlador REST de opiniones de clientes (página de Contacto).
 * Cumple con SRP: enruta las peticiones y delega la lógica a ComentarioService.
 * Cumple con DIP: el servicio se inyecta por constructor.
 */
@RestController
@RequestMapping("/api/comentarios")
@CrossOrigin(origins = "*")
public class ComentarioController {

    private final ComentarioService comentarioService;

    public ComentarioController(ComentarioService comentarioService) {
        this.comentarioService = comentarioService;
    }

    // GET /api/comentarios -> opiniones publicadas (más recientes primero)
    @GetMapping
    public List<Comentario> listar() {
        return comentarioService.listar();
    }

    // POST /api/comentarios -> registra una opinión con calificación de 1 a 5
    @PostMapping
    public ResponseEntity<Comentario> registrar(@RequestBody ComentarioRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(comentarioService.registrar(request));
    }
}
