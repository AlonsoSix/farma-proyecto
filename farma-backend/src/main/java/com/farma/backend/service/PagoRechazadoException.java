package com.farma.backend.service;

/**
 * Error de negocio de la pasarela: tarjeta rechazada, Yape sin confirmar, falta de llaves, etc.
 * El controlador lo responde como HTTP 402 con {"error": "mensaje para el cliente"}.
 */
public class PagoRechazadoException extends RuntimeException {

    public PagoRechazadoException(String mensaje) {
        super(mensaje);
    }
}
