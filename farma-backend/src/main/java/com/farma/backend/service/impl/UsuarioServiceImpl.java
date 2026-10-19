package com.farma.backend.service.impl;

import com.farma.backend.dto.LoginRequest;
import com.farma.backend.dto.RegistroRequest;
import com.farma.backend.dto.UsuarioDTO;
import com.farma.backend.dto.UsuarioRequest;
import com.farma.backend.exception.BadRequestException;
import com.farma.backend.exception.DuplicateResourceException;
import com.farma.backend.exception.ResourceNotFoundException;
import com.farma.backend.model.Usuario;
import com.farma.backend.repository.UsuarioRepository;
import com.farma.backend.service.AuthService;
import com.farma.backend.service.UsuarioService;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
public class UsuarioServiceImpl implements UsuarioService {

    private final UsuarioRepository usuarioRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthService authService;

    public UsuarioServiceImpl(UsuarioRepository usuarioRepository, PasswordEncoder passwordEncoder, AuthService authService) {
        this.usuarioRepository = usuarioRepository;
        this.passwordEncoder = passwordEncoder;
        this.authService = authService;
    }

    @Override
    @Transactional(readOnly = true)
    public List<UsuarioDTO> listarTodos() {
        return usuarioRepository.findAll().stream()
                .map(UsuarioDTO::fromEntity)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<UsuarioDTO> obtenerPorId(Integer id) {
        return usuarioRepository.findById(id).map(UsuarioDTO::fromEntity);
    }

    @Override
    @Transactional
    public UsuarioDTO crearPorAdmin(UsuarioRequest request) {
        if (request.getCorreo() == null || request.getCorreo().trim().isEmpty()) {
            throw new BadRequestException("El correo es obligatorio.");
        }
        String correoLimpio = request.getCorreo().trim();
        if (usuarioRepository.existsByCorreo(correoLimpio)) {
            throw new DuplicateResourceException("Ya existe un usuario con este correo.");
        }
        if (request.getContrasena() == null || request.getContrasena().trim().isEmpty()) {
            throw new BadRequestException("La contraseña es obligatoria.");
        }

        Usuario u = new Usuario();
        u.setNombre(request.getNombre() != null ? request.getNombre().trim() : "");
        u.setApellido(request.getApellido() != null ? request.getApellido().trim() : "");
        u.setCorreo(correoLimpio);
        u.setTelefono(request.getTelefono() != null ? request.getTelefono().trim() : "");
        u.setContrasena(passwordEncoder.encode(request.getContrasena().trim()));

        String rol = (request.getRol() != null && !request.getRol().trim().isEmpty())
                ? request.getRol().trim().toUpperCase()
                : "CLIENTE";
        u.setRol("ADMIN".equals(rol) ? "ADMIN" : "CLIENTE");
        u.setFechaRegistro(LocalDateTime.now());

        Usuario guardado = usuarioRepository.save(u);
        return UsuarioDTO.fromEntity(guardado);
    }

    @Override
    @Transactional
    public UsuarioDTO actualizarPorAdmin(Integer id, UsuarioRequest request) {
        Usuario u = usuarioRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Usuario no encontrado con ID: " + id));

        if (request.getCorreo() != null && !request.getCorreo().trim().isEmpty()) {
            String nuevoCorreo = request.getCorreo().trim();
            if (!nuevoCorreo.equalsIgnoreCase(u.getCorreo()) && usuarioRepository.existsByCorreo(nuevoCorreo)) {
                throw new DuplicateResourceException("El correo ya está en uso por otro usuario.");
            }
            u.setCorreo(nuevoCorreo);
        }

        if (request.getNombre() != null) {
            u.setNombre(request.getNombre().trim());
        }
        if (request.getApellido() != null) {
            u.setApellido(request.getApellido().trim());
        }
        if (request.getTelefono() != null) {
            u.setTelefono(request.getTelefono().trim());
        }
        if (request.getRol() != null && !request.getRol().trim().isEmpty()) {
            String rol = request.getRol().trim().toUpperCase();
            u.setRol("ADMIN".equals(rol) ? "ADMIN" : "CLIENTE");
        }
        if (request.getContrasena() != null && !request.getContrasena().trim().isEmpty()) {
            u.setContrasena(passwordEncoder.encode(request.getContrasena().trim()));
        }

        Usuario actualizado = usuarioRepository.save(u);
        return UsuarioDTO.fromEntity(actualizado);
    }

    @Override
    @Transactional
    public void eliminarUsuario(Integer id) {
        Usuario u = usuarioRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Usuario no encontrado con ID: " + id));
        usuarioRepository.delete(u);
    }

    @Override
    public Usuario registrar(RegistroRequest request) {
        return authService.registrar(request);
    }

    @Override
    public Usuario login(LoginRequest request) {
        return authService.login(request);
    }
}
