package com.farma.backend.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/**
 * Configuración de Culqi. Las llaves NUNCA se escriben en el código ni se suben al repositorio:
 * se leen de variables de entorno o de application.properties (que está en .gitignore).
 *
 * Si no hay llaves, la pasarela trabaja en modo simulado y la tienda sigue funcionando.
 */
@Component
@ConfigurationProperties(prefix = "culqi")
public class CulqiProperties {

    private String publicKey = "";
    private String secretKey = "";
    private String apiUrl = "https://api.culqi.com/v2";
    private String modo;

    public boolean isConfigurado() {
        return publicKey != null && !publicKey.isBlank()
                && secretKey != null && !secretKey.isBlank();
    }

    /** sandbox / produccion, según el prefijo de la llave pública o configuración explícita. */
    public String getModo() {
        if (modo != null && !modo.isBlank()) {
            return modo;
        }
        return publicKey != null && publicKey.startsWith("pk_test_") ? "sandbox" : "produccion";
    }

    public void setModo(String modo) {
        this.modo = modo;
    }

    public String getPublicKey() { return publicKey; }
    public void setPublicKey(String publicKey) { this.publicKey = publicKey; }

    public String getSecretKey() { return secretKey; }
    public void setSecretKey(String secretKey) { this.secretKey = secretKey; }

    public String getApiUrl() { return apiUrl; }
    public void setApiUrl(String apiUrl) { this.apiUrl = apiUrl; }
}
