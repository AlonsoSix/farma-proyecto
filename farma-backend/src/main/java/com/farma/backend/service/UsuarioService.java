package com.farma.backend.service;

import com.farma.backend.dto.LoginRequest;
import com.farma.backend.dto.RegistroRequest;
import com.farma.backend.exception.CredencialesInvalidasException;
import com.farma.backend.model.Usuario;
import com.farma.backend.repository.UsuarioRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

/**
 * Servicio encargado de la gestión de usuarios y autenticación.
 * Cumple con SOLID:
 * - SRP: Encapsula únicamente la lógica de registro y autenticación.
 * - DIP: Dependencias inyectadas a través del constructor.
 */
@Service
public class UsuarioService {

    private final UsuarioRepository usuarioRepository;
    private final PasswordEncoder passwordEncoder;

    public UsuarioService(UsuarioRepository usuarioRepository, PasswordEncoder passwordEncoder) {
        this.usuarioRepository = usuarioRepository;
        this.passwordEncoder = passwordEncoder;
    }

    /**
     * Registra un nuevo cliente validando que el correo no esté duplicado.
     */
    public Usuario registrar(RegistroRequest request) {
        if (request == null || request.getCorreo() == null || request.getCorreo().isBlank()) {
            throw new IllegalArgumentException("El correo electrónico es obligatorio.");
        }
        if (request.getContrasena() == null || request.getContrasena().length() < 6) {
            throw new IllegalArgumentException("La contraseña debe tener al menos 6 caracteres.");
        }
        if (usuarioRepository.existsByCorreo(request.getCorreo().trim())) {
            throw new IllegalArgumentException("Ya existe una cuenta con ese correo.");
        }

        Usuario usuario = new Usuario();
        usuario.setNombre(request.getNombre() != null ? request.getNombre().trim() : "");
        usuario.setApellido(request.getApellido() != null ? request.getApellido().trim() : "");
        usuario.setCorreo(request.getCorreo().trim());
        usuario.setContrasena(passwordEncoder.encode(request.getContrasena()));
        usuario.setTelefono(request.getTelefono() != null ? request.getTelefono().trim() : null);
        usuario.setRol("CLIENTE");

        return usuarioRepository.save(usuario);
    }

    /**
     * Autentica a un usuario comparando su contraseña con el hash BCrypt.
     */
    public Usuario login(LoginRequest request) {
        if (request == null || request.getCorreo() == null || request.getContrasena() == null) {
            throw new CredencialesInvalidasException("Correo o contraseña incorrectos.");
        }

        Usuario usuario = usuarioRepository.findByCorreo(request.getCorreo().trim())
                .orElseThrow(() -> new CredencialesInvalidasException("Correo o contraseña incorrectos."));

        if (!passwordEncoder.matches(request.getContrasena(), usuario.getContrasena())) {
            throw new CredencialesInvalidasException("Correo o contraseña incorrectos.");
        }
        return usuario;
    }
}
