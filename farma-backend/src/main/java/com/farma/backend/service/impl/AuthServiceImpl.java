package com.farma.backend.service.impl;

import com.farma.backend.dto.LoginRequest;
import com.farma.backend.dto.RegistroRequest;
import com.farma.backend.exception.DuplicateResourceException;
import com.farma.backend.exception.UnauthorizedException;
import com.farma.backend.model.Usuario;
import com.farma.backend.repository.UsuarioRepository;
import com.farma.backend.service.AuthService;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
public class AuthServiceImpl implements AuthService {

    private final UsuarioRepository usuarioRepository;
    private final PasswordEncoder passwordEncoder;

    public AuthServiceImpl(UsuarioRepository usuarioRepository, PasswordEncoder passwordEncoder) {
        this.usuarioRepository = usuarioRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    @Transactional
    public Usuario registrar(RegistroRequest request) {
        String correoLimpio = request.getCorreo().trim();
        if (usuarioRepository.existsByCorreo(correoLimpio)) {
            throw new DuplicateResourceException("Ya existe una cuenta con ese correo.");
        }

        Usuario usuario = new Usuario();
        usuario.setNombre(request.getNombre().trim());
        usuario.setApellido(request.getApellido().trim());
        usuario.setCorreo(correoLimpio);
        usuario.setContrasena(passwordEncoder.encode(request.getContrasena().trim()));
        usuario.setTelefono(request.getTelefono() != null ? request.getTelefono().trim() : "");
        usuario.setRol("CLIENTE");
        usuario.setFechaRegistro(LocalDateTime.now());

        return usuarioRepository.save(usuario);
    }

    @Override
    @Transactional(readOnly = true)
    public Usuario login(LoginRequest request) {
        Usuario usuario = usuarioRepository.findByCorreo(request.getCorreo().trim())
                .orElseThrow(() -> new UnauthorizedException("Correo o contraseña incorrectos."));

        if (!passwordEncoder.matches(request.getContrasena().trim(), usuario.getContrasena())) {
            throw new UnauthorizedException("Correo o contraseña incorrectos.");
        }

        return usuario;
    }
}
