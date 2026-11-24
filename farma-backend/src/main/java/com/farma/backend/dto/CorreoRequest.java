package com.farma.backend.dto;

/**
 * Datos que envía la página de Contacto para recibir un correo de confirmación.
 * Por seguridad solo se acepta la dirección de destino; el asunto y el mensaje
 * los define el servidor.
 */
public class CorreoRequest {

    private String correo;

    public String getCorreo() { return correo; }
    public void setCorreo(String correo) { this.correo = correo; }
}
