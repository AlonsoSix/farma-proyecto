package com.farma.backend.service;

import java.util.List;

/**
 * Resuelve los servidores SMTP (registros MX) de un dominio de correo.
 * Separado para poder sustituirlo en pruebas sin consultar DNS.
 */
@FunctionalInterface
public interface ResolutorMx {

    /**
     * @param dominio parte después de la @ del correo del destinatario.
     * @return servidores ordenados por prioridad; nunca null.
     */
    List<String> resolver(String dominio);
}
