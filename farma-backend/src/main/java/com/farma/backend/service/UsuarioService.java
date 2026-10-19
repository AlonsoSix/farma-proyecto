package com.farma.backend.service;

import com.farma.backend.dto.LoginRequest;
import com.farma.backend.dto.RegistroRequest;
import com.farma.backend.dto.UsuarioDTO;
import com.farma.backend.dto.UsuarioRequest;
import com.farma.backend.model.Usuario;

import java.util.List;
import java.util.Optional;

public interface UsuarioService {
    List<UsuarioDTO> listarTodos();
    Optional<UsuarioDTO> obtenerPorId(Integer id);
    UsuarioDTO crearPorAdmin(UsuarioRequest request);
    UsuarioDTO actualizarPorAdmin(Integer id, UsuarioRequest request);
    void eliminarUsuario(Integer id);
    Usuario registrar(RegistroRequest request);
    Usuario login(LoginRequest request);
}