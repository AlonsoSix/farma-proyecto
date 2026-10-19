package com.farma.backend.service;

import com.farma.backend.dto.LoginRequest;
import com.farma.backend.dto.RegistroRequest;
import com.farma.backend.model.Usuario;

public interface AuthService {
    Usuario registrar(RegistroRequest request);
    Usuario login(LoginRequest request);
}
