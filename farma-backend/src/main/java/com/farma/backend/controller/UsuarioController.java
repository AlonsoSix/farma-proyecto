package com.farma.backend.controller;

import com.farma.backend.dto.UsuarioDTO;
import com.farma.backend.dto.UsuarioRequest;
import com.farma.backend.exception.ResourceNotFoundException;
import com.farma.backend.service.UsuarioService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/usuarios")
@CrossOrigin(origins = "*")
public class UsuarioController {

    private final UsuarioService usuarioService;

    public UsuarioController(UsuarioService usuarioService) {
        this.usuarioService = usuarioService;
    }

    @GetMapping
    public ResponseEntity<List<UsuarioDTO>> listar() {
        return ResponseEntity.ok(usuarioService.listarTodos());
    }

    @GetMapping("/{id}")
    public ResponseEntity<UsuarioDTO> obtenerPorId(@PathVariable Integer id) {
        UsuarioDTO usuario = usuarioService.obtenerPorId(id)
                .orElseThrow(() -> new ResourceNotFoundException("Usuario no encontrado con ID: " + id));
        return ResponseEntity.ok(usuario);
    }

    @PostMapping
    public ResponseEntity<UsuarioDTO> crear(@Valid @RequestBody UsuarioRequest request) {
        UsuarioDTO creado = usuarioService.crearPorAdmin(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(creado);
    }

    @PutMapping("/{id}")
    public ResponseEntity<UsuarioDTO> actualizar(@PathVariable Integer id, @RequestBody UsuarioRequest request) {
        UsuarioDTO actualizado = usuarioService.actualizarPorAdmin(id, request);
        return ResponseEntity.ok(actualizado);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, Object>> eliminar(@PathVariable Integer id) {
        usuarioService.eliminarUsuario(id);
        return ResponseEntity.ok(Map.of("mensaje", "Usuario eliminado correctamente.", "id", id));
    }
}
