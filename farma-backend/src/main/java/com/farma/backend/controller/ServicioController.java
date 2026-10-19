package com.farma.backend.controller;

import com.farma.backend.dto.ServicioRequest;
import com.farma.backend.model.Servicio;
import com.farma.backend.service.ServicioService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/servicios")
@CrossOrigin(origins = "*")
public class ServicioController {

    private final ServicioService servicioService;

    public ServicioController(ServicioService servicioService) {
        this.servicioService = servicioService;
    }

    @GetMapping
    public ResponseEntity<List<Servicio>> listar(@RequestParam(value = "todos", defaultValue = "false") boolean todos) {
        return ResponseEntity.ok(servicioService.listar(todos));
    }

    @GetMapping("/{id}")
    public ResponseEntity<Servicio> obtenerPorId(@PathVariable Integer id) {
        return ResponseEntity.ok(servicioService.obtenerPorId(id));
    }

    @PostMapping
    public ResponseEntity<Servicio> crear(@Valid @RequestBody ServicioRequest request) {
        Servicio creado = servicioService.crear(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(creado);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Servicio> actualizar(@PathVariable Integer id, @RequestBody ServicioRequest request) {
        Servicio actualizado = servicioService.actualizar(id, request);
        return ResponseEntity.ok(actualizado);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, Object>> eliminar(@PathVariable Integer id) {
        servicioService.eliminar(id);
        return ResponseEntity.ok(Map.of("mensaje", "Servicio eliminado correctamente.", "id", id));
    }
}
