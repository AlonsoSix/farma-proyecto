package com.farma.backend.controller;

import com.farma.backend.dto.LoginRequest;
import com.farma.backend.dto.RegistroRequest;
import com.farma.backend.model.Usuario;
import com.farma.backend.service.UsuarioService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Controlador de Autenticación y Registro.
 * Cumple con SRP: delega la lógica de negocio al servicio y el manejo de errores al GlobalExceptionHandler.
 * Cumple con DIP: inyección de dependencias por constructor.
 */
@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "*")
public class AuthController {

    private final UsuarioService usuarioService;

    public AuthController(UsuarioService usuarioService) {
        this.usuarioService = usuarioService;
    }

    @PostMapping("/registro")
    public ResponseEntity<Map<String, Object>> registrar(@RequestBody RegistroRequest request) {
        Usuario nuevo = usuarioService.registrar(request);
        Map<String, Object> resp = new LinkedHashMap<>();
        resp.put("mensaje", "Cuenta creada correctamente.");
        resp.put("id", nuevo.getId());
        resp.put("nombre", nuevo.getNombre());
        return ResponseEntity.status(HttpStatus.CREATED).body(resp);
    }

    @PostMapping("/login")
    public ResponseEntity<Map<String, Object>> login(@RequestBody LoginRequest request) {
        Usuario usuario = usuarioService.login(request);
        Map<String, Object> resp = new LinkedHashMap<>();
        resp.put("mensaje", "Bienvenido " + usuario.getNombre());
        resp.put("id", usuario.getId());
        resp.put("nombre", usuario.getNombre());
        resp.put("apellido", usuario.getApellido());
        resp.put("correo", usuario.getCorreo());
        resp.put("rol", usuario.getRol());
        return ResponseEntity.ok(resp);
    }
}
