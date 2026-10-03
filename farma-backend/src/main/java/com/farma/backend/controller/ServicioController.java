package com.farma.backend.controller;

import com.farma.backend.model.Servicio;
import com.farma.backend.repository.ServicioRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/servicios")
@CrossOrigin(origins = "*")
public class ServicioController {

    @Autowired
    private ServicioRepository servicioRepository;

    @GetMapping
    public List<Servicio> listar(@RequestParam(value = "todos", defaultValue = "false") boolean todos) {
        if (todos) {
            return servicioRepository.findAll();
        }
        return servicioRepository.findByActivoTrue();
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> obtenerPorId(@PathVariable Integer id) {
        return servicioRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.status(HttpStatus.NOT_FOUND).body(null));
    }

    @PostMapping
    public ResponseEntity<?> crear(@RequestBody Servicio servicio) {
        if (servicio.getTitulo() == null || servicio.getTitulo().trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "El título del servicio es obligatorio."));
        }
        if (servicio.getDescripcion() == null || servicio.getDescripcion().trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "La descripción es obligatoria."));
        }
        if (servicio.getIcono() == null || servicio.getIcono().trim().isEmpty()) {
            servicio.setIcono("bi-heart-pulse");
        }
        if (servicio.getActivo() == null) {
            servicio.setActivo(true);
        }
        servicio.setFechaCreacion(LocalDateTime.now());
        Servicio guardado = servicioRepository.save(servicio);
        return ResponseEntity.status(HttpStatus.CREATED).body(guardado);
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> actualizar(@PathVariable Integer id, @RequestBody Servicio datos) {
        return servicioRepository.findById(id)
                .map(servicio -> {
                    if (datos.getTitulo() != null && !datos.getTitulo().trim().isEmpty()) {
                        servicio.setTitulo(datos.getTitulo().trim());
                    }
                    if (datos.getDescripcion() != null && !datos.getDescripcion().trim().isEmpty()) {
                        servicio.setDescripcion(datos.getDescripcion().trim());
                    }
                    if (datos.getIcono() != null && !datos.getIcono().trim().isEmpty()) {
                        servicio.setIcono(datos.getIcono().trim());
                    }
                    if (datos.getActivo() != null) {
                        servicio.setActivo(datos.getActivo());
                    }
                    Servicio actualizado = servicioRepository.save(servicio);
                    return ResponseEntity.ok(actualizado);
                })
                .orElse(ResponseEntity.status(HttpStatus.NOT_FOUND).body(null));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> eliminar(@PathVariable Integer id) {
        return servicioRepository.findById(id)
                .map(servicio -> {
                    servicioRepository.delete(servicio);
                    return ResponseEntity.ok(Map.of("mensaje", "Servicio eliminado correctamente.", "id", id));
                })
                .orElse(ResponseEntity.status(HttpStatus.NOT_FOUND).body(null));
    }
}
