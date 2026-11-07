package com.farma.backend.exception;

/**
 * Excepción lanzada cuando la autenticación falla por correo o contraseña inválidos.
 */
public class CredencialesInvalidasException extends RuntimeException {

    public CredencialesInvalidasException(String message) {
        super(message);
    }
}
