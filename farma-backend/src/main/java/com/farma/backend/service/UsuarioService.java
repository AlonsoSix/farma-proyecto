package com.farma.backend.service;

import com.farma.backend.dto.LoginRequest;
import com.farma.backend.dto.RegistroRequest;
import com.farma.backend.dto.UsuarioDTO;
import com.farma.backend.dto.UsuarioRequest;
import com.farma.backend.model.Usuario;
import com.farma.backend.repository.UsuarioRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
public class UsuarioService {

    @Autowired
    private UsuarioRepository usuarioRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    public Usuario registrar(RegistroRequest request) {
        if (usuarioRepository.existsByCorreo(request.getCorreo())) {
            throw new RuntimeException("Ya existe una cuenta con ese correo.");
        }
        Usuario usuario = new Usuario();
        usuario.setNombre(request.getNombre());
        usuario.setApellido(request.getApellido());
        usuario.setCorreo(request.getCorreo());
        usuario.setContrasena(passwordEncoder.encode(request.getContrasena()));
        usuario.setTelefono(request.getTelefono());
        usuario.setRol("CLIENTE");
        usuario.setFechaRegistro(LocalDateTime.now());
        return usuarioRepository.save(usuario);
    }

    public Usuario login(LoginRequest request) {
        Usuario usuario = usuarioRepository.findByCorreo(request.getCorreo())
                .orElseThrow(() -> new RuntimeException("Correo o contraseña incorrectos."));

        if (!passwordEncoder.matches(request.getContrasena(), usuario.getContrasena())) {
            throw new RuntimeException("Correo o contraseña incorrectos.");
        }
        return usuario;
    }

    public List<UsuarioDTO> listarTodos() {
        return usuarioRepository.findAll().stream()
                .map(UsuarioDTO::fromEntity)
                .collect(Collectors.toList());
    }

    public Optional<UsuarioDTO> obtenerPorId(Integer id) {
        return usuarioRepository.findById(id).map(UsuarioDTO::fromEntity);
    }

    public UsuarioDTO crearPorAdmin(UsuarioRequest request) {
        if (request.getCorreo() == null || request.getCorreo().trim().isEmpty()) {
            throw new RuntimeException("El correo es obligatorio.");
        }
        if (usuarioRepository.existsByCorreo(request.getCorreo().trim())) {
            throw new RuntimeException("Ya existe un usuario con este correo.");
        }
        if (request.getContrasena() == null || request.getContrasena().trim().isEmpty()) {
            throw new RuntimeException("La contraseña es obligatoria.");
        }

        Usuario u = new Usuario();
        u.setNombre(request.getNombre() != null ? request.getNombre().trim() : "");
        u.setApellido(request.getApellido() != null ? request.getApellido().trim() : "");
        u.setCorreo(request.getCorreo().trim());
        u.setTelefono(request.getTelefono() != null ? request.getTelefono().trim() : "");
        u.setContrasena(passwordEncoder.encode(request.getContrasena().trim()));
        String rol = request.getRol() != null && !request.getRol().trim().isEmpty() ? request.getRol().trim().toUpperCase() : "CLIENTE";
        u.setRol(rol.equals("ADMIN") ? "ADMIN" : "CLIENTE");
        u.setFechaRegistro(LocalDateTime.now());

        Usuario guardado = usuarioRepository.save(u);
        return UsuarioDTO.fromEntity(guardado);
    }

    public UsuarioDTO actualizarPorAdmin(Integer id, UsuarioRequest request) {
        Usuario u = usuarioRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado con ID: " + id));

        if (request.getCorreo() != null && !request.getCorreo().trim().isEmpty()) {
            String nuevoCorreo = request.getCorreo().trim();
            if (!nuevoCorreo.equalsIgnoreCase(u.getCorreo()) && usuarioRepository.existsByCorreo(nuevoCorreo)) {
                throw new RuntimeException("El correo ya está en uso por otro usuario.");
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
            u.setRol(rol.equals("ADMIN") ? "ADMIN" : "CLIENTE");
        }
        if (request.getContrasena() != null && !request.getContrasena().trim().isEmpty()) {
            u.setContrasena(passwordEncoder.encode(request.getContrasena().trim()));
        }

        Usuario actualizado = usuarioRepository.save(u);
        return UsuarioDTO.fromEntity(actualizado);
    }

    public void eliminarUsuario(Integer id) {
        Usuario u = usuarioRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado con ID: " + id));
        usuarioRepository.delete(u);
    }
}