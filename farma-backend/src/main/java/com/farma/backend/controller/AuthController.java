package com.farma.backend.controller;

import com.farma.backend.dto.LoginRequest;
import com.farma.backend.dto.RegistroRequest;
import com.farma.backend.model.Usuario;
import com.farma.backend.service.UsuarioService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "*")
public class AuthController {

    @Autowired
    private UsuarioService usuarioService;

    @PostMapping("/registro")
    public ResponseEntity<?> registrar(@RequestBody RegistroRequest request) {
        try {
            Usuario nuevo = usuarioService.registrar(request);
            Map<String, Object> resp = new HashMap<>();
            resp.put("mensaje", "Cuenta creada correctamente.");
            resp.put("id", nuevo.getId());
            resp.put("nombre", nuevo.getNombre());
            return ResponseEntity.ok(resp);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest request) {
        try {
            Usuario usuario = usuarioService.login(request);
            Map<String, Object> resp = new HashMap<>();
            resp.put("mensaje", "Bienvenido " + usuario.getNombre());
            resp.put("id", usuario.getId());
            resp.put("nombre", usuario.getNombre());
            resp.put("apellido", usuario.getApellido());
            resp.put("correo", usuario.getCorreo());
            resp.put("rol", usuario.getRol());
            return ResponseEntity.ok(resp);
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", e.getMessage()));
        }
    }
}