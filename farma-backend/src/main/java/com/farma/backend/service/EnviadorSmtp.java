package com.farma.backend.service;

/**
 * Entrega un mensaje directamente al servidor SMTP indicado, sin autenticación.
 * Separado para poder simular el envío en pruebas sin abrir conexiones reales.
 */
@FunctionalInterface
public interface EnviadorSmtp {

    /**
     * @param servidor    host MX del destinatario.
     * @param destinatario correo completo al que se entrega.
     * @param cuerpoHtml   mensaje ya armado en HTML.
     * @throws Exception si el servidor rechaza la conexión o el mensaje.
     */
    void enviar(String servidor, String destinatario, String cuerpoHtml) throws Exception;
}
