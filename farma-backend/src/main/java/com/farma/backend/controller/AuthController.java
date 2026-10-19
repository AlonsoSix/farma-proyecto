package com.farma.backend.controller;

import com.farma.backend.dto.AuthResponse;
import com.farma.backend.dto.LoginRequest;
import com.farma.backend.dto.RegistroRequest;
import com.farma.backend.model.Usuario;
import com.farma.backend.service.AuthService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "*")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/registro")
    public ResponseEntity<Map<String, Object>> registrar(@Valid @RequestBody RegistroRequest request) {
        Usuario nuevo = authService.registrar(request);
        Map<String, Object> resp = new HashMap<>();
        resp.put("mensaje", "Cuenta creada correctamente.");
        resp.put("id", nuevo.getId());
        resp.put("nombre", nuevo.getNombre());
        return ResponseEntity.ok(resp);
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request) {
        Usuario usuario = authService.login(request);
        AuthResponse response = new AuthResponse(
                "Bienvenido " + usuario.getNombre(),
                usuario.getId(),
                usuario.getNombre(),
                usuario.getApellido(),
                usuario.getCorreo(),
                usuario.getRol()
        );
        return ResponseEntity.ok(response);
    }
}