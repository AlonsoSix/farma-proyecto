package com.farma.backend.service;

import com.farma.backend.dto.CorreoRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * Envía el correo de confirmación de la página de Contacto.
 *
 * SRP: valida el destino, arma el mensaje y coordina resolución MX + entrega.
 * DIP: depende de las interfaces ResolutorMx y EnviadorSmtp, no de SMTP ni DNS
 * concretos, así que se puede probar sin red.
 *
 * No hay credenciales ni variables MAIL_*: se entrega directamente al servidor
 * del destinatario. Si ningún MX acepta, se devuelve un mailto de respaldo.
 */
@Service
public class CorreoService {

    private static final Logger log = LoggerFactory.getLogger(CorreoService.class);

    private static final String CORREO_REGEX = "^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$";
    private static final String ASUNTO = "Confirmación de contacto - PorTuSalud";
    private static final String CONFIRMACION = "¡Gracias por escribirnos! Te responderemos pronto.";

    private final ResolutorMx resolutorMx;
    private final EnviadorSmtp enviadorSmtp;

    public CorreoService(ResolutorMx resolutorMx, EnviadorSmtp enviadorSmtp) {
        this.resolutorMx = resolutorMx;
        this.enviadorSmtp = enviadorSmtp;
    }

    /**
     * Envía el correo de confirmación al destinatario indicado.
     *
     * @return mapa con modo (ENVIADO / MANUAL), mensaje para la interfaz y,
     *         cuando falla el envío directo, un enlace mailto de respaldo.
     */
    public Map<String, String> enviarConfirmacion(CorreoRequest request) {
        String correo = request == null || request.getCorreo() == null
                ? ""
                : request.getCorreo().trim();

        if (correo.length() > 150 || !correo.matches(CORREO_REGEX)) {
            throw new IllegalArgumentException("Ingresa un correo electrónico válido.");
        }

        String dominio = correo.substring(correo.lastIndexOf('@') + 1).toLowerCase(Locale.ROOT);

        List<String> servidores;
        try {
            servidores = resolutorMx.resolver(dominio);
        } catch (Exception ex) {
            log.warn("Fallo al resolver MX de {}: {}", dominio, ex.getMessage());
            servidores = List.of();
        }
        if (servidores == null || servidores.isEmpty()) servidores = List.of(dominio);

        for (String servidor : servidores) {
            try {
                enviadorSmtp.enviar(servidor, correo, cuerpoHtml());
                return Map.of(
                        "modo", "ENVIADO",
                        "mensaje", CONFIRMACION + " Te enviamos un correo de confirmación a " + correo + "."
                );
            } catch (Exception ex) {
                // Se prueba el siguiente MX; el detalle queda solo en el log.
                log.warn("No se pudo entregar a {} vía {}: {}", correo, servidor, ex.getMessage());
            }
        }

        // Respaldo: el navegador abre la app de correo con todo redactado.
        return Map.of(
                "modo", "MANUAL",
                "mensaje", CONFIRMACION
                        + " No pudimos enviarlo automáticamente; abrimos tu aplicación de correo para que termines el envío.",
                "mailto", construirMailto(correo)
        );
    }

    private String construirMailto(String correo) {
        String asunto = URLEncoder.encode(ASUNTO, StandardCharsets.UTF_8).replace("+", "%20");
        String cuerpo = URLEncoder.encode(cuerpoTexto(), StandardCharsets.UTF_8).replace("+", "%20");
        return "mailto:" + correo + "?subject=" + asunto + "&body=" + cuerpo;
    }

    /** Plantilla HTML fija: el usuario no controla el contenido del correo. */
    private String cuerpoHtml() {
        return """
                <!doctype html>
                <html lang="es">
                <head><meta charset="UTF-8"><title>Confirmación de contacto</title></head>
                <body style="margin:0;background:#f4f7fb;font-family:Arial,sans-serif;color:#233;">
                  <div style="max-width:560px;margin:24px auto;background:#fff;border-radius:16px;padding:32px;">
                    <h1 style="color:#0b72b3;font-size:22px;margin:0 0 12px;">¡Gracias por escribirnos! Te responderemos pronto.</h1>
                    <p style="font-size:15px;line-height:1.6;">
                      Hemos recibido tu mensaje desde la página de Contacto de <strong>PorTuSalud</strong>.
                    </p>
                    <p style="font-size:13px;color:#667;">
                      Si no fuiste tú quien envió este mensaje, puedes ignorar este correo.
                    </p>
                    <hr style="border:0;border-top:1px solid #e3e9f0;margin:24px 0;">
                    <p style="font-size:12px;color:#889;margin:0;">Boticas PorTuSalud · Villa El Salvador</p>
                  </div>
                </body>
                </html>
                """;
    }

    private String cuerpoTexto() {
        return "¡Gracias por escribirnos! Te responderemos pronto.\n\n"
                + "Hemos recibido tu mensaje desde la página de Contacto de PorTuSalud.\n\n"
                + "Boticas PorTuSalud · Villa El Salvador";
    }
}
