package com.farma.backend.config;

import com.farma.backend.service.EnviadorSmtp;
import com.farma.backend.service.ResolutorMx;
import jakarta.mail.Session;
import jakarta.mail.Transport;
import jakarta.mail.internet.InternetAddress;
import jakarta.mail.internet.MimeMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.mail.javamail.MimeMessageHelper;

import javax.naming.Context;
import javax.naming.NamingEnumeration;
import javax.naming.directory.Attribute;
import javax.naming.directory.Attributes;
import javax.naming.directory.DirContext;
import javax.naming.directory.InitialDirContext;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.Hashtable;
import java.util.List;
import java.util.Locale;
import java.util.Properties;

/**
 * Implementación real del envío: no necesita usuario, contraseña ni variables
 * de entorno. Consulta los registros MX del dominio del destinatario y entrega
 * el mensaje directamente por SMTP (puerto 25) al primer servidor que acepte.
 *
 * Si la red bloquea el puerto 25 o el proveedor rechaza el mensaje,
 * CorreoService devuelve un enlace mailto como respaldo.
 */
@Configuration
public class CorreoConfig {

    private static final Logger log = LoggerFactory.getLogger(CorreoConfig.class);

    /** Remitente fijo y público: no es un secreto, por eso va en el código. */
    private static final String REMITENTE = "no-reply@portusalud.com";
    private static final String NOMBRE_REMITENTE = "PorTuSalud";
    private static final String ASUNTO = "Confirmación de contacto - PorTuSalud";

    @Bean
    ResolutorMx resolutorMx() {
        return CorreoConfig::resolverMx;
    }

    @Bean
    EnviadorSmtp enviadorSmtp() {
        return CorreoConfig::enviarSmtp;
    }

    static List<String> resolverMx(String dominio) {
        List<RegistroMx> registros = new ArrayList<>();

        try {
            Hashtable<String, String> entorno = new Hashtable<>();
            entorno.put(Context.INITIAL_CONTEXT_FACTORY, "com.sun.jndi.dns.DnsContextFactory");
            DirContext contexto = new InitialDirContext(entorno);
            try {
                Attributes atributos = contexto.getAttributes(dominio, new String[]{"MX"});
                Attribute mx = atributos.get("MX");
                if (mx != null) {
                    NamingEnumeration<?> valores = mx.getAll();
                    while (valores.hasMore()) {
                        String valor = String.valueOf(valores.next()).trim();
                        String[] partes = valor.split("\\s+");
                        if (partes.length < 2) continue;

                        int prioridad;
                        try {
                            prioridad = Integer.parseInt(partes[0]);
                        } catch (NumberFormatException ex) {
                            prioridad = 65535;
                        }
                        String host = partes[partes.length - 1];
                        if (host.endsWith(".")) host = host.substring(0, host.length() - 1);
                        // Un MX válido es un FQDN; se ignoran respuestas de DNS
                        // interceptadas o incompletas (p. ej. "errdomain").
                        if (host.contains(".")) {
                            registros.add(new RegistroMx(prioridad, host.toLowerCase(Locale.ROOT)));
                        }
                    }
                }
            } finally {
                contexto.close();
            }
        } catch (Exception ex) {
            log.warn("No se pudieron resolver los MX de {}: {}", dominio, ex.getMessage());
        }

        // Sin MX (o sin DNS) se intenta directamente contra el dominio.
        if (registros.isEmpty()) return List.of(dominio);

        registros.sort(Comparator.comparingInt(r -> r.prioridad));
        List<String> servidores = new ArrayList<>();
        for (RegistroMx registro : registros) {
            if (!servidores.contains(registro.host())) servidores.add(registro.host());
        }
        return servidores;
    }

    static void enviarSmtp(String servidor, String destinatario, String cuerpoHtml) throws Exception {
        Properties propiedades = new Properties();
        propiedades.put("mail.smtp.host", servidor);
        propiedades.put("mail.smtp.port", "25");
        propiedades.put("mail.smtp.auth", "false");
        propiedades.put("mail.smtp.starttls.enable", "false");
        propiedades.put("mail.smtp.ssl.enable", "false");
        propiedades.put("mail.smtp.localhost", "portusalud.com");
        propiedades.put("mail.smtp.connectiontimeout", "4000");
        propiedades.put("mail.smtp.timeout", "4000");
        propiedades.put("mail.smtp.writetimeout", "4000");

        Session sesion = Session.getInstance(propiedades);
        MimeMessage mensaje = new MimeMessage(sesion);
        MimeMessageHelper helper = new MimeMessageHelper(mensaje, true, "UTF-8");
        helper.setFrom(new InternetAddress(REMITENTE, NOMBRE_REMITENTE));
        helper.setTo(destinatario);
        helper.setSubject(ASUNTO);
        helper.setText(cuerpoHtml, true);

        Transport.send(mensaje);
    }

    private record RegistroMx(int prioridad, String host) {
    }
}
