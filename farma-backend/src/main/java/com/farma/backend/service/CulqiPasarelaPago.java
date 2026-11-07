package com.farma.backend.service;

import com.farma.backend.config.CulqiProperties;
import com.farma.backend.dto.ResultadoPago;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

/**
 * Pasarela real de Culqi (API v2 /charges) con modo simulado de respaldo.
 *
 * Flujo: Culqi Checkout v4 tokeniza la tarjeta o Yape en el navegador y entrega un token.
 * El frontend envía ese token al backend; aquí se crea el cargo usando la llave secreta,
 * que nunca sale del servidor.
 */
@Service
public class CulqiPasarelaPago implements PasarelaPago {

    private static final BigDecimal LIMITE_YAPE = new BigDecimal("2000.00");
    private static final Set<String> RESULTADOS_APROBADOS = Set.of("venta_exitosa", "autorizacion_exitosa");

    private final CulqiProperties config;
    private final ObjectMapper json = new ObjectMapper();
    private final HttpClient http = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(10))
            .build();

    @Autowired
    public CulqiPasarelaPago(CulqiProperties config) {
        this.config = config;
    }

    @Override
    public ResultadoPago cobrar(String metodoPago, String tokenPago, BigDecimal total,
                                String correo, String nombreCliente, String dniCliente) {
        String metodo = metodoPago == null ? "" : metodoPago.trim().toUpperCase();

        if ("EFECTIVO".equals(metodo)) {
            return new ResultadoPago("PENDIENTE", "EFECTIVO", null, null, null);
        }
        if (!"TARJETA".equals(metodo) && !"YAPE".equals(metodo)) {
            throw new PagoRechazadoException("Elige un método de pago válido: efectivo, tarjeta o Yape.");
        }
        if (total == null || total.signum() <= 0) {
            throw new PagoRechazadoException("El monto de la compra no es válido.");
        }
        if ("YAPE".equals(metodo) && total.compareTo(LIMITE_YAPE) > 0) {
            throw new PagoRechazadoException("Yape permite pagos de hasta S/ 2,000.00. Para este monto elige tarjeta o efectivo.");
        }
        if (correo == null || !correo.trim().matches("[^@\\s]+@[^@\\s]+\\.[^@\\s]+")) {
            throw new PagoRechazadoException("Para pagar con tarjeta o Yape necesitas ingresar un correo válido.");
        }

        // Sin llaves configuradas no se puede cobrar de verdad: se aprueba en modo prueba
        // para que el proyecto siga funcionando en cualquier computadora.
        if (!config.isConfigurado()) {
            return new ResultadoPago("APROBADO", "SIMULADO", "SIM-" + referenciaSimulada(), null, null);
        }

        String token = tokenPago == null ? "" : tokenPago.trim();
        if (token.isEmpty()) {
            throw new PagoRechazadoException("La pasarela no devolvió el token de pago. Intenta nuevamente.");
        }
        if ("TARJETA".equals(metodo) && !token.startsWith("tkn_") && !token.startsWith("crd_")) {
            throw new PagoRechazadoException("El token de tarjeta no es válido. Intenta nuevamente.");
        }
        if ("YAPE".equals(metodo) && !token.startsWith("ype_")) {
            throw new PagoRechazadoException("El token de Yape no es válido. Intenta nuevamente.");
        }

        Map<String, Object> cuerpo = new LinkedHashMap<>();
        cuerpo.put("amount", total.multiply(BigDecimal.valueOf(100)).setScale(0, RoundingMode.HALF_UP).intValueExact());
        cuerpo.put("currency_code", "PEN");
        cuerpo.put("email", correo.trim());
        cuerpo.put("source_id", token);
        cuerpo.put("description", "Compra en Boticas Por tu Salud");

        Map<String, String> metadata = new LinkedHashMap<>();
        metadata.put("cliente", recortar(nombreCliente, 100));
        metadata.put("dni", recortar(dniCliente, 8));
        cuerpo.put("metadata", metadata);

        HttpRequest request;
        try {
            request = HttpRequest.newBuilder()
                    .uri(URI.create(config.getApiUrl().replaceAll("/+$", "") + "/charges"))
                    .timeout(Duration.ofSeconds(30))
                    .header("Authorization", "Bearer " + config.getSecretKey())
                    .header("Content-Type", "application/json")
                    .header("Accept", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(json.writeValueAsString(cuerpo)))
                    .build();
        } catch (Exception e) {
            throw new PagoRechazadoException("No se pudo preparar el cobro con Culqi. Intenta nuevamente.");
        }

        HttpResponse<String> respuesta;
        try {
            respuesta = http.send(request, HttpResponse.BodyHandlers.ofString());
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new PagoRechazadoException("Se interrumpió la conexión con Culqi. Intenta nuevamente.");
        } catch (Exception e) {
            throw new PagoRechazadoException("No se pudo conectar con Culqi. Revisa tu conexión e intenta nuevamente.");
        }

        JsonNode datos;
        try {
            datos = respuesta.body() == null || respuesta.body().isBlank()
                    ? json.createObjectNode()
                    : json.readTree(respuesta.body());
        } catch (Exception e) {
            datos = json.createObjectNode();
        }

        int estadoHttp = respuesta.statusCode();
        if (estadoHttp < 200 || estadoHttp >= 300) {
            throw new PagoRechazadoException(mensajeDeError(datos, estadoHttp));
        }

        String resultado = datos.path("outcome").path("type").asText("");
        if (!RESULTADOS_APROBADOS.contains(resultado)) {
            String mensaje = datos.path("outcome").path("user_message").asText("");
            if (mensaje.isBlank()) {
                mensaje = "El pago fue rechazado por Culqi. Verifica los datos e intenta con otra tarjeta.";
            }
            throw new PagoRechazadoException(mensaje);
        }

        String referencia = datos.path("id").asText("");
        if (referencia.isBlank()) {
            throw new PagoRechazadoException("Culqi aprobó el pago pero no devolvió una referencia. Contacta a la tienda.");
        }

        JsonNode tarjeta = datos.path("source").path("card");
        return new ResultadoPago(
                "APROBADO",
                "CULQI",
                referencia,
                textoONull(tarjeta.path("brand").asText("")),
                textoONull(tarjeta.path("last4").asText(""))
        );
    }

    @Override
    public void reembolsar(String referencia) {
        if (!config.isConfigurado() || referencia == null || !referencia.startsWith("chr_")) return;
        try {
            Map<String, Object> cuerpo = new LinkedHashMap<>();
            cuerpo.put("charge_id", referencia);
            cuerpo.put("reason", "Reembolso: no se pudo registrar la venta");

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(config.getApiUrl().replaceAll("/+$", "") + "/refunds"))
                    .timeout(Duration.ofSeconds(15))
                    .header("Authorization", "Bearer " + config.getSecretKey())
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(json.writeValueAsString(cuerpo)))
                    .build();
            http.send(request, HttpResponse.BodyHandlers.discarding());
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        } catch (Exception e) {
            // Reembolso de mejor esfuerzo: se registra en el log del servidor, no se rompe la respuesta.
            System.err.println("No se pudo reembolsar el cargo " + referencia + ": " + e.getMessage());
        }
    }

    private String mensajeDeError(JsonNode datos, int estadoHttp) {
        String usuario = datos.path("user_message").asText("");
        if (!usuario.isBlank()) return usuario;
        String comercio = datos.path("merchant_message").asText("");
        if (!comercio.isBlank()) return comercio;
        if (estadoHttp == 401 || estadoHttp == 403) {
            return "Las llaves de Culqi no son válidas. Revisa la configuración del servidor.";
        }
        return "Culqi rechazó el pago (HTTP " + estadoHttp + "). Intenta nuevamente.";
    }

    private String referenciaSimulada() {
        return UUID.randomUUID().toString().replace("-", "").substring(0, 10).toUpperCase();
    }

    private String recortar(String texto, int maximo) {
        if (texto == null) return "";
        String limpio = texto.trim();
        return limpio.length() <= maximo ? limpio : limpio.substring(0, maximo);
    }

    private String textoONull(String texto) {
        return texto == null || texto.isBlank() ? null : texto;
    }
}
